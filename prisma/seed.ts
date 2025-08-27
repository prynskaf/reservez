import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
  // 1) Owner (use the sandbox-approved email)
  const owner = await prisma.user.upsert({
    where: { email: "prynskaf.12@gmail.com" },
    update: {},
    create: {
      email: "prynskaf.12@gmail.com", // ✅ sandbox-approved email
      name: "Barber Jamal",
      role: "OWNER",
    },
  });

  // 2) Business
  const business = await prisma.business.upsert({
    where: { slug: "barber-jamal" },
    update: {
      ownerEmail: owner.email,
    },
    create: {
      name: "Barber Jamal",
      slug: "barber-jamal",
      locale: "en",
      currency: "EUR",
      ownerId: owner.id,
      ownerEmail: owner.email, // ✅ matches sandbox email
    },
  });

  // 3) Services
  const haircut = await prisma.service.upsert({
    where: { id: "seed-haircut" },
    update: {},
    create: {
      id: "seed-haircut",
      name: "Haircut",
      duration: 30,
      priceCents: 2500,
      businessId: business.id,
    },
  });
  console.log("Seeded service:", haircut.name);

  await prisma.service.upsert({
    where: { id: "seed-beard" },
    update: {},
    create: {
      id: "seed-beard",
      name: "Beard Trim",
      duration: 20,
      priceCents: 1500,
      businessId: business.id,
    },
  });

  await prisma.service.upsert({
    where: { id: "seed-combo" },
    update: {},
    create: {
      id: "seed-combo",
      name: "Haircut + Beard Combo",
      duration: 45,
      priceCents: 3500,
      businessId: business.id,
    },
  });

  // 4) Simple weekly schedule (Mon–Sat 09:00–18:00, Sun closed)
  const days = [0, 1, 2, 3, 4, 5, 6]; // Sun..Sat
  for (const d of days) {
    await prisma.schedule.upsert({
      where: { id: `seed-schedule-${d}-${business.id}` },
      update: {},
      create: {
        id: `seed-schedule-${d}-${business.id}`,
        businessId: business.id,
        dayOfWeek: d,
        isClosed: d === 0, // Sunday closed
        openTime: d === 0 ? null : "09:00",
        closeTime: d === 0 ? null : "18:00",
      },
    });
  }

  console.log("✅ Seeded: owner, business, services, schedule");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
