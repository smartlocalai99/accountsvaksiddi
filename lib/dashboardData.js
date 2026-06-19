import { query } from "@/lib/db";

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function countRows(tableName) {
  const result = await query(
    `SELECT COUNT(*)::int AS value FROM public.${quoteIdentifier(tableName)}`,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumColumn(tableName, columnName) {
  const result = await query(
    `SELECT COALESCE(SUM(${quoteIdentifier(columnName)}), 0)::numeric AS value FROM public.${quoteIdentifier(tableName)}`,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumTodayPayments() {
  const result = await query(
    `
      SELECT COALESCE(SUM(amount_paid), 0)::numeric AS value
      FROM public.fee_payments
      WHERE payment_date = CURRENT_DATE
    `,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumAdmissionDemand() {
  const result = await query(
    `
      SELECT COALESCE(SUM(COALESCE(final_fee, fees, 0)), 0)::numeric AS value
      FROM public.admissions
    `,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

export async function getDashboardProps() {
  const [totalStudents, totalAdmissions, totalFees, totalCollected, todaysCollection, expenses, salaries, totalAssets] = await Promise.all([
    countRows("students").catch(() => 0),
    countRows("admissions").catch(() => 0),
    sumAdmissionDemand().catch(() => 0),
    sumColumn("fee_payments", "amount_paid").catch(() => 0),
    sumTodayPayments().catch(() => 0),
    sumColumn("expenses", "amount").catch(() => 0),
    sumColumn("payroll", "net_salary").catch(() => 0),
    countRows("assets").catch(() => 0),
  ]);
  const pendingFees = Math.max(Number(totalFees || 0) - Number(totalCollected || 0), 0);

  return {
    totalStudents,
    totalAdmissions,
    totalFees,
    pendingFees,
    todaysCollection,
    expenses,
    salaries,
    totalAssets,
  };
}
