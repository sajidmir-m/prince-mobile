# Supabase SQL — Run Order

**If you got `type "user_role" already exists`:** your database is partially set up. Do **not** use the old 001. Run these in order:

| Step | File | Notes |
|------|------|--------|
| 1 | `001_initial_schema.sql` | **Updated — safe to re-run** (skips existing types/tables) |
| 2 | `002_storage_buckets.sql` | Skip errors on duplicate buckets |
| 3 | `003_store_contact.sql` | Store phone & email |
| 4 | `004_fix_auth_user_trigger.sql` | **Required** for creating users in Auth |
| 5 | `005_quantity_purchase_sync.sql` | Quantity column + purchase sync links |
| 6 | `006_ledger_expenses.sql` | Ledger profit columns + expenses (salary, etc.) |

Then create user in **Authentication → Users**, and run:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

## Fresh project (never ran SQL before)

Run 001 → 002 → 003 → 004 in one go.

## Already ran old 001 once

Run the **new** `001_initial_schema.sql` again (it will continue where it stopped), then 002, 003, 004.
