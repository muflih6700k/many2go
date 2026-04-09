-- Add name column to Lead table
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "name" TEXT;
