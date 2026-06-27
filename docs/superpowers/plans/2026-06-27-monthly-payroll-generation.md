# Monthly Payroll Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real month-specific payroll generation flow backed by active staff salary and bank details, with admin generation, accountant paysheet viewing, audit logs, and dummy SBI CSV download.

**Architecture:** Add focused payroll domain helpers in `lib/payrollRuns.js`, expose them through `pages/api/payroll-runs.js`, and replace the visible payroll UI with shared principal/accountant components. New payroll data lives in `payroll_runs`, `payroll_items`, and `payroll_audit_logs`; the existing dummy `payroll` table is left untouched for older report queries.

**Tech Stack:** Next.js Pages Router, React, PostgreSQL via `pg`, SweetAlert2, Node built-in `node:test` for helper tests.

---

## File Structure

- Create `lib/payrollRuns.js`: payroll calculations, validation, CSV generation, table creation, DB queries, and persistence helpers.
- Create `test/payrollRuns.test.mjs`: focused tests for calculation, validation, totals, days-in-month, and CSV skipping.
- Create `pages/api/payroll-runs.js`: role-aware API for loading drafts/latest runs and generating/regenerating payroll.
- Create `components/payroll/PayrollRunView.jsx`: shared payroll UI for editable principal mode and read-only accountant mode.
- Replace `pages/payroll.jsx`: route user to principal or accountant experience based on role.
- Create `pages/principal/payroll.jsx`: admin/super-admin payroll generation route.
- Create `pages/accountant/paysheet.jsx`: accountant paysheet route.
- Modify `lib/permissions.js`: add `/principal/payroll` and `/accountant/paysheet` access rules.
- Modify `components/Sidebar.js`: point admin payroll to `/principal/payroll` and accountant payroll to `/accountant/paysheet`.
- Modify `pages/_app.js`: titles for new payroll routes.
- Modify `package.json`: add `test:payroll` script.

## Task 1: Payroll Helper Tests

**Files:**
- Create: `test/payrollRuns.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a payroll test script**

Add this script to `package.json`:

```json
"test:payroll": "node --test test/payrollRuns.test.mjs"
```

- [ ] **Step 2: Write failing helper tests**

Create tests that import helpers from `lib/payrollRuns.js` and assert:

```js
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
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
npm run test:payroll
```

Expected: fails because `lib/payrollRuns.js` does not exist.

## Task 2: Payroll Helper Implementation

**Files:**
- Create: `lib/payrollRuns.js`
- Test: `test/payrollRuns.test.mjs`

- [ ] **Step 1: Implement helper exports**

Implement `daysInPayrollMonth`, `normalizePayrollInput`, `validatePayrollItem`, `calculatePayrollItem`, `calculatePayrollTotals`, and `generateSbiCsv`.

- [ ] **Step 2: Run helper tests**

Run:

```bash
npm run test:payroll
```

Expected: all payroll helper tests pass.

## Task 3: Payroll Run API

**Files:**
- Modify: `lib/payrollRuns.js`
- Create: `pages/api/payroll-runs.js`

- [ ] **Step 1: Add DB helpers**

Add functions to create tables, load the latest run, build a draft from active staff, and save a generated run inside a transaction.

- [ ] **Step 2: Add API handler**

Create `pages/api/payroll-runs.js` with:

- `GET ?month=&year=` for selected month draft/existing run.
- `GET ?latest=1` for latest generated run.
- `POST` for admin/super-admin generation and regeneration.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: pass.

## Task 4: Payroll UI

**Files:**
- Create: `components/payroll/PayrollRunView.jsx`
- Replace: `pages/payroll.jsx`
- Create: `pages/principal/payroll.jsx`
- Create: `pages/accountant/paysheet.jsx`
- Modify: `lib/permissions.js`
- Modify: `components/Sidebar.js`
- Modify: `pages/_app.js`

- [ ] **Step 1: Build shared payroll view**

Create one shared component that supports `mode="principal"` with editable table and generation button, and `mode="accountant"` with read-only table.

- [ ] **Step 2: Wire role routes**

Use `withAuthPage` to restrict principal route to `ADMIN` and `SUPER_ADMIN`, and accountant route to `ACCOUNTANT`, `ADMIN`, and `SUPER_ADMIN`.

- [ ] **Step 3: Update navigation**

Admin payroll link points to `/principal/payroll`. Accountant payroll link points to `/accountant/paysheet`.

- [ ] **Step 4: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass.

## Task 5: Manual Runtime Check

**Files:**
- No new files unless runtime bugs are found.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

- [ ] **Step 2: Verify routes respond**

Check:

```bash
curl -I http://localhost:3000/principal/payroll
curl -I http://localhost:3000/accountant/paysheet
```

Expected: routes respond with redirect/login or page HTML depending on auth state, not a 500.

- [ ] **Step 3: Final verification**

Run:

```bash
npm run test:payroll
npm run lint
npm run build
```

Expected: all pass.
