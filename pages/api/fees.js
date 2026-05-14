import { Pool } from "pg";

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
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { month = "" } = req.query;

    const monthFilter = month
      ? `AND TO_CHAR(fp.payment_date, 'YYYY-MM') = $1`
      : "";

    const params = month ? [month] : [];

    const recordsResult = await pool.query(`
      SELECT
        a.id AS admission_id,
        a.student_id,
        a.student_name,
        a.class_applying_for AS class,
        a.father_name,
        a.father_mobile,
        COALESCE(a.fees, 0)::numeric AS total_fee,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS paid_amount,
        (COALESCE(a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0))::numeric AS balance_amount,
        CASE
          WHEN COALESCE(SUM(fp.amount_paid), 0) = 0 THEN 'Pending'
          WHEN COALESCE(SUM(fp.amount_paid), 0) < COALESCE(a.fees, 0) THEN 'Partial'
          ELSE 'Paid'
        END AS payment_status
      FROM public.admissions a
      LEFT JOIN public.fee_payments fp
        ON fp.admission_id = a.id
      WHERE a.fees IS NOT NULL
      GROUP BY a.id
      ORDER BY a.id DESC
    `);

    const metricsResult = await pool.query(
      `
      SELECT
        COALESCE((SELECT SUM(fees) FROM public.admissions WHERE fees IS NOT NULL), 0)::numeric AS total_fees,

        COALESCE((
          SELECT SUM(amount_paid)
          FROM public.fee_payments fp
          WHERE 1=1 ${monthFilter}
        ), 0)::numeric AS total_collected,

        COALESCE((
          SELECT SUM(amount_paid)
          FROM public.fee_payments
          WHERE payment_date = CURRENT_DATE
        ), 0)::numeric AS today_collection
      `,
      params
    );

    const totalFees = Number(metricsResult.rows[0]?.total_fees || 0);
    const totalCollected = Number(metricsResult.rows[0]?.total_collected || 0);

    const monthlyResult = await pool.query(`
      SELECT
        TO_CHAR(payment_date, 'Mon YYYY') AS month_label,
        TO_CHAR(payment_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount_paid), 0)::numeric AS collected
      FROM public.fee_payments
      GROUP BY month_label, month_key
      ORDER BY month_key ASC
      LIMIT 12
    `);

    return res.status(200).json({
      success: true,
      records: recordsResult.rows,
      metrics: {
        totalFees,
        totalCollected,
        pendingFees: totalFees - totalCollected,
        todayCollection: Number(metricsResult.rows[0]?.today_collection || 0),
      },
      monthly: monthlyResult.rows,
    });
  } catch (err) {
    console.error("Fees API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}