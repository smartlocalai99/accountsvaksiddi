import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePayrollItem,
  calculatePayrollTotals,
  daysInPayrollMonth,
  generateSbiCsv,
  normalizePayrollInput,
  validatePayrollItem,
} from "../lib/payrollRuns.js";

test("daysInPayrollMonth returns calendar days for selected month", () => {
  assert.equal(daysInPayrollMonth(2, 2024), 29);
  assert.equal(daysInPayrollMonth(2, 2025), 28);
  assert.equal(daysInPayrollMonth(6, 2026), 30);
});

test("calculatePayrollItem recalculates net salary from server inputs", () => {
  const item = calculatePayrollItem({
    staffId: 1,
    staffCode: "T001",
    staffName: "Teacher One",
    designation: "Teacher",
    department: "Primary",
    monthlySalary: 30000,
    totalWorkingDays: 30,
    presentDays: 28,
    paidLeaveDays: 0,
    unpaidLeaveDays: 2,
    advanceDeduction: 500,
    otherDeduction: 250,
    bonusAllowance: 1000,
    accountName: "Teacher One",
    bankName: "SBI",
    accountNumber: "1234567890",
    ifscCode: "SBIN0001234",
    upiId: "",
    remarks: "June salary",
  });

  assert.equal(item.leaveDeduction, 2000);
  assert.equal(item.totalDeduction, 2750);
  assert.equal(item.netSalary, 28250);
  assert.equal(item.bankStatus, "Ready");
});

test("validatePayrollItem rejects invalid attendance and negative money", () => {
  const base = normalizePayrollInput({
    staffId: 1,
    staffName: "Teacher One",
    monthlySalary: 30000,
    totalWorkingDays: 30,
    presentDays: 31,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    advanceDeduction: -1,
    otherDeduction: 0,
    bonusAllowance: 0,
  });

  const errors = validatePayrollItem(base);
  assert.ok(errors.includes("Present days cannot be greater than total working days."));
  assert.ok(errors.includes("Advance deduction cannot be negative."));
});

test("calculatePayrollTotals sums gross deductions net and skipped bank rows", () => {
  const totals = calculatePayrollTotals([
    { monthlySalary: 30000, totalDeduction: 2750, netSalary: 28250, bankStatus: "Ready" },
    { monthlySalary: 20000, totalDeduction: 1000, netSalary: 19000, bankStatus: "Bank Details Missing" },
  ]);

  assert.deepEqual(totals, {
    totalStaff: 2,
    grossTotal: 50000,
    deductionTotal: 3750,
    netTotal: 47250,
    skippedBankCount: 1,
  });
});

test("generateSbiCsv includes ready bank rows and skips missing bank details", () => {
  const csv = generateSbiCsv({
    month: 6,
    year: 2026,
    items: [
      {
        staffCode: "T001",
        staffName: "Teacher One",
        accountNumber: "1234567890",
        ifscCode: "SBIN0001234",
        netSalary: 28250,
        bankStatus: "Ready",
      },
      {
        staffCode: "T002",
        staffName: "Teacher Two",
        accountNumber: "",
        ifscCode: "",
        netSalary: 19000,
        bankStatus: "Bank Details Missing",
      },
    ],
  });

  assert.equal(csv.fileName, "sbi_salary_upload_6_2026.csv");
  assert.equal(csv.skippedCount, 1);
  assert.match(csv.content, /Beneficiary Name,Account Number,IFSC Code,Amount,Payment Mode,Narration,Staff Code/);
  assert.match(csv.content, /Teacher One,1234567890,SBIN0001234,28250.00,NEFT,Salary June 2026,T001/);
  assert.doesNotMatch(csv.content, /Teacher Two/);
});
