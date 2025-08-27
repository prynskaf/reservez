// src/app/b/[slug]/page.tsx
import { PrismaClient } from "@/generated/prisma";
import ServiceBooking from "./service-booking";

const prisma = new PrismaClient();

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
};

function Banner({ status }: { status?: string }) {
  if (status === "success") {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 text-green-800 px-4 py-3">
        ✅ Payment received. Your booking is confirmed.
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3">
        ❌ Payment cancelled. You can try another slot or method.
      </div>
    );
  }
  return null;
}

export default async function BookingPage({ params, searchParams }: Props) {
  // ✅ Await the dynamic APIs
  const { slug } = await params;
  const { status } = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: { services: { orderBy: { name: "asc" } } },
  });

  if (!business) return <div className="p-6">Business not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{business.name}</h1>
        <p className="text-sm text-gray-500">
          Booking page – {business.locale.toUpperCase()}
        </p>
      </header>

      <Banner status={status} />

      <ServiceBooking
        businessSlug={business.slug}
        currency={business.currency}
        services={business.services.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          priceCents: s.priceCents,
        }))}
      />
    </div>
  );
}
