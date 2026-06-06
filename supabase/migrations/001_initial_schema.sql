-- Prince Mobile Store ERP - Initial Schema (IDEMPOTENT — safe to re-run)
-- Run in Supabase SQL Editor. If you already ran an older 001, just run this whole file again.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums (skip if already exist)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE device_status AS ENUM ('in_stock', 'reserved', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE second_hand_status AS ENUM ('purchased', 'in_stock', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Store settings
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL DEFAULT 'Prince Mobile Store',
  store_address TEXT,
  store_phone TEXT,
  store_email TEXT,
  gst_number TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO store_settings (store_name, store_phone, store_email)
SELECT 'Prince Mobile Store', '9796639516', 'princemobilestore786@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM store_settings LIMIT 1);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (name, is_system) VALUES
  ('Mobile Phones', TRUE),
  ('Second-Hand Mobile Phones', TRUE),
  ('Earphones', TRUE),
  ('Chargers', TRUE),
  ('Smart Watches', TRUE),
  ('Power Banks', TRUE),
  ('Covers & Cases', TRUE),
  ('Screen Protectors', TRUE),
  ('Bluetooth Speakers', TRUE),
  ('Accessories', TRUE),
  ('Other Products', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  email TEXT,
  gst_number TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Accessory products
CREATE TABLE IF NOT EXISTS accessory_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  sku TEXT UNIQUE,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  supplier_id UUID REFERENCES suppliers(id),
  stock_status stock_status DEFAULT 'in_stock',
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accessory_sku ON accessory_products(sku);

-- Mobile devices
CREATE TABLE IF NOT EXISTS mobile_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  ram TEXT,
  storage TEXT,
  imei1 TEXT NOT NULL,
  imei2 TEXT,
  serial_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchase_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  supplier_invoice_number TEXT,
  purchase_date DATE NOT NULL,
  warranty_info TEXT,
  purchase_bill_url TEXT,
  notes TEXT,
  status device_status NOT NULL DEFAULT 'in_stock',
  qr_code_data TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_imei1 UNIQUE (imei1)
);

CREATE INDEX IF NOT EXISTS idx_mobile_imei1 ON mobile_devices(imei1);
CREATE INDEX IF NOT EXISTS idx_mobile_imei2 ON mobile_devices(imei2);
CREATE INDEX IF NOT EXISTS idx_mobile_model ON mobile_devices(model);
CREATE INDEX IF NOT EXISTS idx_mobile_status ON mobile_devices(status);

-- Second-hand devices
CREATE TABLE IF NOT EXISTS second_hand_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  ram TEXT,
  storage TEXT,
  imei1 TEXT NOT NULL,
  imei2 TEXT,
  condition TEXT,
  accessories_included TEXT,
  battery_health TEXT,
  remarks TEXT,
  seller_name TEXT NOT NULL,
  seller_phone TEXT,
  seller_id_number TEXT,
  seller_address TEXT,
  purchase_date DATE NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2),
  status second_hand_status NOT NULL DEFAULT 'purchased',
  qr_code_data TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_sh_imei1 UNIQUE (imei1)
);

CREATE INDEX IF NOT EXISTS idx_sh_imei1 ON second_hand_devices(imei1);

CREATE TABLE IF NOT EXISTS second_hand_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES second_hand_devices(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  seller_name TEXT,
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status payment_status DEFAULT 'pending',
  bill_url TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  product_id UUID,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  product_id UUID,
  description TEXT NOT NULL,
  imei TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  warranty_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT,
  pdf_url TEXT,
  barcode_data TEXT,
  qr_code_data TEXT,
  emailed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Auth trigger: auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val public.user_role := 'staff';
  user_email TEXT;
  user_name TEXT;
BEGIN
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'email'), ''),
    NEW.id::text || '@users.local'
  );
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );
  IF NEW.raw_user_meta_data->>'role' IN ('admin', 'staff') THEN
    user_role_val := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, user_email, user_name, user_role_val)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

-- Updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS accessory_products_updated_at ON accessory_products;
CREATE TRIGGER accessory_products_updated_at BEFORE UPDATE ON accessory_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS mobile_devices_updated_at ON mobile_devices;
CREATE TRIGGER mobile_devices_updated_at BEFORE UPDATE ON mobile_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS second_hand_devices_updated_at ON second_hand_devices;
CREATE TRIGGER second_hand_devices_updated_at BEFORE UPDATE ON second_hand_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS purchases_updated_at ON purchases;
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS sales_updated_at ON sales;
CREATE TRIGGER sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE second_hand_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE second_hand_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies (drop + recreate = safe to re-run)
DROP POLICY IF EXISTS "Authenticated read profiles" ON profiles;
CREATE POLICY "Authenticated read profiles" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Service role insert profiles" ON profiles;
CREATE POLICY "Service role insert profiles" ON profiles FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Auth read store_settings" ON store_settings;
CREATE POLICY "Auth read store_settings" ON store_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage store_settings" ON store_settings;
CREATE POLICY "Admin manage store_settings" ON store_settings FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Auth read categories" ON categories;
CREATE POLICY "Auth read categories" ON categories FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin manage categories" ON categories;
CREATE POLICY "Admin manage categories" ON categories FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Auth read suppliers" ON suppliers;
CREATE POLICY "Auth read suppliers" ON suppliers FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin manage suppliers" ON suppliers;
CREATE POLICY "Admin manage suppliers" ON suppliers FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Auth read customers" ON customers;
CREATE POLICY "Auth read customers" ON customers FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage customers" ON customers;
CREATE POLICY "Auth manage customers" ON customers FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read accessories" ON accessory_products;
CREATE POLICY "Auth read accessories" ON accessory_products FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage accessories" ON accessory_products;
CREATE POLICY "Auth manage accessories" ON accessory_products FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read mobiles" ON mobile_devices;
CREATE POLICY "Auth read mobiles" ON mobile_devices FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage mobiles" ON mobile_devices;
CREATE POLICY "Auth manage mobiles" ON mobile_devices FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read second_hand" ON second_hand_devices;
CREATE POLICY "Auth read second_hand" ON second_hand_devices FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage second_hand" ON second_hand_devices;
CREATE POLICY "Auth manage second_hand" ON second_hand_devices FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read sh_docs" ON second_hand_documents;
CREATE POLICY "Auth read sh_docs" ON second_hand_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth manage sh_docs" ON second_hand_documents;
CREATE POLICY "Auth manage sh_docs" ON second_hand_documents FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read purchases" ON purchases;
CREATE POLICY "Auth read purchases" ON purchases FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin manage purchases" ON purchases;
CREATE POLICY "Admin manage purchases" ON purchases FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Auth read purchase_items" ON purchase_items;
CREATE POLICY "Auth read purchase_items" ON purchase_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage purchase_items" ON purchase_items;
CREATE POLICY "Admin manage purchase_items" ON purchase_items FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Auth read sales" ON sales;
CREATE POLICY "Auth read sales" ON sales FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage sales" ON sales;
CREATE POLICY "Auth manage sales" ON sales FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read sale_items" ON sale_items;
CREATE POLICY "Auth read sale_items" ON sale_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth manage sale_items" ON sale_items;
CREATE POLICY "Auth manage sale_items" ON sale_items FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read invoices" ON invoices;
CREATE POLICY "Auth read invoices" ON invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth manage invoices" ON invoices;
CREATE POLICY "Auth manage invoices" ON invoices FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read audit" ON audit_logs;
CREATE POLICY "Auth read audit" ON audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth insert audit" ON audit_logs;
CREATE POLICY "Auth insert audit" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
