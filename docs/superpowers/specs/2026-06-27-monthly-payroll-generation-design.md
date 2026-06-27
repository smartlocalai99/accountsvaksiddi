# Monthly Payroll Generation Design

## Goal

Build a production-ready, month-specific payroll generation flow for the school ERP using real active staff records, salary values, and bank details from the staff module.

## Roles

Principal means existing `ADMIN` and `SUPER_ADMIN` users. These roles can generate payroll, regenerate an existing month, download the dummy SBI bank CSV, and see SBI upload instructions.

`ACCOUNTANT` users can view the paysheet and status, filter by month/year, and cannot generate payroll or download the bank file.

## Routes

The visible payroll experience will become the new run-based payroll flow because the current payroll screen is dummy data.

- `/payroll`: principal/admin payroll generation page for admin roles, and accountant paysheet for accountant role.
- `/principal/payroll`: same principal payroll generation page for `ADMIN` and `SUPER_ADMIN`.
- `/accountant/paysheet`: read-only paysheet page for `ACCOUNTANT`, also viewable by admin roles.

The old `public.payroll` table stays in place so existing reports, transactions, and cash/bank code do not break. New month-specific payroll uses new tables.

## Data Model

Create safe tables if they do not exist:

- `payroll_runs`: one generated payroll run per month/year/version, with status, totals, generated user/role, skipped bank count, bank filename, and timestamps.
- `payroll_items`: one saved row per staff member in a payroll run, including salary inputs, server-calculated salary outputs, bank snapshot, bank status, and remarks.
- `payroll_audit_logs`: append-only audit trail for generation, regeneration, and status changes.

Regeneration preserves history by marking the latest existing run for the month/year as `REGENERATED` and creating a new run with `version = previous version + 1`.

## Principal Flow

The principal page includes month and year selectors, status badge, summary cards, an SBI upload help card, editable payroll table, and a sticky bottom action bar.

When a month/year is selected:

1. If a payroll run exists, load the latest version and its items.
2. If no run exists, load all active staff with monthly salary and bank details.
3. Default table values are created client-side for fast editing:
   - `totalWorkingDays` = days in selected month
   - `presentDays` = total working days
   - `paidLeaveDays` = 0
   - `unpaidLeaveDays` = 0
   - `advanceDeduction` = 0
   - `otherDeduction` = 0
   - `bonusAllowance` = 0

The principal can edit payroll inputs directly in the table. Net salary is previewed immediately, but it is recalculated on the server during generation.

## Accountant Flow

The accountant page loads the latest paysheet by default. Month/year filters allow viewing a specific run. The page shows status, total staff, gross salary total, deduction total, net payable total, and the paysheet table.

Accountants cannot generate payroll, regenerate payroll, or download the bank CSV.

## Salary Calculation

The backend never trusts frontend salary calculations.

For each item:

```txt
perDaySalary = monthlySalary / totalWorkingDays
leaveDeduction = perDaySalary * unpaidLeaveDays
totalDeduction = leaveDeduction + advanceDeduction + otherDeduction
netSalary = monthlySalary - totalDeduction + bonusAllowance
```

All salary values are rounded to 2 decimals.

## Validation

Backend validation blocks generation when:

- Month or year is missing.
- `totalWorkingDays` is not greater than 0.
- `presentDays` is greater than `totalWorkingDays`.
- Leave days are negative.
- Deductions are negative.
- Bonus is negative.
- Net salary is negative.

Staff missing account number or IFSC are included in the paysheet with `Bank Details Missing` and skipped from the dummy SBI CSV. The principal receives a warning before continuing if any staff will be skipped.

## Bank CSV

After confirmation, the backend saves the run, saves items, writes an audit log, marks the run as `BANK_FILE_GENERATED`, and returns a dummy SBI CSV for immediate download.

CSV columns:

- Beneficiary Name
- Account Number
- IFSC Code
- Amount
- Payment Mode
- Narration
- Staff Code

Payment mode is `NEFT`. Narration is `Salary {Month} {Year}`.

Filename format:

```txt
sbi_salary_upload_{month}_{year}.csv
```

The CSV generation code must include:

```js
// TODO: Replace dummy CSV headers and format with exact SBI corporate salary bulk upload format after client/bank confirms.
```

The SBI portal card uses configurable environment variables:

- `SBI_CORPORATE_PORTAL_URL`
- `YONO_BUSINESS_PORTAL_URL`

Safe public fallback URLs are used when the variables are not set.

No SBI credentials, OTPs, tokens, usernames, passwords, or sessions are stored.

## Statuses

Supported payroll run statuses:

- `DRAFT`
- `BANK_FILE_GENERATED`
- `READY_FOR_SBI_UPLOAD`
- `UPLOADED_TO_SBI`
- `PAID`
- `PARTIALLY_PAID`
- `FAILED`
- `REGENERATED`

The generation button sets the new run to `BANK_FILE_GENERATED`.

## API Shape

Add a new API route at `pages/api/payroll-runs.js`.

Supported operations:

- `GET /api/payroll-runs?month=6&year=2026`: return latest run for selected month/year if present, otherwise return a draft built from active staff.
- `GET /api/payroll-runs?latest=1`: return the latest generated run for accountant default view.
- `POST /api/payroll-runs`: validate role, validate payload, recalculate salaries, handle regeneration, save run/items/audit logs, and return CSV content plus saved run.

## UI Components

Create focused payroll UI helpers/components where useful so `pages/payroll.jsx`, `pages/principal/payroll.jsx`, and `pages/accountant/paysheet.jsx` do not duplicate large blocks of code.

The UI should be practical and dense, with direct table editing and a sticky action bar to keep clicks low.

## Testing

Add testable backend helper functions for:

- Days in selected month.
- Payroll item calculation and validation.
- Run totals.
- Dummy SBI CSV generation and skipping missing bank details.

Use test-first implementation for these helpers. Then run lint and production build.
