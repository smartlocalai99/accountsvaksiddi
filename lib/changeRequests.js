import { Pool } from "pg";

export const changeRequestPool =
  global.changeRequestPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.changeRequestPool) {
  global.changeRequestPool = changeRequestPool;
}

export async function ensureChangeRequestsTable(client = changeRequestPool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.ledger_change_requests (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ledger_type VARCHAR(30) NOT NULL CHECK (ledger_type IN ('FEE', 'EXPENSE')),
      record_id INTEGER NOT NULL,
      original_data JSONB NOT NULL,
      proposed_data JSONB NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      requested_by INTEGER NOT NULL REFERENCES public."Login_accounts"(id),
      reviewed_by INTEGER REFERENCES public."Login_accounts"(id),
      review_note TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_change_requests_pending
      ON public.ledger_change_requests(ledger_type, record_id)
      WHERE status = 'PENDING'
  `);
}

export function isAdminRole(role) {
  return ["ADMIN", "SUPER_ADMIN"].includes(
    String(role || "").trim().toUpperCase()
  );
}
