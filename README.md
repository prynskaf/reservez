# Reservez

Reservez is a SaaS booking platform built with **Next.js 14 (App Router)**, **TypeScript**, **Prisma**, and **Stripe**.  
It allows business owners (barbers, tutors, nail techs, etc.) to accept bookings online, manage schedules, and get paid instantly.

---

## 🚀 Features (MVP)

- Owner dashboard (manage services, schedules, bookings)
- Public booking pages at `/b/[slug]`
- Service selection + calendar-based availability
- Secure payments via Stripe Checkout
- Automatic status updates via Stripe webhooks
- PostgreSQL database via Prisma ORM
- Tailwind CSS for UI styling

---

## 🛠️ Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router, Server Components)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL (Supabase/Neon/local)
- [Stripe](https://stripe.com/) (Checkout + Webhooks)
- [NextAuth](https://next-auth.js.org/) (owner authentication, WIP)

---

## 📂 Project Structure

src/app/
├─ api/
│ ├─ availability/route.ts # Generate free slots from schedule + bookings
│ ├─ checkout/route.ts # Create Stripe Checkout sessions
│ └─ webhooks/stripe/route.ts# Handle Stripe webhook events
│
├─ b/[slug]/page.tsx # Public booking page for each business
│ └─ service-booking.tsx # Client component (select service, slot, pay)
│
└─ dashboard/ # Owner dashboard (WIP)

yaml
Copy
Edit


## ⚙️ Setup

Clone & Install
git clone https://github.com/yourname/reservez.git
cd reservez
npm install
2. Environment Variables
Copy .env.example to .env and fill with your values:


# Database
DATABASE_URL=postgresql://user:password@localhost:5432/reservez

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
3. Database Setup

npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio  # optional: view tables
4. Run Dev Server

npm run dev
Visit: http://localhost:3000



🔔 Stripe Webhooks (Dev)
Install Stripe CLI:
curl -fsSL https://cli.stripe.com/install.sh | sudo bash
stripe login
Forward webhooks to your local dev server:
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
Copy the whsec_xxx secret into .env.


✅ Current Flow
Owner signs up (dashboard WIP).
Public page /b/barber-jamal displays services.
Customer selects service + date + time slot.
API generates availability from Schedule + existing Bookings.
Checkout session is created → Stripe Checkout.
On payment success, Stripe webhook updates booking → PAID.

📌 Roadmap
 Owner authentication (NextAuth)
 Dashboard CRUD for services, schedule, bookings
 Email notifications (Resend / SendGrid)
 Calendar sync (Google/Outlook)
 Multi-language booking pages (EN/FR/NL)
 Analytics dashboard for owners

🧑‍💻 Author
Prince Kyei (@prynskaf)
Built with ❤️ using Next.js & Stripe.

