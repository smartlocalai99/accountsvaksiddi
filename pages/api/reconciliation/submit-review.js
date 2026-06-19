import { Pool } from "pg";

const pool =
  global.reconciliationReviewPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (!global.reconciliationReviewPool) {
  global.reconciliationReviewPool = pool;
}

async function ensureReviewTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.reconciliation_reviews (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      bank_date DATE,
      utr VARCHAR(120),
      narration TEXT,
      bank_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(60),
      note TEXT,
      bank_account VARCHAR(150),
      statement_month VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await ensureReviewTable();

    const body = req.body || {};
    const result = await pool.query(
      `
        INSERT INTO public.reconciliation_reviews (
          bank_date,
          utr,
          narration,
          bank_amount,
          status,
          note,
          bank_account,
          statement_month
        ) VALUES (
          $1::date,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING id
      `,
      [
        cleanText(body.bankDate),
        cleanText(body.utr),
        cleanText(body.narration),
        cleanAmount(body.bankAmount),
        cleanText(body.status),
        cleanText(body.note),
        cleanText(body.bankAccount),
        cleanText(body.statementMonth),
      ]
    );

    return res.status(200).json({
      success: true,
      id: result.rows[0]?.id,
    });
  } catch (error) {
    console.error("Reconciliation review save error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to save reconciliation review",
    });
  }
}
