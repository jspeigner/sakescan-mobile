-- B10: Allow anonymous scans and fix scans RLS
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_user_id_fkey;
ALTER TABLE scans ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE scans
ADD CONSTRAINT scans_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can create their own scans" ON scans;
DROP POLICY IF EXISTS "Anyone can create scans" ON scans;
DROP POLICY IF EXISTS "Users can read all scans" ON scans;
DROP POLICY IF EXISTS "Anyone can read all scans" ON scans;
DROP POLICY IF EXISTS "Users can update their own scans" ON scans;
DROP POLICY IF EXISTS "Users can delete their own scans" ON scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON scans;
DROP POLICY IF EXISTS "Users can read own scans" ON scans;
DROP POLICY IF EXISTS "Anonymous can insert scans" ON scans;

CREATE POLICY "Anyone can create scans" ON scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read all scans" ON scans FOR SELECT USING (true);
CREATE POLICY "Users can update their own scans" ON scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scans" ON scans FOR DELETE USING (auth.uid() = user_id);

COMMENT ON COLUMN scans.user_id IS 'User who performed the scan. NULL for anonymous scans.';
