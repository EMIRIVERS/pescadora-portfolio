-- Deduplicate leads by email, keeping the most recent one
-- For leads with the same email, keep the one with the latest created_at
DELETE FROM leads
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(COALESCE(email, id::text)))
    id
  FROM leads
  ORDER BY LOWER(COALESCE(email, id::text)), created_at DESC
);

-- Add unique constraint on email to prevent future duplicates
-- (only for non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique
  ON leads (LOWER(email))
  WHERE email IS NOT NULL;
