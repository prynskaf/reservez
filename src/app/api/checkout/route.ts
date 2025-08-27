// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// Use a stable Stripe API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-07-30.basil" });

export async function POST(req: Request) {
  try {
    const {
      businessSlug,
      serviceId,
      customerName,
      customerEmail,
      startsAt,
    } = await req.json();

    if (!businessSlug || !serviceId || !customerName || !customerEmail || !startsAt) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Server misconfigured: NEXT_PUBLIC_BASE_URL is missing" },
        { status: 500 }
      );
    }

    // Load Business + Service
    const business = await prisma.business.findUnique({ where: { slug: businessSlug } });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.businessId !== business.id) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Compute slot window
    const starts = new Date(startsAt);
    const ends = new Date(starts.getTime() + service.duration * 60 * 1000);

    // DOUBLE-BOOKING GUARD
    const overlap = await prisma.booking.findFirst({
      where: {
        businessId: business.id,
        status: { in: ["PENDING", "PAID"] },
        startsAt: { lt: ends },
        endsAt:   { gt: starts },
      },
      select: { id: true },
    });
    if (overlap) {
      return NextResponse.json(
        { error: "This slot was just taken. Please pick another time." },
        { status: 409 }
      );
    }

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

    // Redirect to a dedicated confirmation page after Stripe
    const successUrl = `${baseUrl}/confirmation?status=success&bid=${booking.id}`;
    const cancelUrl  = `${baseUrl}/confirmation?status=cancelled&bid=${booking.id}`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: business.currency.toLowerCase(), // "eur"
            unit_amount: service.priceCents,           // cents
            product_data: {
              name: service.name,
              description: `${business.name} — ${service.duration} min`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id,
        businessId: business.id,
        serviceId: service.id,
        startsAtISO: starts.toISOString(),
      },
    });

    // Store session id
    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
