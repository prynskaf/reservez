// app/b/[slug]/page.tsx
import { PrismaClient } from "@/generated/prisma";
import ServiceBooking from "./service-booking";


const prisma = new PrismaClient();

type Props =  { params: { slug: string | string[] } };

export default async function BookingPage({ params }: Props) {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
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

      <ServiceBooking
        businessSlug={business.slug}
        currency={business.currency}
        services={business.services.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          priceCents: s.priceCents,
        }))}
      />
    </div>
  );
}
