// src/app/confirmation/page.tsx
import { PrismaClient, BookingStatus } from "@/generated/prisma";
import Link from "next/link";

const prisma = new PrismaClient();

// 👇 note: searchParams is a Promise in newer Next versions
type Props = { searchParams: Promise<{ status?: string; bid?: string }> };

function formatInBrussels(d: Date) {
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(d),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d),
  };
}

export default async function ConfirmationPage({ searchParams }: Props) {
  // ✅ await searchParams before using it
  const { status, bid } = await searchParams;

  if (!bid) {
    return <div className="p-6">❌ Missing booking ID.</div>;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bid },
    include: { service: true, business: true },
  });

  if (!booking) {
    return <div className="p-6">❌ Booking not found.</div>;
  }

  const { date, time } = formatInBrussels(booking.startsAt);
  const isPaid = booking.status === BookingStatus.PAID;

  if (status === "success") {
    return (
      <div className="max-w-lg mx-auto p-8 space-y-6 text-center">
        {isPaid ? (
          <>
            <h1 className="text-2xl font-bold text-green-700">✅ Booking Confirmed</h1>
            <p>Thank you {booking.customerName}, your payment has been received.</p>
            <div className="border rounded p-4 bg-black-50 text-left">
              <p><strong>Booking ID:</strong> {booking.id}</p>
              <p><strong>Business:</strong> {booking.business.name}</p>
              <p><strong>Service:</strong> {booking.service.name}</p>
              <p><strong>Date:</strong> {date}</p>
              <p><strong>Time:</strong> {time}</p>
            </div>
            <div className="text-sm text-gray-500">A confirmation email will arrive shortly.</div>
            <Link href={`/b/${booking.business.slug}`} className="inline-block mt-4 px-4 py-2 rounded bg-black text-white">
              Back to {booking.business.name}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-blue-700">⏳ Processing Payment</h1>
            <p>We’re finalizing your booking. This usually takes a few seconds.</p>
            <div className="border rounded p-4 bg-blue-50 text-left">
              <p><strong>Booking ID:</strong> {booking.id}</p>
              <p><strong>Business:</strong> {booking.business.name}</p>
              <p><strong>Service:</strong> {booking.service.name}</p>
              <p><strong>Date:</strong> {date}</p>
              <p><strong>Time:</strong> {time}</p>
            </div>
            <Link href={`/b/${booking.business.slug}`} className="inline-block mt-4 px-4 py-2 rounded bg-black text-white">
              Back to {booking.business.name}
            </Link>
          </>
        )}
      </div>
    );
  }

  // Cancelled / fallback
  return (
    <div className="max-w-lg mx-auto p-8 space-y-6 text-center">
      <h1 className="text-2xl font-bold text-red-700">❌ Payment Cancelled</h1>
      <p>No payment was processed. Your booking remains unconfirmed.</p>
      <div className="border rounded p-4 bg-gray-50 text-left">
        <p><strong>Booking ID:</strong> {booking.id}</p>
        <p><strong>Business:</strong> {booking.business.name}</p>
        <p><strong>Service:</strong> {booking.service.name}</p>
        <p><strong>Date:</strong> {date}</p>
        <p><strong>Time:</strong> {time}</p>
      </div>
      <Link href={`/b/${booking.business.slug}`} className="inline-block mt-4 px-4 py-2 rounded bg-black text-white">
        Try Again
      </Link>
    </div>
  );
}
