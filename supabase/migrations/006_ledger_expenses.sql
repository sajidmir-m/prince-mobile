-- Ledger: track purchase cost on sales + business expenses

-- Cost/profit per sold line (for gross profit in ledger)
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS purchase_unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS profit DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Business expenses (salary, rent, etc.)
DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'salary',
    'rent',
    'utilities',
    'marketing',
    'repair',
    'transport',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category expense_category NOT NULL DEFAULT 'other',
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read expenses" ON expenses;
CREATE POLICY "Auth read expenses" ON expenses
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage expenses" ON expenses;
CREATE POLICY "Auth manage expenses" ON expenses
  FOR ALL TO authenticated USING (true);

-- Backfill profit on existing sale_items from product tables
UPDATE sale_items si
SET
  purchase_unit_cost = COALESCE(m.purchase_price, 0),
  profit = si.total_price - (COALESCE(m.purchase_price, 0) * si.quantity)
FROM mobile_devices m
WHERE si.product_type = 'mobile' AND si.product_id = m.id
  AND si.purchase_unit_cost = 0;

UPDATE sale_items si
SET
  purchase_unit_cost = COALESCE(sh.purchase_price, 0),
  profit = si.total_price - (COALESCE(sh.purchase_price, 0) * si.quantity)
FROM second_hand_devices sh
WHERE si.product_type = 'second_hand' AND si.product_id = sh.id
  AND si.purchase_unit_cost = 0;

UPDATE sale_items si
SET
  purchase_unit_cost = COALESCE(a.purchase_price, 0),
  profit = si.total_price - (COALESCE(a.purchase_price, 0) * si.quantity)
FROM accessory_products a
WHERE si.product_type = 'accessory' AND si.product_id = a.id
  AND si.purchase_unit_cost = 0;
