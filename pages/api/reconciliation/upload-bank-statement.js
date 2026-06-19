import fs from "fs/promises";
import formidable from "formidable";
import { Pool } from "pg";
import XLSX from "xlsx";

export const config = {
  api: {
    bodyParser: false,
  },
};

const pool =
  global.reconciliationPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.reconciliationPool) {
  global.reconciliationPool = pool;
}

function getField(fields, name) {
  const value = fields[name];
  return Array.isArray(value) ? value[0] : value || "";
}

function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeReference(value) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

function normalizeAmount(value) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function normalizeDate(value) {
  if (!value) return "";

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d
      ).padStart(2, "0")}`;
    }
  }

  const text = String(value).trim();
  if (!text) return "";

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return text;

  const [, day, month, rawYear] = match;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getRowValue(row, candidates) {
  const entries = Object.entries(row).map(([key, value]) => [
    key.toLowerCase().replace(/[^a-z0-9]/g, ""),
    value,
  ]);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = entries.find(([key]) => key.includes(normalized));
    if (match && normalizeText(match[1])) {
      return match[1];
    }
  }

  return "";
}

function extractReferenceFromText(text) {
  const value = normalizeText(text);
  const utrMatch = value.match(/\b(?:UTR|UPI|IMPS|NEFT|REF)[\s:/-]*([A-Z0-9]{6,})\b/i);
  if (utrMatch) return utrMatch[1];

  const longNumber = value.match(/\b[A-Z0-9]{10,}\b/i);
  return longNumber?.[0] || "";
}

function readStatementRows(filePath) {
  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    raw: false,
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function mapBankRows(rawRows) {
  return rawRows
    .map((row, index) => {
      const narration =
        getRowValue(row, ["narration", "description", "particulars", "remarks"]) ||
        Object.values(row).join(" ");
      const explicitReference = getRowValue(row, [
        "utr",
        "reference",
        "ref no",
        "transaction id",
        "transaction no",
      ]);
      const credit =
        getRowValue(row, ["credit", "deposit", "amount received"]) ||
        getRowValue(row, ["amount"]);
      const debit = getRowValue(row, ["debit", "withdrawal"]);
      const amount = normalizeAmount(credit) || (debit ? 0 : normalizeAmount(credit));
      const bankDate = normalizeDate(
        getRowValue(row, ["date", "transaction date", "value date"])
      );
      const utr = normalizeReference(explicitReference || extractReferenceFromText(narration));

      return {
        sourceIndex: index,
        bankDate,
        utr,
        narration: normalizeText(narration),
        bankAmount: amount,
      };
    })
    .filter((row) => row.bankAmount > 0 || row.utr || row.narration);
}

async function getFeePayments({ month, dateFrom, dateTo }) {
  const params = [];
  const where = [];

  if (dateFrom) {
    params.push(dateFrom);
    where.push(`fp.payment_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    where.push(`fp.payment_date <= $${params.length}::date`);
  }

  if (!dateFrom && !dateTo && month) {
    params.push(`${month}-01`);
    where.push(`fp.payment_date >= $${params.length}::date`);
    params.push(`${month}-01`);
    where.push(`fp.payment_date < ($${params.length}::date + INTERVAL '1 month')`);
  }

  const result = await pool.query(
    `
      SELECT
        fp.id,
        fp.receipt_no,
        fp.amount_paid,
        fp.payment_date,
        fp.payment_mode,
        fp.utr,
        fp.reference_no,
        a.student_name,
        a.father_name
      FROM public.fee_payments fp
      LEFT JOIN public.admissions a ON a.id = fp.admission_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY fp.payment_date DESC NULLS LAST, fp.id DESC
    `,
    params
  );

  return result.rows;
}

function buildMatches(bankRows, feePayments) {
  const paymentsByReference = new Map();
  const usedPaymentIds = new Set();
  const seenBankReferences = new Set();

  feePayments.forEach((payment) => {
    [payment.utr, payment.reference_no, payment.receipt_no]
      .map(normalizeReference)
      .filter(Boolean)
      .forEach((key) => paymentsByReference.set(key, payment));
  });

  const rows = bankRows.map((bankRow) => {
    const reference = normalizeReference(bankRow.utr);
    const matchingPayment = reference ? paymentsByReference.get(reference) : null;
    const duplicate = reference && seenBankReferences.has(reference);

    if (reference) {
      seenBankReferences.add(reference);
    }

    if (matchingPayment) {
      usedPaymentIds.add(matchingPayment.id);
      return {
        ...bankRow,
        receiptNo: matchingPayment.receipt_no,
        studentName: matchingPayment.student_name,
        partyName: matchingPayment.father_name,
        matchReason: "Reference matched with fee payment",
        status: duplicate ? "Duplicate Bank Credit" : "Matched",
      };
    }

    const possiblePayment = feePayments.find(
      (payment) =>
        !usedPaymentIds.has(payment.id) &&
        Number(payment.amount_paid || 0) === Number(bankRow.bankAmount || 0)
    );

    if (possiblePayment) {
      return {
        ...bankRow,
        receiptNo: possiblePayment.receipt_no,
        studentName: possiblePayment.student_name,
        partyName: possiblePayment.father_name,
        matchReason: "Amount matched, reference not found",
        status: "Possible Match",
      };
    }

    return {
      ...bankRow,
      receiptNo: "",
      studentName: "",
      partyName: "",
      matchReason: "No matching fee payment found",
      status: "Unmatched",
    };
  });

  feePayments
    .filter((payment) => !usedPaymentIds.has(payment.id))
    .forEach((payment) => {
      rows.push({
        bankDate: payment.payment_date
          ? new Date(payment.payment_date).toISOString().slice(0, 10)
          : "",
        utr: normalizeReference(payment.utr || payment.reference_no),
        narration: "Fee payment recorded in app but not found in uploaded bank statement",
        bankAmount: Number(payment.amount_paid || 0),
        receiptNo: payment.receipt_no,
        studentName: payment.student_name,
        partyName: payment.father_name,
        matchReason: "App receipt exists; uploaded bank statement has no matching reference",
        status: "Recorded Not Found",
      });
    });

  return rows;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  let filePath = "";

  try {
    const { fields, files } = await parseForm(req);
    const statementFile = Array.isArray(files.statement)
      ? files.statement[0]
      : files.statement;

    if (!statementFile?.filepath) {
      return res.status(400).json({
        success: false,
        message: "Please upload a bank statement file.",
      });
    }

    filePath = statementFile.filepath;
    const fileName = statementFile.originalFilename || "";
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls", "csv"].includes(extension)) {
      return res.status(400).json({
        success: false,
        message: "Only Excel or CSV bank statements can be reconciled right now.",
      });
    }

    const bankRows = mapBankRows(readStatementRows(filePath));
    const feePayments = await getFeePayments({
      month: getField(fields, "month"),
      dateFrom: getField(fields, "dateFrom"),
      dateTo: getField(fields, "dateTo"),
    });

    return res.status(200).json({
      success: true,
      rows: buildMatches(bankRows, feePayments),
    });
  } catch (error) {
    console.error("Bank statement reconciliation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to reconcile bank statement.",
    });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => null);
    }
  }
}
