-- Update any existing 'New' tickets to 'Open' before removing the enum value
UPDATE ticket SET status = 'Open' WHERE status = 'New';

-- Remove 'New' from the TicketStatus enum and change default to 'Open'
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
CREATE TYPE "TicketStatus" AS ENUM ('Open', 'Resolved', 'Closed');
ALTER TABLE ticket ALTER COLUMN status DROP DEFAULT;
ALTER TABLE ticket ALTER COLUMN status TYPE "TicketStatus" USING status::text::"TicketStatus";
ALTER TABLE ticket ALTER COLUMN status SET DEFAULT 'Open';
DROP TYPE "TicketStatus_old";
