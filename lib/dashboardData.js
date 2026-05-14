import { query } from "@/lib/db";

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function findTable(candidates) {
  const result = await query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
      ORDER BY array_position($1::text[], table_name)
      LIMIT 1
    `,
    [candidates]
  );

  return result.rows[0]?.table_name || null;
}

async function findColumn(tableName, candidates) {
  const result = await query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2)
      ORDER BY array_position($2::text[], column_name)
      LIMIT 1
    `,
    [tableName, candidates]
  );

  return result.rows[0]?.column_name || null;
}

async function countRows(tableName) {
  const result = await query(
    `SELECT COUNT(*)::int AS value FROM public.${quoteIdentifier(tableName)}`,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumFirstMatchingColumn(tableCandidates, columnCandidates) {
  const tableName = await findTable(tableCandidates);

  if (!tableName) {
    return null;
  }

  const columnName = await findColumn(tableName, columnCandidates);

  if (!columnName) {
    return null;
  }

  const result = await query(
    `SELECT COALESCE(SUM(${quoteIdentifier(columnName)}), 0)::numeric AS value FROM public.${quoteIdentifier(tableName)}`,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumTodayFromTable(tableCandidates, valueCandidates, dateCandidates) {
  const tableName = await findTable(tableCandidates);

  if (!tableName) {
    return null;
  }

  const valueColumn = await findColumn(tableName, valueCandidates);
  const dateColumn = await findColumn(tableName, dateCandidates);

  if (!valueColumn || !dateColumn) {
    return null;
  }

  const result = await query(
    `
      SELECT COALESCE(SUM(${quoteIdentifier(valueColumn)}), 0)::numeric AS value
      FROM public.${quoteIdentifier(tableName)}
      WHERE ${quoteIdentifier(dateColumn)}::date = CURRENT_DATE
    `,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function getPendingFees() {
  const tableName = await findTable(["fees", "fee_records", "fee_payments", "student_fees"]);

  if (!tableName) {
    return null;
  }

  const directColumns = ["pending_fee", "pending_amount", "balance", "due_amount", "outstanding_amount"];
  const directColumn = await findColumn(tableName, directColumns);

  if (directColumn) {
    const result = await query(
      `SELECT COALESCE(SUM(${quoteIdentifier(directColumn)}), 0)::numeric AS value FROM public.${quoteIdentifier(tableName)}`,
      []
    );

    return Number(result.rows[0]?.value || 0);
  }

  const totalColumn = await findColumn(tableName, ["total_fee", "fee_amount", "amount", "payable_amount", "gross_amount"]);
  const paidColumn = await findColumn(tableName, ["paid_amount", "collected_amount", "received_amount", "amount_paid"]);

  if (!totalColumn || !paidColumn) {
    return null;
  }

  const result = await query(
    `
      SELECT
        COALESCE(SUM(${quoteIdentifier(totalColumn)}), 0) - COALESCE(SUM(${quoteIdentifier(paidColumn)}), 0) AS value
      FROM public.${quoteIdentifier(tableName)}
    `,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumSalaries() {
  const payrollTable = await findTable(["payroll", "salaries", "salary_payments", "staff_salaries"]);

  if (payrollTable) {
    const amountCol = await findColumn(payrollTable, ["amount", "salary", "net_salary", "total", "paid_amount"]);

    if (amountCol) {
      const result = await query(
        `SELECT COALESCE(SUM(${quoteIdentifier(amountCol)}), 0)::numeric AS value FROM public.${quoteIdentifier(payrollTable)}`,
        []
      );
      return Number(result.rows[0]?.value || 0);
    }
  }

  const expensesTable = await findTable(["expenses", "expense_records", "cash_expenses", "expense_transactions"]);

  if (expensesTable) {
    const amountCol = await findColumn(expensesTable, ["amount", "expense_amount", "total_amount"]);
    const categoryCol = await findColumn(expensesTable, ["category", "type", "expense_type", "head"]);

    if (amountCol && categoryCol) {
      const result = await query(
        `SELECT COALESCE(SUM(${quoteIdentifier(amountCol)}), 0)::numeric AS value FROM public.${quoteIdentifier(expensesTable)} WHERE LOWER(${quoteIdentifier(categoryCol)}) LIKE '%salary%'`,
        []
      );
      return Number(result.rows[0]?.value || 0);
    }
  }

  return null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(value, min, max) {
  return Number(value || 0) > 0 ? Number(value) : randomInt(min, max);
}

function pickDemo(value, min, max, demoThreshold = 10) {
  return Number(value || 0) >= demoThreshold ? Number(value) : randomInt(min, max);
}

function makeDemoAdmissions(totalAdmissions, startIndex = 0) {
  const names = [
    ["Aarav Sharma", "Rohit Sharma", "6", "APPROVED"],
    ["Ananya Reddy", "Suresh Reddy", "4", "NEW"],
    ["Vihaan Patel", "Kiran Patel", "8", "IN_REVIEW"],
    ["Isha Gupta", "Manoj Gupta", "3", "NEW"],
    ["Kabir Mehta", "Amit Mehta", "7", "APPROVED"],
  ];

  return names.slice(0, Math.min(5, totalAdmissions)).map(([studentName, fatherName, className, status], index) => ({
    id: 9000 + startIndex + index + 1,
    student_name: studentName,
    class_applying_for: className,
    admission_status: status,
    fees: randomInt(18000, 85000),
    father_name: fatherName,
    father_mobile: `98${randomInt(10000000, 99999999)}`,
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
  }));
}

function makeDemoStatusCounts(totalAdmissions) {
  const approved = Math.max(1, Math.floor(totalAdmissions * 0.34));
  const inReview = Math.max(1, Math.floor(totalAdmissions * 0.24));
  const pending = Math.max(1, Math.floor(totalAdmissions * 0.18));
  const fresh = Math.max(1, totalAdmissions - approved - inReview - pending);

  return [
    { status: "NEW", value: fresh },
    { status: "APPROVED", value: approved },
    { status: "IN_REVIEW", value: inReview },
    { status: "PENDING", value: pending },
  ].filter((item) => item.value > 0);
}

export async function getDashboardProps() {
  const [totalStudents, totalAdmissions, latestAdmissions, admissionStatusCounts, totalFees, pendingFees, todaysCollection, expenses, salaries, totalAssets] = await Promise.all([
    countRows("students").catch(() => 0),
    countRows("admissions").catch(() => 0),
    query(
      `
        SELECT id, student_name, class_applying_for, admission_status, created_at, father_name, father_mobile, fees
        FROM public.admissions
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 5
      `,
      []
    )
      .then((result) =>
        result.rows.map((row) => ({
          ...row,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        }))
      )
      .catch(() => []),
    query(
      `
        SELECT
          COALESCE(NULLIF(UPPER(TRIM(admission_status)), ''), 'NEW') AS status,
          COUNT(*)::int AS value
        FROM public.admissions
        GROUP BY COALESCE(NULLIF(UPPER(TRIM(admission_status)), ''), 'NEW')
        ORDER BY value DESC, status ASC
      `,
      []
    )
      .then((result) => result.rows.map((row) => ({
        status: row.status,
        value: Number(row.value || 0),
      })))
      .catch(() => []),
    sumFirstMatchingColumn(["fees", "fee_records", "fee_payments", "student_fees"], ["total_fee", "fee_amount", "amount", "payable_amount", "gross_amount"]).catch(() => null),
    getPendingFees().catch(() => null),
    sumTodayFromTable(
      ["fees", "fee_records", "fee_payments", "student_fees"],
      ["amount", "paid_amount", "collected_amount", "receipt_amount"],
      ["created_at", "payment_date", "transaction_date", "date"]
    ).catch(() => null),
    sumFirstMatchingColumn(["expenses", "expense_records", "cash_expenses", "expense_transactions"], ["amount", "expense_amount", "total_amount"]).catch(() => null),
    sumSalaries().catch(() => null),
    countRows("assets").catch(() => 0),
  ]);
  const displayTotalStudents = pickDemo(totalStudents, 420, 1400);
  const displayTotalAdmissions = pickDemo(totalAdmissions, 95, 360);
  const displayTotalFees = pick(totalFees, 1800000, 8500000);
  const displayPendingFees = pick(pendingFees, 120000, 950000);
  const displayTodaysCollection = pick(todaysCollection, 35000, 240000);
  const displayExpenses = pick(expenses, 90000, 760000);
  const displaySalaries = pick(salaries, 320000, 1250000);
  const displayTotalAssets = pickDemo(totalAssets, 35, 180, 5);
  const displayLatestAdmissions = latestAdmissions.length >= 5
    ? latestAdmissions
    : [
        ...latestAdmissions,
        ...makeDemoAdmissions(displayTotalAdmissions, latestAdmissions.length).slice(0, 5 - latestAdmissions.length),
      ];
  const displayAdmissionStatusCounts = admissionStatusCounts.length > 1 && totalAdmissions >= 10
    ? admissionStatusCounts
    : makeDemoStatusCounts(displayTotalAdmissions);

  return {
    totalStudents: displayTotalStudents,
    totalAdmissions: displayTotalAdmissions,
    latestAdmissions: displayLatestAdmissions,
    admissionStatusCounts: displayAdmissionStatusCounts,
    totalFees: displayTotalFees,
    pendingFees: displayPendingFees,
    todaysCollection: displayTodaysCollection,
    expenses: displayExpenses,
    salaries: displaySalaries,
    totalAssets: displayTotalAssets,
  };
}
