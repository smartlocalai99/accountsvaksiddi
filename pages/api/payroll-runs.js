import { getUserFromRequest } from "@/lib/auth";
import {
  buildPayrollDraft,
  getLatestPayrollRun,
  getPayrollRunOrDraft,
  getPortalUrls,
  saveGeneratedPayrollRun,
} from "@/lib/payrollRuns";
import { normalizeRole, ROLES } from "@/lib/permissions";

const PRINCIPAL_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
const VIEW_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]);

function isPrincipal(role) {
  return PRINCIPAL_ROLES.has(normalizeRole(role));
}

function canView(role) {
  return VIEW_ROLES.has(normalizeRole(role));
}

function toMonthYear(query) {
  const month = Number(query.month);
  const year = Number(query.year);
  return { month, year };
}

export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (req.method === "GET") {
      if (!canView(user.role)) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }

      if (req.query.latest === "1") {
        const latest = await getLatestPayrollRun();
        if (latest) {
          return res.status(200).json({
            success: true,
            exists: true,
            run: latest,
            portalUrls: getPortalUrls(),
          });
        }

        const today = new Date();
        const draft = await buildPayrollDraft({
          month: today.getMonth() + 1,
          year: today.getFullYear(),
        });
        return res.status(200).json({ success: true, ...draft });
      }

      const { month, year } = toMonthYear(req.query);
      if (!month || !year) {
        return res.status(400).json({
          success: false,
          error: "Month and year are required.",
        });
      }

      const result = await getPayrollRunOrDraft({ month, year });
      return res.status(200).json({ success: true, ...result });
    }

    if (req.method === "POST") {
      if (!isPrincipal(user.role)) {
        return res.status(403).json({
          success: false,
          error: "Only principal/admin users can generate payroll.",
        });
      }

      const { month, year, items, regenerate } = req.body || {};
      const result = await saveGeneratedPayrollRun({
        month,
        year,
        items,
        user,
        regenerate: Boolean(regenerate),
      });

      return res.status(201).json({
        success: true,
        ...result,
      });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || "Payroll request failed.",
      existingRun: error.existingRun || null,
    });
  }
}
