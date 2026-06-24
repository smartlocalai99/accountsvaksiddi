import { Pool } from "pg";
import { getUserFromRequest } from "@/lib/auth";
import { isAdminRole } from "@/lib/changeRequests";

const pool =
  global.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.pgPool) global.pgPool = pool;

async function ensureExpensesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.expenses (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function cleanValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value;
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export default async function handler(req, res) {
  try {
    await ensureExpensesTable();
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (req.method === "GET") {
      const result = await pool.query(
        `
          SELECT
            id,
            date,
            title,
            category,
            amount,
            notes,
            created_at
          FROM public.expenses
          ORDER BY created_at DESC NULLS LAST, id DESC
        `
      );

      return res.status(200).json({
        success: true,
        expenses: result.rows,
      });
    }

    if (req.method === "PUT") {
      if (!isAdminRole(user.role)) {
        return res.status(403).json({ success: false, error: "Admin access required" });
      }

      const id = Number(req.query.id);
      const body = req.body || {};
      const amount = cleanNumber(body.amount);

      if (!id || !body.date || !body.title || !body.category || !amount) {
        return res.status(400).json({ success: false, error: "Valid expense details are required" });
      }

      const result = await pool.query(
        `
          UPDATE public.expenses
          SET date = $1, title = $2, category = $3, amount = $4, notes = $5
          WHERE id = $6
          RETURNING *
        `,
        [body.date, body.title, body.category, amount, cleanValue(body.notes), id]
      );

      return res.status(200).json({ success: true, expense: result.rows[0] });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const body = req.body || {};
    const date = cleanValue(body.date) || new Date().toISOString().slice(0, 10);
    const title = cleanValue(body.title);
    const category = cleanValue(body.category);
    const amount = cleanNumber(body.amount);

    if (!title || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: "Title, category, and amount are required",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO public.expenses (
          date,
          title,
          category,
          amount,
          notes
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        date,
        title,
        category,
        amount,
        cleanValue(body.notes),
      ]
    );

    return res.status(200).json({
      success: true,
      expense: result.rows[0],
    });
  } catch (err) {
    console.error("Expenses API Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
