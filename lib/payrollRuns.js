import { getPool } from "./db.js";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const PAYROLL_STATUSES = {
  DRAFT: "DRAFT",
  BANK_FILE_GENERATED: "BANK_FILE_GENERATED",
  READY_FOR_SBI_UPLOAD: "READY_FOR_SBI_UPLOAD",
  UPLOADED_TO_SBI: "UPLOADED_TO_SBI",
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  FAILED: "FAILED",
  REGENERATED: "REGENERATED",
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function cleanText(value) {
  return String(value || "").trim();
}

function monthName(month) {
  return MONTH_NAMES[Number(month)] || String(month || "");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function daysInPayrollMonth(month, year) {
  return new Date(Number(year), Number(month), 0).getDate();
}

export function normalizePayrollInput(input = {}) {
  return {
    staffId: Number(input.staffId ?? input.staff_id ?? 0),
    staffCode: cleanText(input.staffCode ?? input.staff_code),
    staffName: cleanText(input.staffName ?? input.staff_name ?? input.full_name),
    designation: cleanText(input.designation),
    department: cleanText(input.department),
    monthlySalary: roundMoney(input.monthlySalary ?? input.monthly_salary),
    totalWorkingDays: toNumber(input.totalWorkingDays ?? input.total_working_days),
    presentDays: toNumber(input.presentDays ?? input.present_days),
    paidLeaveDays: toNumber(input.paidLeaveDays ?? input.paid_leave_days),
    unpaidLeaveDays: toNumber(input.unpaidLeaveDays ?? input.unpaid_leave_days),
    advanceDeduction: roundMoney(input.advanceDeduction ?? input.advance_deduction),
    otherDeduction: roundMoney(input.otherDeduction ?? input.other_deduction),
    bonusAllowance: roundMoney(input.bonusAllowance ?? input.bonus_allowance),
    accountName: cleanText(input.accountName ?? input.account_name),
    bankName: cleanText(input.bankName ?? input.bank_name),
    accountNumber: cleanText(input.accountNumber ?? input.account_number),
    ifscCode: cleanText(input.ifscCode ?? input.ifsc_code).toUpperCase(),
    upiId: cleanText(input.upiId ?? input.upi_id),
    remarks: cleanText(input.remarks),
  };
}

export function validatePayrollItem(item) {
  const errors = [];

  if (!item.staffId) errors.push("Staff is required.");
  if (!item.staffName) errors.push("Staff name is required.");
  if (item.totalWorkingDays <= 0) errors.push("Total working days must be greater than 0.");
  if (item.presentDays > item.totalWorkingDays) {
    errors.push("Present days cannot be greater than total working days.");
  }
  if (item.paidLeaveDays < 0) errors.push("Paid leave days cannot be negative.");
  if (item.unpaidLeaveDays < 0) errors.push("Unpaid leave days cannot be negative.");
  if (item.advanceDeduction < 0) errors.push("Advance deduction cannot be negative.");
  if (item.otherDeduction < 0) errors.push("Other deduction cannot be negative.");
  if (item.bonusAllowance < 0) errors.push("Bonus allowance cannot be negative.");

  return errors;
}

export function calculatePayrollItem(input = {}) {
  const item = normalizePayrollInput(input);
  const perDaySalary = item.totalWorkingDays > 0 ? item.monthlySalary / item.totalWorkingDays : 0;
  const leaveDeduction = roundMoney(perDaySalary * item.unpaidLeaveDays);
  const totalDeduction = roundMoney(leaveDeduction + item.advanceDeduction + item.otherDeduction);
  const netSalary = roundMoney(item.monthlySalary - totalDeduction + item.bonusAllowance);
  const bankStatus = item.accountNumber && item.ifscCode ? "Ready" : "Bank Details Missing";

  return {
    ...item,
    leaveDeduction,
    totalDeduction,
    netSalary,
    bankStatus,
    validationErrors: netSalary < 0 ? [...validatePayrollItem(item), "Net salary cannot be negative."] : validatePayrollItem(item),
  };
}

export function calculatePayrollTotals(items = []) {
  return items.reduce(
    (totals, item) => ({
      totalStaff: totals.totalStaff + 1,
      grossTotal: roundMoney(totals.grossTotal + toNumber(item.monthlySalary ?? item.monthly_salary)),
      deductionTotal: roundMoney(totals.deductionTotal + toNumber(item.totalDeduction ?? item.total_deduction)),
      netTotal: roundMoney(totals.netTotal + toNumber(item.netSalary ?? item.net_salary)),
      skippedBankCount:
        totals.skippedBankCount +
        ((item.bankStatus ?? item.bank_status) === "Bank Details Missing" ? 1 : 0),
    }),
    {
      totalStaff: 0,
      grossTotal: 0,
      deductionTotal: 0,
      netTotal: 0,
      skippedBankCount: 0,
    }
  );
}

export function generateSbiCsv({ month, year, items = [] }) {
  const readyItems = items.filter((item) => {
    const normalized = calculatePayrollItem(item);
    return normalized.bankStatus === "Ready";
  });
  const skippedCount = items.length - readyItems.length;
  const header = [
    "Beneficiary Name",
    "Account Number",
    "IFSC Code",
    "Amount",
    "Payment Mode",
    "Narration",
    "Staff Code",
  ];
  const rows = readyItems.map((item) => {
    const normalized = calculatePayrollItem(item);
    const amount = roundMoney(item.netSalary ?? item.net_salary ?? normalized.netSalary);
    return [
      normalized.staffName,
      normalized.accountNumber,
      normalized.ifscCode,
      amount.toFixed(2),
      "NEFT",
      `Salary ${monthName(month)} ${year}`,
      normalized.staffCode,
    ];
  });

  // TODO: Replace dummy CSV headers and format with exact SBI corporate salary bulk upload format after client/bank confirms.
  const content = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return {
    fileName: `sbi_salary_upload_${month}_${year}.csv`,
    content,
    skippedCount,
  };
}

export function validatePayrollRequest({ month, year, items }) {
  const errors = [];
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) errors.push("Month is required.");
  if (!parsedYear) errors.push("Year is required.");
  if (!Array.isArray(items) || items.length === 0) errors.push("At least one staff payroll item is required.");

  return errors;
}

export function getPortalUrls() {
  return {
    sbiCorporatePortalUrl:
      process.env.SBI_CORPORATE_PORTAL_URL || "https://corp.onlinesbi.sbi/corporate/sbi_home.html",
    yonoBusinessPortalUrl: process.env.YONO_BUSINESS_PORTAL_URL || "https://yonobusiness.sbi/",
  };
}

export async function ensurePayrollRunTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.payroll_runs (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      version INTEGER NOT NULL DEFAULT 1,
      generated_by_user_id INTEGER,
      generated_by_role VARCHAR(50),
      total_staff INTEGER NOT NULL DEFAULT 0,
      gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      deduction_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      net_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      skipped_bank_count INTEGER NOT NULL DEFAULT 0,
      bank_file_name VARCHAR(255),
      generated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.payroll_items (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      payroll_run_id INTEGER NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
      staff_id INTEGER,
      staff_code VARCHAR(50),
      staff_name VARCHAR(150),
      designation VARCHAR(100),
      department VARCHAR(100),
      monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_working_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
      present_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
      paid_leave_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
      unpaid_leave_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
      advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
      other_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
      bonus_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
      leave_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
      net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
      account_name VARCHAR(150),
      bank_name VARCHAR(150),
      account_number VARCHAR(50),
      ifsc_code VARCHAR(30),
      upi_id VARCHAR(150),
      bank_status VARCHAR(50),
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      payroll_run_id INTEGER REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
      action VARCHAR(80) NOT NULL,
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      performed_by_user_id INTEGER,
      performed_by_role VARCHAR(50),
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS payroll_runs_month_year_idx
    ON public.payroll_runs (year DESC, month DESC, version DESC)
  `);
}

function mapItemRow(row) {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    staffId: row.staff_id,
    staffCode: row.staff_code || "",
    staffName: row.staff_name || "",
    designation: row.designation || "",
    department: row.department || "",
    monthlySalary: Number(row.monthly_salary || 0),
    totalWorkingDays: Number(row.total_working_days || 0),
    presentDays: Number(row.present_days || 0),
    paidLeaveDays: Number(row.paid_leave_days || 0),
    unpaidLeaveDays: Number(row.unpaid_leave_days || 0),
    advanceDeduction: Number(row.advance_deduction || 0),
    otherDeduction: Number(row.other_deduction || 0),
    bonusAllowance: Number(row.bonus_allowance || 0),
    leaveDeduction: Number(row.leave_deduction || 0),
    totalDeduction: Number(row.total_deduction || 0),
    netSalary: Number(row.net_salary || 0),
    accountName: row.account_name || "",
    bankName: row.bank_name || "",
    accountNumber: row.account_number || "",
    ifscCode: row.ifsc_code || "",
    upiId: row.upi_id || "",
    bankStatus: row.bank_status || "",
    remarks: row.remarks || "",
  };
}

function mapRunRow(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    month: Number(row.month),
    year: Number(row.year),
    status: row.status,
    version: Number(row.version || 1),
    generatedByUserId: row.generated_by_user_id,
    generatedByRole: row.generated_by_role,
    totalStaff: Number(row.total_staff || 0),
    grossTotal: Number(row.gross_total || 0),
    deductionTotal: Number(row.deduction_total || 0),
    netTotal: Number(row.net_total || 0),
    skippedBankCount: Number(row.skipped_bank_count || 0),
    bankFileName: row.bank_file_name || "",
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export async function getLatestPayrollRun({ month, year, client = getPool() } = {}) {
  await ensurePayrollRunTables(client);

  const params = [];
  const where = [];
  if (month) {
    params.push(Number(month));
    where.push(`month = $${params.length}`);
  }
  if (year) {
    params.push(Number(year));
    where.push(`year = $${params.length}`);
  }

  const runResult = await client.query(
    `
    SELECT *
    FROM public.payroll_runs
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY year DESC, month DESC, version DESC, id DESC
    LIMIT 1
    `,
    params
  );

  const run = runResult.rows[0];
  if (!run) return null;

  const itemsResult = await client.query(
    `
    SELECT *
    FROM public.payroll_items
    WHERE payroll_run_id = $1
    ORDER BY staff_name ASC, id ASC
    `,
    [run.id]
  );

  return mapRunRow(run, itemsResult.rows.map(mapItemRow));
}

export async function buildPayrollDraft({ month, year, client = getPool() }) {
  await ensurePayrollRunTables(client);
  const totalWorkingDays = daysInPayrollMonth(month, year);
  const staffResult = await client.query(`
    SELECT
      id,
      staff_code,
      full_name,
      designation,
      department,
      monthly_salary,
      bank_account_name,
      bank_name,
      bank_account_number,
      ifsc_code,
      upi_id
    FROM public.staff
    WHERE work_status = 'Active'
    ORDER BY full_name ASC
  `);

  const items = staffResult.rows.map((staff) =>
    calculatePayrollItem({
      staffId: staff.id,
      staffCode: staff.staff_code,
      staffName: staff.full_name,
      designation: staff.designation,
      department: staff.department,
      monthlySalary: staff.monthly_salary,
      totalWorkingDays,
      presentDays: totalWorkingDays,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      advanceDeduction: 0,
      otherDeduction: 0,
      bonusAllowance: 0,
      accountName: staff.bank_account_name || staff.full_name,
      bankName: staff.bank_name,
      accountNumber: staff.bank_account_number,
      ifscCode: staff.ifsc_code,
      upiId: staff.upi_id,
      remarks: "",
    })
  );
  const totals = calculatePayrollTotals(items);

  return {
    exists: false,
    run: {
      id: null,
      month: Number(month),
      year: Number(year),
      status: PAYROLL_STATUSES.DRAFT,
      version: 0,
      ...totals,
      bankFileName: "",
      items,
    },
    portalUrls: getPortalUrls(),
  };
}

export async function getPayrollRunOrDraft({ month, year, client = getPool() }) {
  const existing = await getLatestPayrollRun({ month, year, client });
  if (existing) {
    return {
      exists: true,
      run: existing,
      portalUrls: getPortalUrls(),
    };
  }

  return buildPayrollDraft({ month, year, client });
}

export async function saveGeneratedPayrollRun({ month, year, items, user, regenerate = false }) {
  const requestErrors = validatePayrollRequest({ month, year, items });
  if (requestErrors.length) {
    const error = new Error(requestErrors.join(" "));
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePayrollRunTables(client);

    const existing = await getLatestPayrollRun({ month, year, client });
    if (existing && !regenerate) {
      const error = new Error("Payroll already exists for this month.");
      error.statusCode = 409;
      error.existingRun = existing;
      throw error;
    }

    if (existing && regenerate) {
      await client.query(
        `
        UPDATE public.payroll_runs
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [PAYROLL_STATUSES.REGENERATED, existing.id]
      );
      await client.query(
        `
        INSERT INTO public.payroll_audit_logs (
          payroll_run_id, action, old_status, new_status,
          performed_by_user_id, performed_by_role, remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          existing.id,
          "REGENERATE_SUPERSEDED",
          existing.status,
          PAYROLL_STATUSES.REGENERATED,
          user?.id || null,
          user?.role || null,
          `Regenerated payroll for ${monthName(month)} ${year}`,
        ]
      );
    }

    const calculatedItems = items.map(calculatePayrollItem);
    const validationErrors = calculatedItems.flatMap((item, index) =>
      item.validationErrors.map((message) => `Row ${index + 1} (${item.staffName || "Staff"}): ${message}`)
    );

    if (validationErrors.length) {
      const error = new Error(validationErrors.join(" "));
      error.statusCode = 400;
      throw error;
    }

    const totals = calculatePayrollTotals(calculatedItems);
    const csv = generateSbiCsv({ month, year, items: calculatedItems });
    const version = existing ? existing.version + 1 : 1;

    const runResult = await client.query(
      `
      INSERT INTO public.payroll_runs (
        month, year, status, version, generated_by_user_id, generated_by_role,
        total_staff, gross_total, deduction_total, net_total,
        skipped_bank_count, bank_file_name, generated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      RETURNING *
      `,
      [
        Number(month),
        Number(year),
        PAYROLL_STATUSES.BANK_FILE_GENERATED,
        version,
        user?.id || null,
        user?.role || null,
        totals.totalStaff,
        totals.grossTotal,
        totals.deductionTotal,
        totals.netTotal,
        totals.skippedBankCount,
        csv.fileName,
      ]
    );

    const run = runResult.rows[0];

    for (const item of calculatedItems) {
      await client.query(
        `
        INSERT INTO public.payroll_items (
          payroll_run_id, staff_id, staff_code, staff_name, designation, department,
          monthly_salary, total_working_days, present_days, paid_leave_days,
          unpaid_leave_days, advance_deduction, other_deduction, bonus_allowance,
          leave_deduction, total_deduction, net_salary, account_name, bank_name,
          account_number, ifsc_code, upi_id, bank_status, remarks
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        )
        `,
        [
          run.id,
          item.staffId || null,
          item.staffCode || null,
          item.staffName || null,
          item.designation || null,
          item.department || null,
          item.monthlySalary,
          item.totalWorkingDays,
          item.presentDays,
          item.paidLeaveDays,
          item.unpaidLeaveDays,
          item.advanceDeduction,
          item.otherDeduction,
          item.bonusAllowance,
          item.leaveDeduction,
          item.totalDeduction,
          item.netSalary,
          item.accountName || null,
          item.bankName || null,
          item.accountNumber || null,
          item.ifscCode || null,
          item.upiId || null,
          item.bankStatus,
          item.remarks || null,
        ]
      );
    }

    await client.query(
      `
      INSERT INTO public.payroll_audit_logs (
        payroll_run_id, action, old_status, new_status,
        performed_by_user_id, performed_by_role, remarks
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        run.id,
        existing ? "PAYROLL_REGENERATED" : "PAYROLL_GENERATED",
        existing ? existing.status : null,
        PAYROLL_STATUSES.BANK_FILE_GENERATED,
        user?.id || null,
        user?.role || null,
        `Generated payroll and bank file for ${monthName(month)} ${year}`,
      ]
    );

    await client.query("COMMIT");

    return {
      run: mapRunRow(run, calculatedItems),
      csv,
      portalUrls: getPortalUrls(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
