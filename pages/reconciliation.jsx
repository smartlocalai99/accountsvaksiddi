import { useState, useEffect, useMemo } from "react";
import {
  FaUpload,
  FaFileExcel,
  FaFilePdf,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaTrash,
  FaPaperPlane,
  FaSearch,
  FaCalendarAlt,
  FaUniversity,
  FaRedoAlt,
  FaClipboardCheck,
  FaEye,
} from "react-icons/fa";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/reconciliation" });

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function toNumber(value) {
  return Number(value || 0);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(monthKey) {
  if (!monthKey) return "-";

  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getStatementFileIcon(fileName = "") {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return FaFilePdf;
  }

  return FaFileExcel;
}

function addRowIds(rows = []) {
  return rows.map((row, index) => ({
    ...row,
    id:
      row.id ||
      `${row.utr || "no-utr"}-${row.bankAmount || 0}-${
        row.bankDate || ""
      }-${index}`,
    reviewNote: row.reviewNote || "",
    submitted: Boolean(row.submitted),
    ignored: Boolean(row.ignored),
  }));
}

function isNeedsReview(row) {
  if (row.submitted || row.ignored) return false;

  return [
    "Unmatched",
    "Possible Match",
    "Recorded Not Found",
    "Duplicate Bank Credit",
  ].includes(row.status);
}

export default function ReconciliationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statementFile, setStatementFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [reconciliationRows, setReconciliationRows] = useState([]);

  const [statementMonth, setStatementMonth] = useState(getCurrentMonth());
  const [bankAccount, setBankAccount] = useState("Primary Bank Account");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewFilter, setViewFilter] = useState("Needs Review");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/cash-bank");
        const json = await res.json();

        if (json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch reconciliation data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return reconciliationRows.filter((row) => {
      const rowDate = row.bankDate || "";
      const rowStatus = row.submitted
        ? "Submitted"
        : row.ignored
        ? "Ignored"
        : row.status;

      const matchesView =
        viewFilter === "All" ||
        (viewFilter === "Needs Review" && isNeedsReview(row)) ||
        rowStatus === viewFilter;

      const matchesSearch =
        !search ||
        [
          row.bankDate,
          row.utr,
          row.narration,
          row.bankAmount,
          row.receiptNo,
          row.invoiceNo,
          row.studentName,
          row.partyName,
          row.status,
          row.reviewNote,
          row.matchReason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesFrom = !dateFrom || rowDate >= dateFrom;
      const matchesTo = !dateTo || rowDate <= dateTo;

      return matchesView && matchesSearch && matchesFrom && matchesTo;
    });
  }, [reconciliationRows, searchText, viewFilter, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-slate-900"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load reconciliation data
      </div>
    );
  }

  const { summary = {}, today = {} } = data;

  const actualCash = toNumber(summary.cashInHand);
  const actualBank = toNumber(summary.bankBalance);
  const totalAvailable = actualCash + actualBank;

  const todaysCollection =
    toNumber(summary.todaysCollection) ||
    toNumber(today.feeCollections) + toNumber(today.otherIncome);

  const totalBankCredit = reconciliationRows.reduce(
    (sum, row) => sum + toNumber(row.bankAmount),
    0
  );

  const smartBooksRecorded = reconciliationRows
    .filter((row) => row.status === "Matched" || row.status === "Possible Match")
    .reduce((sum, row) => sum + toNumber(row.bankAmount), 0);

  const differenceAmount = totalBankCredit - smartBooksRecorded;

  const matchedCount = reconciliationRows.filter(
    (row) => row.status === "Matched"
  ).length;

  const mayMatchedCount = reconciliationRows.filter(
    (row) => row.status === "Possible Match"
  ).length;

  const unmatchedCount = reconciliationRows.filter(
    (row) => row.status === "Unmatched"
  ).length;

  const recordedMissingCount = reconciliationRows.filter(
    (row) => row.status === "Recorded Not Found"
  ).length;

  const duplicateCount = reconciliationRows.filter(
    (row) => row.status === "Duplicate Bank Credit"
  ).length;

  const submittedCount = reconciliationRows.filter(
    (row) => row.submitted
  ).length;

  const ignoredCount = reconciliationRows.filter((row) => row.ignored).length;

  const needsReviewCount = reconciliationRows.filter(isNeedsReview).length;

  const visibleActionableCount = filteredRows.filter(
    (row) => isNeedsReview(row) && !row.submitted && !row.ignored
  ).length;

  async function handleStatementUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setStatementFile(file);
    setScanError("");
    setScanning(true);
    setReconciliationRows([]);

    try {
      const formData = new FormData();
      formData.append("statement", file);
      formData.append("month", statementMonth);
      formData.append("bankAccount", bankAccount);
      formData.append("dateFrom", dateFrom);
      formData.append("dateTo", dateTo);

      const res = await fetch("/api/reconciliation/upload-bank-statement", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to scan bank statement");
      }

      setReconciliationRows(addRowIds(json.rows || []));
      setViewFilter("Needs Review");
    } catch (error) {
      console.error("Bank statement scan failed:", error);

      setScanError(
        "Demo mode: backend scan API is not connected yet. After connecting it, SmartBooks AI will read UTR/reference, amount, date, and narration from the uploaded Excel, CSV, or PDF bank statement and compare it with invoices/receipts."
      );

      setReconciliationRows(addRowIds(getDemoReconciliationRows()));
      setViewFilter("Needs Review");
    } finally {
      setScanning(false);
    }
  }

  function updateRowNote(rowId, note) {
    setReconciliationRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, reviewNote: note } : row
      )
    );
  }

  async function submitRow(row) {
    try {
      await fetch("/api/reconciliation/submit-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankDate: row.bankDate,
          utr: row.utr,
          narration: row.narration,
          bankAmount: row.bankAmount,
          status: row.status,
          note: row.reviewNote || "",
          bankAccount,
          statementMonth,
        }),
      });
    } catch (error) {
      console.warn("Submit review API not connected yet:", error);
    }

    setReconciliationRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, submitted: true } : item
      )
    );
  }

  function ignoreRow(rowId) {
    setReconciliationRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, ignored: true } : row
      )
    );
  }

  function deleteRow(rowId) {
    setReconciliationRows((current) =>
      current.filter((row) => row.id !== rowId)
    );
  }

  function resetFilters() {
    setViewFilter("Needs Review");
    setSearchText("");
    setDateFrom("");
    setDateTo("");
  }

  function submitAllVisible() {
    filteredRows
      .filter((row) => isNeedsReview(row) && !row.submitted && !row.ignored)
      .forEach((row) => submitRow(row));
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Bank Reconciliation
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Upload a bank statement, extract UTR/reference and amount, then
            match bank credits with invoices, receipts, and transactions in
            SmartBooks AI.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Liquid Money Position
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cash in hand plus available bank balance. Reconciliation checks
                whether accountant-entered receipts are actually credited in the
                bank.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
                Today&apos;s Collection: {formatCurrency(todaysCollection)}
              </div>

              <div className="rounded-full bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
                Total Available: {formatCurrency(totalAvailable)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1.2fr] lg:items-center">
            <FormulaBox
              title="Cash in Hand"
              value={formatCurrency(actualCash)}
              subtitle="Physical cash"
              className="border-green-200 bg-green-50 text-green-700"
            />

            <MathSymbol symbol="+" />

            <FormulaBox
              title="Bank Balance"
              value={formatCurrency(actualBank)}
              subtitle="Available in bank"
              className="border-blue-200 bg-blue-50 text-blue-700"
            />

            <MathSymbol symbol="=" />

            <FormulaBox
              title="Total Available"
              value={formatCurrency(totalAvailable)}
              subtitle="Usable money now"
              className="border-purple-200 bg-purple-50 text-purple-700"
              highlight
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                  AI Bank Statement Matching
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Monthly reconciliation batch
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                  Select the statement month and bank account, upload Excel,
                  CSV, or PDF bank statement, and review only the records that
                  need attention.
                </p>

                <p className="mt-2 max-w-3xl text-xs font-semibold leading-6 text-slate-500">
                  Supported files: Excel, CSV, PDF. For best results, upload
                  Excel or CSV. PDF should be text-based and not
                  password-protected.
                </p>
              </div>

              <label className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#217346] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1e6b40] xl:w-auto">
                <FaUpload className="pointer-events-none" />
                <span className="pointer-events-none">Upload Statement</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleStatementUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <FaCalendarAlt />
                  Statement Month
                </label>
                <input
                  type="month"
                  value={statementMonth}
                  onChange={(e) => setStatementMonth(e.target.value)}
                  className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <FaUniversity />
                  Bank Account
                </label>
                <select
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                >
                  <option>Primary Bank Account</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>SBI Bank</option>
                  <option>Axis Bank</option>
                  <option>Other Bank</option>
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="flex h-full min-h-18 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FaRedoAlt className="pointer-events-none" />
                <span className="pointer-events-none">Reset Filters</span>
              </button>
            </div>

            {statementFile && (
              <div className="mt-5 grid gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 md:grid-cols-4">
                <StatementInfo
                  icon={getStatementFileIcon(statementFile.name)}
                  label="Uploaded File"
                  value={statementFile.name}
                />
                <StatementInfo
                  icon={FaCalendarAlt}
                  label="Month"
                  value={formatMonth(statementMonth)}
                />
                <StatementInfo
                  icon={FaUniversity}
                  label="Bank Account"
                  value={bankAccount}
                />
                <StatementInfo
                  icon={FaClipboardCheck}
                  label="Rows Scanned"
                  value={scanning ? "Scanning..." : reconciliationRows.length}
                />
              </div>
            )}

            {scanError && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                {scanError}
              </div>
            )}
          </div>

          <div className="p-6">
            {reconciliationRows.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-7">
                  <SummaryMetric
                    title="Bank Credits"
                    value={formatCurrency(totalBankCredit)}
                    className="border-slate-200 bg-slate-50 text-slate-900"
                  />
                  <SummaryMetric
                    title="Recorded"
                    value={formatCurrency(smartBooksRecorded)}
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  />
                  <SummaryMetric
                    title="Difference"
                    value={formatCurrency(differenceAmount)}
                    className={
                      differenceAmount === 0
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }
                  />
                  <SummaryMetric
                    title="Matched"
                    value={matchedCount}
                    className="border-green-200 bg-green-50 text-green-700"
                  />
                  <SummaryMetric
                    title="May Matched"
                    value={mayMatchedCount}
                    className="border-amber-200 bg-amber-50 text-amber-700"
                  />
                  <SummaryMetric
                    title="Unmatched"
                    value={unmatchedCount + recordedMissingCount + duplicateCount}
                    className="border-red-200 bg-red-50 text-red-700"
                  />
                  <SummaryMetric
                    title="Submitted"
                    value={submittedCount}
                    className="border-purple-200 bg-purple-50 text-purple-700"
                  />
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_240px_auto]">
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <FaSearch className="text-slate-400" />
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search UTR, narration, receipt, student, amount..."
                      className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <select
                    value={viewFilter}
                    onChange={(e) => setViewFilter(e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 outline-none"
                  >
                    <option value="Needs Review">Needs Review</option>
                    <option value="All">All Bank Rows</option>
                    <option value="Matched">Matched</option>
                    <option value="Possible Match">May Matched</option>
                    <option value="Unmatched">Unmatched</option>
                    <option value="Recorded Not Found">
                      Recorded Not Found
                    </option>
                    <option value="Duplicate Bank Credit">
                      Duplicate Bank Credit
                    </option>
                    <option value="Submitted">Submitted</option>
                    <option value="Ignored">Ignored</option>
                  </select>

                  <button
                    type="button"
                    onClick={submitAllVisible}
                    disabled={visibleActionableCount === 0}
                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
                  >
                    <FaPaperPlane className="pointer-events-none" />
                    <span className="pointer-events-none">Submit Visible</span>
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Client workflow
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
                    Matched records are counted automatically. Needs Review
                    shows only records that require accountant action: unmatched
                    bank credits, possible matches, duplicate credits, or
                    receipts recorded in SmartBooks but not found in the bank.
                  </p>
                </div>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-295 text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          Date
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          Bank Transaction
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          Amount
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          SmartBooks Match
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          Note
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.length > 0 ? (
                        filteredRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-4 py-4 font-semibold text-slate-700">
                              {row.bankDate || "-"}
                            </td>

                            <td className="px-4 py-4">
                              <p className="font-black text-slate-900">
                                {row.utr || "No UTR / Ref"}
                              </p>
                              <p className="mt-1 max-w-82.5 text-sm leading-6 text-slate-600">
                                {row.narration || "-"}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-right font-black text-green-700">
                              {formatCurrency(row.bankAmount)}
                            </td>

                            <td className="px-4 py-4">
                              <SystemMatch row={row} />
                            </td>

                            <td className="px-4 py-4">
                              <ReconciliationStatus
                                status={
                                  row.submitted
                                    ? "Submitted"
                                    : row.ignored
                                    ? "Ignored"
                                    : row.status
                                }
                              />
                            </td>

                            <td className="px-4 py-4">
                              {isNeedsReview(row) ? (
                                <textarea
                                  value={row.reviewNote || ""}
                                  onChange={(e) =>
                                    updateRowNote(row.id, e.target.value)
                                  }
                                  placeholder="Add reason / student name / follow-up note..."
                                  rows={2}
                                  className="w-full min-w-65 resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-900"
                                />
                              ) : (
                                <p className="text-sm font-semibold text-slate-500">
                                  Auto verified / no action needed
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {isNeedsReview(row) ? (
                                <div className="flex min-w-40 flex-col gap-2">
                                  <button
                                    type="button"
                                    onClick={() => submitRow(row)}
                                    disabled={row.submitted}
                                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-green-600"
                                  >
                                    <FaPaperPlane className="pointer-events-none" />
                                    <span className="pointer-events-none">
                                      {row.submitted ? "Submitted" : "Submit"}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => ignoreRow(row.id)}
                                    disabled={row.ignored}
                                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <FaEye className="pointer-events-none" />
                                    <span className="pointer-events-none">
                                      Ignore
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteRow(row.id)}
                                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                                  >
                                    <FaTrash className="pointer-events-none" />
                                    <span className="pointer-events-none">
                                      Delete
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  No action
                                </p>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                          >
                            No records found for the selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyReconciliationState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDemoReconciliationRows() {
  return [
    {
      bankDate: "2026-05-22",
      utr: "UTR1029384756",
      narration: "UPI/Parent fee payment/Ramesh",
      bankAmount: 4000,
      invoiceNo: "INV-1024",
      receiptNo: "RCPT-10021",
      studentName: "Ramesh Kumar",
      matchReason: "UTR and amount matched",
      status: "Matched",
    },
    {
      bankDate: "2026-05-22",
      utr: "UTR1029384757",
      narration: "UPI/School fee/Suresh",
      bankAmount: 5000,
      invoiceNo: "INV-1025",
      receiptNo: "RCPT-10022",
      studentName: "Suresh B",
      matchReason: "UTR and amount matched",
      status: "Matched",
    },
    {
      bankDate: "2026-05-22",
      utr: "UTR1029384758",
      narration: "UPI/Unknown credit",
      bankAmount: 3000,
      receiptNo: "",
      studentName: "",
      matchReason: "No invoice or receipt found",
      status: "Unmatched",
    },
    {
      bankDate: "2026-05-21",
      utr: "UTR1029384759",
      narration: "IMPS/Parent transfer",
      bankAmount: 8000,
      invoiceNo: "INV-1018",
      receiptNo: "Possible: RCPT-10018",
      studentName: "Likely match - amount same, UTR missing",
      matchReason: "Amount matched, UTR missing",
      status: "Possible Match",
    },
    {
      bankDate: "2026-05-20",
      utr: "UTR1029384760",
      narration: "NEFT/Unknown school fee transfer",
      bankAmount: 6000,
      receiptNo: "",
      studentName: "",
      matchReason: "No invoice or receipt found",
      status: "Unmatched",
    },
    {
      bankDate: "2026-05-19",
      utr: "UTR1029384761",
      narration: "Duplicate UPI credit / same payer",
      bankAmount: 4000,
      invoiceNo: "INV-1024",
      receiptNo: "RCPT-10021",
      studentName: "Ramesh Kumar",
      matchReason: "Same invoice already matched once",
      status: "Duplicate Bank Credit",
    },
    {
      bankDate: "2026-05-18",
      utr: "",
      narration: "Receipt entered in SmartBooks but not visible in bank",
      bankAmount: 7000,
      invoiceNo: "INV-1030",
      receiptNo: "RCPT-10030",
      studentName: "Ananya R",
      matchReason: "Receipt exists in SmartBooks, no bank credit found",
      status: "Recorded Not Found",
    },
  ];
}

function EmptyReconciliationState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl text-slate-500 shadow-sm">
        <FaFileExcel />
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-900">
        No statement uploaded yet
      </h3>

      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
        Upload this month&apos;s Excel, CSV, or PDF bank statement to start
        reconciliation. SmartBooks AI will extract UTR/reference number, amount,
        date, and narration automatically.
      </p>
    </div>
  );
}

function StatementInfo({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#217346] text-white">
        <Icon />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
          {label}
        </p>
        <p className="truncate text-sm font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function FormulaBox({ title, value, subtitle, className, highlight = false }) {
  return (
    <div
      className={`rounded-3xl border-2 p-5 shadow-sm ${className} ${
        highlight ? "ring-2 ring-purple-100" : ""
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
        {title}
      </p>
      <p className="mt-3 whitespace-nowrap text-2xl font-black">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{subtitle}</p>
    </div>
  );
}

function MathSymbol({ symbol }) {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500">
        {symbol}
      </div>
    </div>
  );
}

function SummaryMetric({ title, value, className }) {
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function SystemMatch({ row }) {
  if (row.status === "Unmatched") {
    return (
      <div>
        <p className="font-black text-red-700">No matching receipt found</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {row.matchReason || "Needs manual review"}
        </p>
      </div>
    );
  }

  if (row.status === "Recorded Not Found") {
    return (
      <div>
        <p className="font-black text-red-700">Recorded but not in bank</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {row.receiptNo || "-"} • {row.studentName || "-"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-black text-slate-900">
        {row.invoiceNo || row.receiptNo || "-"}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {row.receiptNo || "-"} • {row.studentName || row.partyName || "-"}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">
        {row.matchReason || ""}
      </p>
    </div>
  );
}

function ReconciliationStatus({ status }) {
  const config = {
    Matched: {
      icon: FaCheckCircle,
      className: "bg-green-100 text-green-700",
      label: "Matched",
    },
    "Possible Match": {
      icon: FaExclamationTriangle,
      className: "bg-amber-100 text-amber-700",
      label: "May Matched",
    },
    Unmatched: {
      icon: FaTimesCircle,
      className: "bg-red-100 text-red-700",
      label: "Unmatched",
    },
    "Recorded Not Found": {
      icon: FaExclamationTriangle,
      className: "bg-red-100 text-red-700",
      label: "Recorded Not Found",
    },
    "Duplicate Bank Credit": {
      icon: FaExclamationTriangle,
      className: "bg-orange-100 text-orange-700",
      label: "Duplicate",
    },
    Submitted: {
      icon: FaPaperPlane,
      className: "bg-blue-100 text-blue-700",
      label: "Submitted",
    },
    Ignored: {
      icon: FaEye,
      className: "bg-slate-100 text-slate-700",
      label: "Ignored",
    },
  };

  const selected = config[status] || config.Unmatched;
  const Icon = selected.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${selected.className}`}
    >
      <Icon />
      {selected.label}
    </span>
  );
}