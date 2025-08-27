// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@/generated/prisma";
import { Resend } from "resend";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-07-30.basil" });
const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    const payload = await req.text();
    event = stripe.webhooks.constructEvent(payload, sig!, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (bookingId) {
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "PAID",
            stripePaymentIntentId: session.payment_intent?.toString() ?? null,
          },
          include: {
            business: {
              include: {
                owner: { select: { email: true, name: true } }, // 👈 fetch owner relation
              },
            },
            service: true,
          },
        });

        const whenDate = booking.startsAt.toLocaleDateString("en-GB");
        const whenTime = booking.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

        // ✅ CUSTOMER EMAIL
        await resend.emails.send({
          from: "Reservez <onboarding@resend.dev>",
          to: booking.customerEmail,
          subject: `Booking confirmed with ${booking.business.name}`,
          html: `
            <h2>✅ Your booking is confirmed</h2>
            <p>Hi ${booking.customerName},</p>
            <p>Your booking details:</p>
            <ul>
              <li><strong>Business:</strong> ${booking.business.name}</li>
              <li><strong>Service:</strong> ${booking.service.name}</li>
              <li><strong>Date:</strong> ${whenDate}</li>
              <li><strong>Time:</strong> ${whenTime}</li>
            </ul>
          `,
        });
        // ✅ OWNER EMAIL
        await resend.emails.send({
          from: "Reservez <onboarding@resend.dev>",
          to: booking.business.owner?.email ?? "default@example.com",
          subject: `New booking for ${booking.business.name}`,
          html: `
            <h2>📅 New booking received</h2>
            <p><strong>Customer:</strong> ${booking.customerName} (${booking.customerEmail})</p>
            <p><strong>Service:</strong> ${booking.service.name}</p>
            <p><strong>Date:</strong> ${whenDate} at ${whenTime}</p>
          `,
        });
      }
    }


    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
