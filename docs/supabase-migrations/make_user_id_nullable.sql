-- Make user_id nullable in scans table to allow anonymous scans
-- This allows building a database with scans from non-authenticated users

-- First, drop the existing foreign key constraint
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_user_id_fkey;

-- Make user_id nullable
ALTER TABLE scans ALTER COLUMN user_id DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL
-- This way if a user is deleted, their scans remain but are marked as anonymous
ALTER TABLE scans
ADD CONSTRAINT scans_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE SET NULL;

-- Update RLS policies to allow anonymous inserts
DROP POLICY IF EXISTS "Users can create their own scans" ON scans;

-- Allow anyone (authenticated or not) to insert scans
CREATE POLICY "Anyone can create scans"
ON scans
FOR INSERT
WITH CHECK (true);

-- Allow users to read all scans (for building the database)
DROP POLICY IF EXISTS "Users can read all scans" ON scans;
CREATE POLICY "Anyone can read all scans"
ON scans
FOR SELECT
USING (true);

-- Users can only update/delete their own scans (if authenticated)
DROP POLICY IF EXISTS "Users can update their own scans" ON scans;
CREATE POLICY "Users can update their own scans"
ON scans
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scans" ON scans;
CREATE POLICY "Users can delete their own scans"
ON scans
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON COLUMN scans.user_id IS 'User who performed the scan. NULL for anonymous scans.';
