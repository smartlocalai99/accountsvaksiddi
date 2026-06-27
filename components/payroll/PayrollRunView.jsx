import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700",
  BANK_FILE_GENERATED: "bg-blue-100 text-blue-700",
  READY_FOR_SBI_UPLOAD: "bg-indigo-100 text-indigo-700",
  UPLOADED_TO_SBI: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
  REGENERATED: "bg-slate-200 text-slate-600",
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function daysInMonth(month, year) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function roundMoney(value) {
  return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
}

function calculatePreview(row) {
  const monthlySalary = Number(row.monthlySalary || 0);
  const totalWorkingDays = Number(row.totalWorkingDays || 0);
  const unpaidLeaveDays = Number(row.unpaidLeaveDays || 0);
  const advanceDeduction = Number(row.advanceDeduction || 0);
  const otherDeduction = Number(row.otherDeduction || 0);
  const bonusAllowance = Number(row.bonusAllowance || 0);
  const perDaySalary = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
  const leaveDeduction = roundMoney(perDaySalary * unpaidLeaveDays);
  const totalDeduction = roundMoney(leaveDeduction + advanceDeduction + otherDeduction);
  const netSalary = roundMoney(monthlySalary - totalDeduction + bonusAllowance);
  return { leaveDeduction, totalDeduction, netSalary };
}

function buildYearOptions() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1, current + 2];
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-700"}`}>
      {status || "DRAFT"}
    </span>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <h2 className="mt-3 text-2xl font-black text-slate-900">{value}</h2>
    </div>
  );
}

function downloadCsv({ fileName, content }) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PayrollRunView({ mode = "principal" }) {
  const isPrincipal = mode === "principal";
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [run, setRun] = useState(null);
  const [items, setItems] = useState([]);
  const [exists, setExists] = useState(false);
  const [portalUrls, setPortalUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const selectedMonthLabel = MONTHS.find((item) => item.value === Number(month))?.label || month;

  const totals = useMemo(() => {
    return items.reduce(
      (acc, row) => {
        const preview = calculatePreview(row);
        return {
          totalStaff: acc.totalStaff + 1,
          grossTotal: roundMoney(acc.grossTotal + Number(row.monthlySalary || 0)),
          deductionTotal: roundMoney(acc.deductionTotal + preview.totalDeduction),
          netTotal: roundMoney(acc.netTotal + preview.netSalary),
          skippedBankCount: acc.skippedBankCount + (row.bankStatus === "Bank Details Missing" ? 1 : 0),
        };
      },
      { totalStaff: 0, grossTotal: 0, deductionTotal: 0, netTotal: 0, skippedBankCount: 0 }
    );
  }, [items]);

  async function loadPayroll(selectedMonth = month, selectedYear = year) {
    try {
      setLoading(true);
      setMessage("");
      const endpoint = isPrincipal
        ? `/api/payroll-runs?month=${selectedMonth}&year=${selectedYear}`
        : `/api/payroll-runs${selectedMonth && selectedYear ? `?month=${selectedMonth}&year=${selectedYear}` : "?latest=1"}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Unable to load payroll");

      setExists(Boolean(data.exists));
      setRun(data.run || null);
      setItems(data.run?.items || []);
      setPortalUrls(data.portalUrls || {});
      if (data.run?.month && data.run?.year) {
        setMonth(Number(data.run.month));
        setYear(Number(data.run.year));
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    loadPayroll(month, year);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, [field]: value };
        const preview = calculatePreview(updated);
        return {
          ...updated,
          leaveDeduction: preview.leaveDeduction,
          totalDeduction: preview.totalDeduction,
          netSalary: preview.netSalary,
        };
      })
    );
  }

  function inputCell(index, row, field, type = "number") {
    if (!isPrincipal) {
      return <span>{type === "number" ? Number(row[field] || 0) : row[field] || "-"}</span>;
    }

    return (
      <input
        type={type}
        value={row[field] ?? ""}
        onChange={(event) => updateItem(index, field, type === "number" ? Number(event.target.value) : event.target.value)}
        className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-900"
      />
    );
  }

  async function handleGenerate() {
    try {
      if (totals.skippedBankCount > 0) {
        const skipResult = await Swal.fire({
          icon: "warning",
          title: `${totals.skippedBankCount} staff will be skipped from bank CSV`,
          text: "They will remain in the paysheet with Bank Details Missing.",
          showCancelButton: true,
          confirmButtonText: "Continue",
          cancelButtonText: "Review",
        });
        if (!skipResult.isConfirmed) return;
      }

      const confirmTitle = exists
        ? "Payroll already exists for this month. Do you want to regenerate it?"
        : `This will generate payroll for ${selectedMonthLabel} ${year}, lock the paysheet, and download the bank upload file. Continue?`;
      const result = await Swal.fire({
        icon: "question",
        title: confirmTitle,
        showCancelButton: true,
        confirmButtonText: exists ? "Regenerate" : "Generate",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#0f172a",
      });

      if (!result.isConfirmed) return;

      setGenerating(true);
      const response = await fetch("/api/payroll-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          items,
          regenerate: exists,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Unable to generate payroll");

      if (data.csv?.content && data.csv?.fileName) {
        downloadCsv(data.csv);
      }

      setMessage("Payroll generated and bank file downloaded. Login to SBI Corporate/YONO Business and upload this file.");
      setExists(true);
      setRun(data.run);
      setItems(data.run?.items || items);
      await Swal.fire({
        icon: "success",
        title: "Payroll generated",
        text: "Bank file downloaded. Upload it manually in SBI Corporate/YONO Business.",
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (error) {
      setMessage(error.message);
      await Swal.fire({ icon: "error", title: "Payroll failed", text: error.message });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[96rem] pb-24">
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 md:text-3xl">
                  {isPrincipal ? "Principal Payroll" : "Paysheet"}
                </h1>
                <StatusBadge status={run?.status || "DRAFT"} />
              </div>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {selectedMonthLabel} {year}
                {run?.version ? ` • Version ${run.version}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-slate-900"
              >
                {MONTHS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-slate-900"
              >
                {buildYearOptions().map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                onClick={() => loadPayroll(month, year)}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
              >
                Load
              </button>
            </div>
          </div>
        </div>

        {message && <div className="mb-5 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700 shadow-sm">{message}</div>}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard label="Total Staff" value={totals.totalStaff} />
          <SummaryCard label="Gross Salary Total" value={money(totals.grossTotal)} />
          <SummaryCard label="Deduction Total" value={money(totals.deductionTotal)} />
          <SummaryCard label="Net Payable Total" value={money(totals.netTotal)} />
        </div>

        {isPrincipal && (
          <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Upload Salary File to SBI</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  After downloading the bank file, login to SBI Corporate/YONO Business and upload this file manually.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={portalUrls.sbiCorporatePortalUrl || "https://corp.onlinesbi.sbi/corporate/sbi_home.html"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Open SBI Corporate Banking
                </a>
                <a
                  href={portalUrls.yonoBusinessPortalUrl || "https://yonobusiness.sbi/"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Open YONO Business
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black text-slate-900">Payroll Table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1500px]">
              <thead className="bg-primary">
                <tr>
                  {[
                    "Staff Code",
                    "Staff Name",
                    "Designation",
                    "Department",
                    "Monthly Salary",
                    "Total Working Days",
                    "Present Days",
                    "Paid Leave Days",
                    "Unpaid Leave Days",
                    "Advance Deduction",
                    "Other Deduction",
                    "Bonus / Allowance",
                    "Net Salary",
                    "Bank Account Status",
                    "Remarks",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, index) => {
                  const preview = calculatePreview(row);
                  return (
                    <tr key={`${row.staffId || row.id}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.staffCode || "-"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.staffName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.designation || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.department || "-"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">{money(row.monthlySalary)}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "totalWorkingDays")}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "presentDays")}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "paidLeaveDays")}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "unpaidLeaveDays")}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "advanceDeduction")}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "otherDeduction")}</td>
                      <td className="px-4 py-3">{inputCell(index, row, "bonusAllowance")}</td>
                      <td className="px-4 py-3 text-sm font-black text-green-700">{money(preview.netSalary)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            row.bankStatus === "Bank Details Missing"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {row.bankStatus || "Ready"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{inputCell(index, row, "remarks", "text")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading && <div className="p-10 text-center text-sm font-bold text-slate-500">Loading payroll...</div>}
            {!loading && items.length === 0 && (
              <div className="p-10 text-center text-sm font-bold text-slate-500">
                No active staff payroll rows found.
              </div>
            )}
          </div>
        </div>
      </div>

      {isPrincipal && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-[96rem] flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-bold text-slate-700">
              {totals.totalStaff} staff • {money(totals.netTotal)} net payable
              {totals.skippedBankCount > 0 ? ` • ${totals.skippedBankCount} missing bank details` : ""}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || loading || items.length === 0}
              className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Payroll & Download Bank File"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
