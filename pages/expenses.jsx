import { useEffect, useMemo, useState } from "react";
import {
  FaReceipt,
  FaPlus,
  FaRupeeSign,
  FaTags,
  FaCalendarAlt,
} from "react-icons/fa";
import PaginationControls from "@/components/PaginationControls";
import { withAuthPage } from "@/lib/withAuthPage";
import Swal from "sweetalert2";

export const getServerSideProps = withAuthPage({ path: "/expenses" });

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm = {
  date: getToday(),
  title: "",
  category: "",
  amount: "",
  notes: "",
};

const expenseCategories = [
  "Petty Cash",
  "Electricity",
  "Stationery",
  "Maintenance",
  "Cleaning Supplies",
  "Transport",
  "Exam Expenses",
  "Events",
  "Staff Welfare",
  "Internet / Phone",
  "Miscellaneous",
  "Others",
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function ExpensesPage({ user }) {
  const [form, setForm] = useState(initialForm);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expensePage, setExpensePage] = useState(1);

  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  const expensePageSize = 6;
  const expenseTotalPages = Math.max(
    1,
    Math.ceil(expenses.length / expensePageSize)
  );

  const paginatedExpenses = useMemo(
    () =>
      expenses.slice(
        (expensePage - 1) * expensePageSize,
        expensePage * expensePageSize
      ),
    [expenses, expensePage]
  );

  async function fetchExpenses() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load expenses");
      }

      setExpenses(data.expenses || []);
    } catch (fetchError) {
      setError(fetchError.message || "Unable to load expenses");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (expensePage > expenseTotalPages) {
      setExpensePage(1);
    }
  }, [expensePage, expenseTotalPages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function addExpense(event) {
    event.preventDefault();

    if (!form.title || !form.category || !form.amount) {
      setError("Please fill title, category, and amount.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to save expense");
      }

      setForm({
        ...initialForm,
        date: getToday(),
      });

      await fetchExpenses();
    } catch (saveError) {
      setError(saveError.message || "Unable to save expense");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      ...initialForm,
      date: getToday(),
    });
    setError("");
  }

  async function changeExpense(item) {
    const amountResult = await Swal.fire({
      title: "Correct expense amount",
      text: `${item.title} · ${item.category}`,
      input: "number",
      inputValue: String(item.amount),
      inputAttributes: { min: "1", step: "0.01" },
      showCancelButton: true,
      confirmButtonText: "Continue",
      inputValidator: (value) =>
        !Number.isFinite(Number(value)) || Number(value) <= 0
          ? "Enter a valid amount"
          : undefined,
    });
    if (!amountResult.isConfirmed) return;
    const numericAmount = Number(amountResult.value);

    const proposedData = { ...item, amount: numericAmount };
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(
      String(user?.role || "").toUpperCase()
    );

    if (isAdmin) {
      const response = await fetch(`/api/expenses?id=${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposedData),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        await Swal.fire("Update failed", data.error || "Unable to update expense.", "error");
        return;
      }

      await Swal.fire("Updated", "Expense updated successfully.", "success");
      await fetchExpenses();
      return;
    }

    const reasonResult = await Swal.fire({
      title: "Request expense correction",
      input: "textarea",
      inputLabel: "Reason for the change",
      inputPlaceholder: "Explain why this expense should be corrected...",
      showCancelButton: true,
      confirmButtonText: "Submit request",
      inputValidator: (value) => (!value?.trim() ? "Reason is required" : undefined),
    });
    if (!reasonResult.isConfirmed) return;

    const response = await fetch("/api/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ledger_type: "EXPENSE",
        record_id: item.id,
        proposed_data: proposedData,
        reason: reasonResult.value,
      }),
    });
    const data = await response.json();
    await Swal.fire(
      response.ok && data.success ? "Request submitted" : "Request failed",
      response.ok && data.success
        ? "The expense correction is pending admin approval."
        : data.error || "Unable to submit request.",
      response.ok && data.success ? "success" : "error"
    );
    if (response.ok && data.success) await fetchExpenses();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Expenses Entry
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">
                Record school expenses
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Enter school expense details from real bills and vouchers.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={FaRupeeSign}
                label="Total spend"
                value={formatCurrency(totalExpense)}
              />
              <StatCard icon={FaReceipt} label="Entries" value={expenses.length} />
              <StatCard
                icon={FaTags}
                label="Categories"
                value={new Set(expenses.map((item) => item.category)).size}
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form
            onSubmit={addExpense}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-[#08516d]/10 p-3 text-[#08516d]">
                <FaPlus />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  New expense
                </h2>
                <p className="text-sm text-slate-500">
                  Enter amount, category, date, and notes.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Date" icon={FaCalendarAlt}>
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
                />
              </Field>

              <Field label="Amount" icon={FaRupeeSign}>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="Amount"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
                />
              </Field>

              <Field label="Title" icon={FaReceipt} className="sm:col-span-2">
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Expense title"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
                />
              </Field>

              <Field label="Category" icon={FaTags}>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Select category</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Notes" icon={FaReceipt} className="sm:col-span-2">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Optional notes"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
                />
              </Field>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
              >
                <FaPlus /> {loading ? "Saving..." : "Save expense"}
              </button>
            </div>
          </form>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Recent expenses
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Expense history
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {paginatedExpenses.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.category} • {item.date}
                      </p>
                    </div>
                    <p className="text-lg font-black text-red-700">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>

                  {item.notes ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.notes}
                    </p>
                  ) : null}

                  {item.pending_change_request_id ? (
                    <span className="mt-4 inline-flex rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
                      Change pending
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => changeExpense(item)}
                      className="mt-4 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {String(user?.role || "").toUpperCase() === "ACCOUNTANT"
                        ? "Request change"
                        : "Edit expense"}
                    </button>
                  )}

                </div>
              ))}

              {!loading && expenses.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No expenses recorded yet.
                </div>
              )}

              {loading && expenses.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  Loading expenses...
                </div>
              )}
            </div>

            <PaginationControls
              currentPage={expensePage}
              totalPages={expenseTotalPages}
              totalItems={expenses.length}
              pageSize={expensePageSize}
              label="expenses"
              onPageChange={setExpensePage}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <span className="rounded-2xl bg-white p-3 text-[#08516d] shadow-sm">
          <Icon />
        </span>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        <Icon className="text-slate-300" />
        {label}
      </span>
      {children}
    </label>
  );
}
