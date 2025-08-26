import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

function toDateAtTime(dateStr: string, timeStr: string) {
  const [y,m,d] = dateStr.split("-").map(Number);
  const [hh,mm] = timeStr.split(":").map(Number);
  return new Date(y, m-1, d, hh, mm, 0, 0);
}

export async function POST(req: Request) {
  try {
    const { businessSlug, serviceId, date } = await req.json();
    if (!businessSlug || !serviceId || !date) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { slug: businessSlug }});
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const service = await prisma.service.findUnique({ where: { id: serviceId }});
    if (!service || service.businessId !== business.id) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const day = new Date(date); // YYYY-MM-DD
    const dayOfWeek = day.getDay(); // 0..6
    const sched = await prisma.schedule.findFirst({
      where: { businessId: business.id, dayOfWeek },
    });

    if (!sched || sched.isClosed || !sched.openTime || !sched.closeTime) {
      return NextResponse.json({ slots: [] });
    }

    const open  = toDateAtTime(date, sched.openTime);
    const close = toDateAtTime(date, sched.closeTime);

    const dayStart = new Date(open);  dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(open);  dayEnd.setHours(23,59,59,999);

    const bookings = await prisma.booking.findMany({
      where: {
        businessId: business.id,
        status: { in: ["PENDING","PAID"] },
        startsAt: { gte: dayStart, lte: dayEnd },
      },
      select: { startsAt: true, endsAt: true },
    });

    const durationMs = service.duration * 60 * 1000;
    const stepMs = 5 * 60 * 1000; // 5-min granularity
    const slots: string[] = [];

    for (let t = open.getTime(); t + durationMs <= close.getTime(); t += stepMs) {
      const s = new Date(t);
      const e = new Date(t + durationMs);
      const overlap = bookings.some(b => s < b.endsAt && e > b.startsAt);
      if (!overlap) slots.push(s.toISOString());
    }

    return NextResponse.json({ slots });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Availability failed" }, { status: 500 });
  }
}
