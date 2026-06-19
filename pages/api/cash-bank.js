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

function toNumber(value) {
  return Number(value || 0);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const [totalsResult, todayResult, monthlyResult, transactionsResult] =
      await Promise.all([
        pool.query(`
          SELECT
            COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments), 0)::numeric AS total_collections,
            COALESCE((SELECT SUM(amount) FROM public.expenses), 0)::numeric AS total_expenses,
            COALESCE((SELECT SUM(net_salary) FROM public.payroll WHERE payment_status = 'PAID'), 0)::numeric AS salary_paid,
            COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments WHERE LOWER(payment_mode) = 'cash'), 0)::numeric AS cash_collections,
            COALESCE((SELECT COUNT(*) FROM public.fee_payments WHERE LOWER(payment_mode) = 'cash'), 0)::int AS cash_count,
            COALESCE((SELECT COUNT(*) FROM public.fee_payments WHERE LOWER(payment_mode) IN ('upi', 'online', 'phonepe', 'bank transfer')), 0)::int AS upi_count,
            COALESCE((SELECT COUNT(*) FROM public.fee_payments WHERE LOWER(payment_mode) IN ('check', 'cheque')), 0)::int AS check_count
        `),
        pool.query(`
          SELECT
            COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments WHERE payment_date = CURRENT_DATE), 0)::numeric AS fee_collections,
            COALESCE((SELECT SUM(amount) FROM public.expenses WHERE date = CURRENT_DATE), 0)::numeric AS expenses,
            COALESCE((SELECT SUM(net_salary) FROM public.payroll WHERE payment_status = 'PAID' AND payment_date = CURRENT_DATE), 0)::numeric AS salary_paid
        `),
        pool.query(`
          SELECT
            TO_CHAR(month_date, 'Mon YYYY') AS month,
            TO_CHAR(month_date, 'YYYY-MM') AS month_key,
            COALESCE(fee_collections, 0)::numeric AS deposits,
            (COALESCE(expenses, 0) + COALESCE(salaries, 0))::numeric AS withdrawals,
            (COALESCE(fee_collections, 0) - COALESCE(expenses, 0) - COALESCE(salaries, 0))::numeric AS closing
          FROM (
            SELECT date_trunc('month', payment_date)::date AS month_date
            FROM public.fee_payments
            UNION
            SELECT date_trunc('month', date)::date AS month_date
            FROM public.expenses
            UNION
            SELECT date_trunc('month', payment_date)::date AS month_date
            FROM public.payroll
            WHERE payment_date IS NOT NULL
          ) months
          LEFT JOIN (
            SELECT date_trunc('month', payment_date)::date AS month_date, SUM(amount_paid) AS fee_collections
            FROM public.fee_payments
            GROUP BY date_trunc('month', payment_date)::date
          ) fees USING (month_date)
          LEFT JOIN (
            SELECT date_trunc('month', date)::date AS month_date, SUM(amount) AS expenses
            FROM public.expenses
            GROUP BY date_trunc('month', date)::date
          ) exp USING (month_date)
          LEFT JOIN (
            SELECT date_trunc('month', payment_date)::date AS month_date, SUM(net_salary) AS salaries
            FROM public.payroll
            WHERE payment_status = 'PAID' AND payment_date IS NOT NULL
            GROUP BY date_trunc('month', payment_date)::date
          ) sal USING (month_date)
          ORDER BY month_key ASC
          LIMIT 12
        `),
        pool.query(`
          SELECT *
          FROM (
            SELECT
              'Fee Collection' AS type,
              receipt_no AS ref_no,
              amount_paid AS amount,
              payment_date AS date,
              payment_mode,
              'Deposit' AS direction
            FROM public.fee_payments
            UNION ALL
            SELECT
              'Expense' AS type,
              title AS ref_no,
              amount,
              date,
              'Cash' AS payment_mode,
              'Withdrawal' AS direction
            FROM public.expenses
            UNION ALL
            SELECT
              'Salary' AS type,
              COALESCE(reference_no, 'Payroll') AS ref_no,
              net_salary AS amount,
              payment_date AS date,
              COALESCE(payment_mode, 'Bank Transfer') AS payment_mode,
              'Withdrawal' AS direction
            FROM public.payroll
            WHERE payment_status = 'PAID' AND payment_date IS NOT NULL
          ) tx
          ORDER BY date DESC NULLS LAST
          LIMIT 15
        `),
      ]);

    const totals = totalsResult.rows[0] || {};
    const today = todayResult.rows[0] || {};
    const totalCollections = toNumber(totals.total_collections);
    const totalExpenses = toNumber(totals.total_expenses);
    const salaryPaid = toNumber(totals.salary_paid);
    const cashBalance = toNumber(totals.cash_collections);
    const bankBalance = totalCollections - cashBalance - totalExpenses - salaryPaid;
    const closingBalance = totalCollections - totalExpenses - salaryPaid;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          cashInHand: cashBalance,
          bankBalance,
          totalLiquid: cashBalance + bankBalance,
          upiPending: 0,
          checksPending: 0,
        },
        today: {
          date: new Date().toISOString().split("T")[0],
          openingBalance: 0,
          feeCollections: toNumber(today.fee_collections),
          otherIncome: 0,
          expenses: toNumber(today.expenses),
          salaryPaid: toNumber(today.salary_paid),
          cashDeposit: toNumber(today.fee_collections),
          cashWithdrawal: toNumber(today.expenses) + toNumber(today.salary_paid),
          closingBalance,
        },
        collectionsBreakdown: {
          cash: toNumber(totals.cash_count),
          upi: toNumber(totals.upi_count),
          check: toNumber(totals.check_count),
          totalAmount: totalCollections,
        },
        monthlyTrend: monthlyResult.rows.map((row) => ({
          month: row.month,
          openingBalance: 0,
          closing: toNumber(row.closing),
          deposits: toNumber(row.deposits),
          withdrawals: toNumber(row.withdrawals),
        })),
        recentTransactions: transactionsResult.rows,
        unclearedItems: [],
        reconciliation: {
          bookBalance: closingBalance,
          bankBalance,
          checksInTransit: 0,
          depositsInTransit: 0,
          reconcileBalance: closingBalance,
        },
      },
    });
  } catch (err) {
    console.error("Cash/Bank API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
