-- Enable PostgreSQL btree_gist extension for multidimensional exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent physical double-booking:
-- Ensures no two active (non-cancelled) reservations occupy the same physical room on overlapping stay dates
ALTER TABLE "booking_rooms"
ADD CONSTRAINT "physical_room_no_overlap"
EXCLUDE USING gist (
  room_id WITH =,
  daterange("check_in_date", "check_out_date") WITH &&
)
WHERE (room_id IS NOT NULL AND room_status NOT IN ('CANCELLED', 'CHECKED_OUT'));

-- Add audit indexes for multi-tenant querying
CREATE INDEX IF NOT EXISTS "idx_booking_rooms_active_dates"
ON "booking_rooms" ("property_id", "check_in_date", "check_out_date")
WHERE "room_status" IN ('CONFIRMED', 'CHECKED_IN', 'IN_HOUSE');

CREATE INDEX IF NOT EXISTS "idx_inventory_ledger_prop_date"
ON "inventory_ledger" ("property_id", "room_type_id", "date");
