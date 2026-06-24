import { getUserFromRequest } from "@/lib/auth";
import {
  changeRequestPool,
  ensureChangeRequestsTable,
  isAdminRole,
} from "@/lib/changeRequests";

export default async function handler(req, res) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    await ensureChangeRequestsTable();

    if (req.method === "GET") {
      const params = [];
      const conditions = [];

      if (!isAdminRole(user.role)) {
        params.push(user.id);
        conditions.push(`cr.requested_by = $${params.length}`);
      }

      if (req.query.status && req.query.status !== "ALL") {
        params.push(String(req.query.status).toUpperCase());
        conditions.push(`cr.status = $${params.length}`);
      }

      const result = await changeRequestPool.query(
        `
          SELECT
            cr.*,
            requester.username AS requested_by_name,
            reviewer.username AS reviewed_by_name
          FROM public.ledger_change_requests cr
          JOIN public."Login_accounts" requester ON requester.id = cr.requested_by
          LEFT JOIN public."Login_accounts" reviewer ON reviewer.id = cr.reviewed_by
          ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
          ORDER BY
            CASE WHEN cr.status = 'PENDING' THEN 0 ELSE 1 END,
            cr.requested_at DESC
        `,
        params
      );

      return res.status(200).json({ success: true, requests: result.rows });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    if (String(user.role).toUpperCase() !== "ACCOUNTANT") {
      return res.status(403).json({
        success: false,
        error: "Only accountants submit change requests",
      });
    }

    const { ledger_type, record_id, proposed_data, reason } = req.body || {};
    const ledgerType = String(ledger_type || "").toUpperCase();
    const recordId = Number(record_id);

    if (!["FEE", "EXPENSE"].includes(ledgerType) || !recordId || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Ledger type, record, proposed change, and reason are required",
      });
    }

    let originalResult;
    let normalizedProposal;

    if (ledgerType === "FEE") {
      originalResult = await changeRequestPool.query(
        `SELECT id, amount_paid FROM public.fee_payments WHERE id = $1`,
        [recordId]
      );
      normalizedProposal = { amount_paid: Number(proposed_data?.amount_paid) };

      if (!Number.isFinite(normalizedProposal.amount_paid) || normalizedProposal.amount_paid <= 0) {
        return res.status(400).json({ success: false, error: "Valid fee amount is required" });
      }
    } else {
      originalResult = await changeRequestPool.query(
        `SELECT id, date, title, category, amount, notes FROM public.expenses WHERE id = $1`,
        [recordId]
      );
      normalizedProposal = {
        date: proposed_data?.date,
        title: String(proposed_data?.title || "").trim(),
        category: String(proposed_data?.category || "").trim(),
        amount: Number(proposed_data?.amount),
        notes: String(proposed_data?.notes || "").trim(),
      };

      if (
        !normalizedProposal.date ||
        !normalizedProposal.title ||
        !normalizedProposal.category ||
        !Number.isFinite(normalizedProposal.amount) ||
        normalizedProposal.amount <= 0
      ) {
        return res.status(400).json({ success: false, error: "Valid expense details are required" });
      }
    }

    if (!originalResult.rows[0]) {
      return res.status(404).json({ success: false, error: "Ledger record not found" });
    }

    const result = await changeRequestPool.query(
      `
        INSERT INTO public.ledger_change_requests (
          ledger_type, record_id, original_data, proposed_data, reason, requested_by
        ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
        RETURNING *
      `,
      [
        ledgerType,
        recordId,
        JSON.stringify(originalResult.rows[0]),
        JSON.stringify(normalizedProposal),
        reason.trim(),
        user.id,
      ]
    );

    return res.status(201).json({ success: true, request: result.rows[0] });
  } catch (error) {
    const message =
      error.code === "23505"
        ? "A pending request already exists for this ledger record"
        : error.message;
    return res.status(500).json({ success: false, error: message });
  }
}
