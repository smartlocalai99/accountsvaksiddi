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

    const stats = await pool.query(`
      SELECT
        COALESCE((SELECT COUNT(*) FROM public.students), 0)::int AS total_students,
        COALESCE((SELECT COUNT(*) FROM public.admissions), 0)::int AS total_admissions,
        COALESCE((SELECT SUM(fees) FROM public.admissions WHERE fees IS NOT NULL), 0)::numeric AS total_fees,
        COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments), 0)::numeric AS total_collected,
        COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments WHERE payment_date = CURRENT_DATE), 0)::numeric AS today_collection,
        COALESCE((SELECT SUM(purchase_cost) FROM public.assets), 0)::numeric AS asset_value,
        COALESCE((SELECT SUM(quantity) FROM public.assets), 0)::int AS total_assets
    `);

    const totalFees = Number(stats.rows[0].total_fees || 0);
    const totalCollected = Number(stats.rows[0].total_collected || 0);

    const monthlyCollections = await pool.query(`
      SELECT
        TO_CHAR(payment_date, 'Mon YYYY') AS month,
        TO_CHAR(payment_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount_paid), 0)::numeric AS amount
      FROM public.fee_payments
      GROUP BY month, month_key
      ORDER BY month_key ASC
      LIMIT 12
    `);

    const classWiseFees = await pool.query(`
      SELECT
        a.class_applying_for AS class,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS collected
      FROM public.admissions a
      LEFT JOIN public.fee_payments fp ON fp.admission_id = a.id
      WHERE a.class_applying_for IS NOT NULL
      GROUP BY a.class_applying_for
      ORDER BY a.class_applying_for
    `);

    const pendingStudents = await pool.query(`
      SELECT
        a.id AS admission_id,
        a.student_name,
        a.class_applying_for AS class,
        a.father_name,
        COALESCE(a.fees, 0)::numeric AS total_fee,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS paid_amount,
        (COALESCE(a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0))::numeric AS balance_amount
      FROM public.admissions a
      LEFT JOIN public.fee_payments fp ON fp.admission_id = a.id
      WHERE a.fees IS NOT NULL
      GROUP BY a.id
      HAVING (COALESCE(a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0)) > 0
      ORDER BY balance_amount DESC
      LIMIT 20
    `);

    const recentPayments = await pool.query(`
      SELECT
        fp.id,
        fp.receipt_no,
        fp.amount_paid,
        fp.payment_mode,
        fp.payment_date,
        fp.collected_by,
        a.student_name
      FROM public.fee_payments fp
      LEFT JOIN public.admissions a ON a.id = fp.admission_id
      ORDER BY fp.id DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalStudents: Number(stats.rows[0].total_students || 0),
        totalAdmissions: Number(stats.rows[0].total_admissions || 0),
        totalFees,
        totalCollected,
        pendingFees: totalFees - totalCollected,
        todayCollection: Number(stats.rows[0].today_collection || 0),

        expenses: 0,
        salaries: 0,
        netSurplus: totalCollected,

        totalAssets: Number(stats.rows[0].total_assets || 0),
        assetValue: Number(stats.rows[0].asset_value || 0),

        monthlyCollections: monthlyCollections.rows,
        expenseBreakdown: [],
        classWiseFees: classWiseFees.rows,
        pendingStudents: pendingStudents.rows,
        recentPayments: recentPayments.rows,
      },
    });
  } catch (err) {
    console.error("Reports API Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}