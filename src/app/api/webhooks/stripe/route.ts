export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { PrismaClient } from "@/generated/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const prisma = new PrismaClient();

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text(); // IMPORTANT: raw body, not JSON

  try {
    const event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        const paymentIntentId = session.payment_intent?.toString() ?? null;

        if (bookingId) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: "PAID",
              stripePaymentIntentId: paymentIntentId,
            },
          });
        }
        break;
      default:
        console.log("ℹ️ Unhandled event:", event.type);
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}