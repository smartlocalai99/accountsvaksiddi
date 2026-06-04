import { Pool } from "pg";
import { dummyAdmissions, dummyFeePayments } from "@/lib/dummyData";

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

export default async function handler(req, res) {
  try {
    const {
      query: { id },
      method,
    } = req;

    if (method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const admissionId = Number(id);

    if (!admissionId) {
      return res.status(400).json({ success: false, error: "Invalid admission id" });
    }

    const admissionResult = await pool.query(
      `SELECT * FROM public.admissions WHERE id = $1 LIMIT 1`,
      [admissionId]
    );

    const paymentsResult = await pool.query(
      `SELECT * FROM public.fee_payments WHERE admission_id = $1 ORDER BY payment_date DESC, id DESC`,
      [admissionId]
    );

    return res.status(200).json({
      success: true,
      admission: admissionResult.rows[0] || null,
      payments: paymentsResult.rows || [],
    });
  } catch (err) {
    console.error("Admission detail API error:", err?.message || err);

    // Fallback to dummy data for demo/dev
    const admissionId = Number(req.query.id);
    if (!admissionId) {
      return res.status(400).json({ success: false, error: "Invalid admission id" });
    }

    const admission = dummyAdmissions.find((a) => a.id === admissionId) || null;
    const payments = dummyFeePayments.filter((p) => p.admission_id === admissionId);

    return res.status(200).json({ success: true, admission, payments });
  }
}
