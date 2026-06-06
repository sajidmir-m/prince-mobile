# Prince Mobile Store ERP

**Prince Mobile Store** · 9796639516 · princemobilestore786@gmail.com

Production-grade mobile store billing, inventory, and **IMEI lifecycle tracking** system built with Next.js, TypeScript, Tailwind CSS, Shadcn UI, and Supabase.

## Features

- **Role-based access** — Admin (full access) and Staff (sales, inventory view, invoices)
- **New mobile inventory** — IMEI 1/2, specs, purchase bill upload, status tracking
- **Second-hand module** — Seller info, condition, document uploads (ID, agreement, bills)
- **Accessories inventory** — SKU, quantity, auto stock decrease on sale
- **Sales & billing** — Search by IMEI/model/SKU, PDF invoice generation
- **IMEI Tracker** — Complete purchase → sale history with documents
- **Customers & suppliers** — Purchase history, soft delete
- **Purchases, reports, audit trail** — Excel export, daily/weekly/monthly/yearly
- **Global search** — IMEI, customer, invoice, supplier
- **QR codes** — Auto-generated for IMEI and SKU

## Quick Start

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_buckets.sql`
   - `supabase/migrations/003_store_contact.sql` (if needed)
   - **`supabase/migrations/004_fix_auth_user_trigger.sql`** — required if user creation fails
3. Enable Email auth in Authentication → Providers
4. Create your first admin user in Authentication → Users, then set role in SQL:

**If you see "Database error creating new user"** — run `004_fix_auth_user_trigger.sql` in the SQL Editor, then try again.

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
  app/
    dashboard/          # Protected ERP routes
    login/              # Auth
  components/
    inventory/          # Mobile & second-hand forms
    sales/              # POS / checkout
    imei/               # IMEI lifecycle tracker
    layout/             # Sidebar & header
  lib/
    supabase/           # Client, server, middleware
    pdf/                # Invoice PDF generator
    imei.ts             # IMEI history API
supabase/migrations/    # PostgreSQL schema + RLS
```

## Default Categories

Mobile Phones, Second-Hand, Earphones, Chargers, Smart Watches, Power Banks, Covers, Screen Protectors, Bluetooth Speakers, Accessories, Other Products — plus unlimited custom categories.

## Future: Repair Module

Schema-ready extension for device repair tracking (received, status, technician notes, delivery).

## Tech Stack

| Layer        | Technology        |
|-------------|-------------------|
| Frontend    | Next.js 15+, TS, Tailwind, Shadcn |
| Backend     | Supabase          |
| Database    | PostgreSQL        |
| Auth        | Supabase Auth     |
| Storage     | Supabase Storage  |
| PDF         | jsPDF             |
| QR          | react-qr-code     |
| Reports     | xlsx              |
