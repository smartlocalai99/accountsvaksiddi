import { query } from "@/lib/db";

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
}

function toIntegerOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    school_name: row.school_name || "",
    school_code: row.school_code || "",
    established_year: row.established_year ?? "",
    academic_year: row.academic_year || "",
    principal_name: row.principal_name || "",
    contact_number: row.contact_number || "",
    email: row.email || "",
    school_logo: row.school_logo || "",
    admission_number_prefix: row.admission_number_prefix || "",
    account_name: row.account_name || "",
    bank_name: row.bank_name || "",
    branch_name: row.branch_name || "",
    account_number: row.account_number || "",
    ifsc_code: row.ifsc_code || "",
    upi_id: row.upi_id || "",
    qr_code_image: row.qr_code_image || "",
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await query(
        `SELECT * FROM public.school_settings ORDER BY id ASC LIMIT 1`,
        []
      );

      return res.status(200).json({ success: true, data: mapRow(result.rows[0]) });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const currentResult = await query(
        `SELECT id FROM public.school_settings ORDER BY id ASC LIMIT 1`,
        []
      );

      const currentId = currentResult.rows[0]?.id || null;

      const values = [
        normalizeValue(body.school_name),
        normalizeValue(body.school_code),
        toIntegerOrNull(body.established_year),
        normalizeValue(body.academic_year),
        normalizeValue(body.principal_name),
        normalizeValue(body.contact_number),
        normalizeValue(body.email),
        normalizeValue(body.school_logo),
        normalizeValue(body.admission_number_prefix),
        normalizeValue(body.account_name),
        normalizeValue(body.bank_name),
        normalizeValue(body.branch_name),
        normalizeValue(body.account_number),
        normalizeValue(body.ifsc_code),
        normalizeValue(body.upi_id),
        normalizeValue(body.qr_code_image),
      ];

      let result;

      if (currentId) {
        result = await query(
          `
            UPDATE public.school_settings
            SET
              school_name = $1,
              school_code = $2,
              established_year = $3,
              academic_year = $4,
              principal_name = $5,
              contact_number = $6,
              email = $7,
              school_logo = $8,
              admission_number_prefix = $9,
              account_name = $10,
              bank_name = $11,
              branch_name = $12,
              account_number = $13,
              ifsc_code = $14,
              upi_id = $15,
              qr_code_image = $16,
              updated_at = NOW()
            WHERE id = $17
            RETURNING *
          `,
          [...values, currentId]
        );
      } else {
        result = await query(
          `
            INSERT INTO public.school_settings (
              school_name,
              school_code,
              established_year,
              academic_year,
              principal_name,
              contact_number,
              email,
              school_logo,
              admission_number_prefix,
              account_name,
              bank_name,
              branch_name,
              account_number,
              ifsc_code,
              upi_id,
              qr_code_image,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
            )
            RETURNING *
          `,
          values
        );
      }

      return res.status(200).json({ success: true, data: mapRow(result.rows[0]) });
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("School settings API Error:", error);
    return res.status(500).json({ success: false, message: "Failed to save school settings", error: error.message });
  }
}
