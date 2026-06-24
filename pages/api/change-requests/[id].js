import { getUserFromRequest } from "@/lib/auth";
import {
  changeRequestPool,
  ensureChangeRequestsTable,
  isAdminRole,
} from "@/lib/changeRequests";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const user = await getUserFromRequest(req);

  if (!user || !isAdminRole(user.role)) {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }

  const action = String(req.body?.action || "").toUpperCase();
  const requestId = Number(req.query.id);

  if (!requestId || !["APPROVE", "REJECT"].includes(action)) {
    return res.status(400).json({ success: false, error: "Valid action is required" });
  }

  const client = await changeRequestPool.connect();

  try {
    await client.query("BEGIN");
    await ensureChangeRequestsTable(client);

    const requestResult = await client.query(
      `SELECT * FROM public.ledger_change_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );
    const changeRequest = requestResult.rows[0];

    if (!changeRequest) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    if (changeRequest.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, error: "Request is already reviewed" });
    }

    if (action === "APPROVE") {
      const proposed = changeRequest.proposed_data;

      if (changeRequest.ledger_type === "FEE") {
        await client.query(
          `UPDATE public.fee_payments SET amount_paid = $1 WHERE id = $2`,
          [Number(proposed.amount_paid), changeRequest.record_id]
        );
      } else {
        await client.query(
          `
            UPDATE public.expenses
            SET date = $1, title = $2, category = $3, amount = $4, notes = $5
            WHERE id = $6
          `,
          [
            proposed.date,
            proposed.title,
            proposed.category,
            Number(proposed.amount),
            proposed.notes || null,
            changeRequest.record_id,
          ]
        );
      }
    }

    const result = await client.query(
      `
        UPDATE public.ledger_change_requests
        SET status = $1, reviewed_by = $2, review_note = $3, reviewed_at = NOW()
        WHERE id = $4
        RETURNING *
      `,
      [
        action === "APPROVE" ? "APPROVED" : "REJECTED",
        user.id,
        String(req.body?.review_note || "").trim() || null,
        requestId,
      ]
    );

    await client.query("COMMIT");
    return res.status(200).json({ success: true, request: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}
