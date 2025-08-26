import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-07-30.basil" });

export async function POST(req: Request) {
  try {
    const { businessSlug, serviceId, customerName, customerEmail, startsAt } = await req.json();

    if (!businessSlug || !serviceId || !customerName || !customerEmail || !startsAt) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Load business + service
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.businessId !== business.id) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const starts = new Date(startsAt);
    const ends = new Date(starts.getTime() + service.duration * 60 * 1000);

    // Create booking draft (PENDING)
    const booking = await prisma.booking.create({
      data: {
        customerName,
        customerEmail,
        startsAt: starts,
        endsAt: ends,
        status: "PENDING",
        serviceId: service.id,
        businessId: business.id,
      },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/b/${business.slug}?status=success&bid=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/b/${business.slug}?status=cancelled&bid=${booking.id}`,
      line_items: [
        {
          price_data: {
            currency: business.currency.toLowerCase(), // "eur"
            unit_amount: service.priceCents,           // in cents
            product_data: {
              name: service.name,
              description: `${business.name} — ${service.duration} min`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      metadata: {
        bookingId: booking.id,
        businessId: business.id,
        serviceId: service.id,
      },
    });

    // Store session id on booking
    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
