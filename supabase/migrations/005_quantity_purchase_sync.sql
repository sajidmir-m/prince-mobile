-- Quantity on mobiles + purchase link for inventory sync
ALTER TABLE mobile_devices
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE mobile_devices
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;

ALTER TABLE second_hand_devices
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE second_hand_devices
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

ALTER TABLE second_hand_devices
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;
