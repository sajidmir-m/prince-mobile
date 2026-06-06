-- Update Prince Mobile Store contact details (run if 001 was already applied)
UPDATE store_settings
SET
  store_name = 'Prince Mobile Store',
  store_phone = '9796639516',
  store_email = 'princemobilestore786@gmail.com'
WHERE store_name IS NOT NULL;
