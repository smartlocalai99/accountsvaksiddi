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

async function ensureExpensesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.expenses (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      notes TEXT,
      receipt_file_name VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensurePayrollTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.payroll (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      staff_id INTEGER,
      month DATE NOT NULL,
      gross_salary NUMERIC(12, 2),
      deductions NUMERIC(12, 2) DEFAULT 0,
      net_salary NUMERIC(12, 2),
      status VARCHAR(20) DEFAULT 'Pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => null);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { month = "", fromDate = "", toDate = "" } = req.query;
    await ensureExpensesTable();
    await ensurePayrollTable();

    // Core statistics
    const stats = await pool.query(`
      SELECT
        COALESCE((SELECT COUNT(*) FROM public.students), 0)::int AS total_students,
        COALESCE((SELECT COUNT(*) FROM public.admissions), 0)::int AS total_admissions,
        COALESCE((SELECT SUM(COALESCE(final_fee, fees, 0)) FROM public.admissions), 0)::numeric AS total_fees,
        COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments), 0)::numeric AS total_collected,
        COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments WHERE payment_date = CURRENT_DATE), 0)::numeric AS today_collection,
        COALESCE((SELECT COUNT(*) FROM public.admissions WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'), 0)::int AS new_admissions_this_month,
        COALESCE((SELECT SUM(purchase_cost) FROM public.assets), 0)::numeric AS asset_value,
        COALESCE((SELECT SUM(quantity) FROM public.assets), 0)::int AS total_assets
    `);

    const totalFees = Number(stats.rows[0].total_fees || 0);
    const totalCollected = Number(stats.rows[0].total_collected || 0);
    const todayCollection = Number(stats.rows[0].today_collection || 0);

    // Monthly collections
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

    // Expense breakdown
    const expenseBreakdown = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized') AS category,
        COALESCE(SUM(amount), 0)::numeric AS amount
      FROM public.expenses
      GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized')
      ORDER BY amount DESC, category ASC
      LIMIT 12
    `).catch(() => ({ rows: [] }));

    // Expense and salary totals
    const expenseTotals = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total_expenses FROM public.expenses
    `).catch(() => ({ rows: [{ total_expenses: 0 }] }));

    const salaryTotals = await pool.query(`
      SELECT 
        COALESCE(SUM(net_salary), 0)::numeric AS total_salaries,
        COALESCE(COUNT(*), 0)::int AS total_staff
      FROM public.payroll
      WHERE status = 'Pending'
    `).catch(() => ({ rows: [{ total_salaries: 0, total_staff: 0 }] }));

    const expensesValue = Number(expenseTotals.rows[0]?.total_expenses || 0);
    const salariesValue = Number(salaryTotals.rows[0]?.total_salaries || 0);
    const salaryPending = salariesValue;

    // Today's expenses
    const todayExpensesResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS today_expenses
      FROM public.expenses
      WHERE date = CURRENT_DATE
    `).catch(() => ({ rows: [{ today_expenses: 0 }] }));

    const todayExpenses = Number(todayExpensesResult.rows[0]?.today_expenses || 0);

    // Class-wise fees
    const classWiseFees = await pool.query(`
      SELECT
        a.class_applying_for AS class,
        COALESCE(COUNT(a.id), 0)::int AS students,
        COALESCE(SUM(COALESCE(a.final_fee, a.fees, 0)), 0)::numeric AS total_demand,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS collected,
        (COALESCE(SUM(COALESCE(a.final_fee, a.fees, 0)), 0) - COALESCE(SUM(fp.amount_paid), 0))::numeric AS pending
      FROM public.admissions a
      LEFT JOIN public.fee_payments fp ON fp.admission_id = a.id
      WHERE a.class_applying_for IS NOT NULL
      GROUP BY a.class_applying_for
      ORDER BY a.class_applying_for
    `);

    // Pending students
    const pendingStudents = await pool.query(`
      SELECT
        a.id AS admission_id,
        a.student_name,
        a.class_applying_for AS class,
        a.father_name,
        a.father_mobile AS parent_mobile,
        COALESCE(a.final_fee, a.fees, 0)::numeric AS total_fee,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS paid_amount,
        (COALESCE(a.final_fee, a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0))::numeric AS balance_amount,
        CEIL(EXTRACT(DAY FROM CURRENT_DATE - a.created_at))::int AS due_days
      FROM public.admissions a
      LEFT JOIN public.fee_payments fp ON fp.admission_id = a.id
      WHERE COALESCE(a.final_fee, a.fees) IS NOT NULL
      GROUP BY a.id
      HAVING (COALESCE(a.final_fee, a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0)) > 0
      ORDER BY balance_amount DESC
      LIMIT 50
    `);

    // New admissions this month
    const newAdmissionsThisMonth = await pool.query(`
      SELECT
        a.id,
        a.student_name,
        a.class_applying_for AS class,
        a.father_name AS parent_name,
        a.father_mobile AS mobile,
        a.created_at AS admission_date,
        CASE 
          WHEN COALESCE(SUM(fp.amount_paid), 0) = 0 THEN 'Pending'
          WHEN COALESCE(SUM(fp.amount_paid), 0) < COALESCE(a.final_fee, a.fees, 0) THEN 'Partial'
          ELSE 'Paid'
        END AS fee_status
      FROM public.admissions a
      LEFT JOIN public.fee_payments fp ON fp.admission_id = a.id
      WHERE DATE(a.created_at) >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `);

    // Recent payments
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
      LIMIT 20
    `);

    // Expense table details
    const expenseTable = await pool.query(`
      SELECT
        date,
        category,
        title AS description,
        'Cash' AS payment_mode,
        amount,
        'System' AS added_by
      FROM public.expenses
      ORDER BY date DESC
      LIMIT 30
    `).catch(() => ({ rows: [] }));

    return res.status(200).json({
      success: true,
      data: {
        // Summary cards
        totalStudents: Number(stats.rows[0].total_students || 0),
        totalAdmissions: Number(stats.rows[0].total_admissions || 0),
        totalFees,
        totalCollected,
        pendingFees: totalFees - totalCollected,
        todayCollection,
        todayExpenses,
        salaryPending,
        netBalance: totalCollected - expensesValue - salariesValue,
        newAdmissionsThisMonth: Number(stats.rows[0].new_admissions_this_month || 0),

        // Financial data
        expenses: expensesValue,
        salaries: salariesValue,
        netSurplus: totalCollected - expensesValue - salariesValue,
        totalAssets: Number(stats.rows[0].total_assets || 0),
        assetValue: Number(stats.rows[0].asset_value || 0),

        // Reports data
        monthlyCollections: monthlyCollections.rows,
        expenseBreakdown: expenseBreakdown.rows,
        expenseTable: expenseTable.rows,
        classWiseFees: classWiseFees.rows,
        pendingStudents: pendingStudents.rows,
        newAdmissionsThisMonth: newAdmissionsThisMonth.rows,
        recentPayments: recentPayments.rows,
      },
    });
  } catch (err) {
    console.error("Reports API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
