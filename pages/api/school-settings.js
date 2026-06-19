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

async function ensureSchoolSettingsColumns() {
  await query(
    `
      ALTER TABLE public.school_settings
        ADD COLUMN IF NOT EXISTS school_address TEXT,
        ADD COLUMN IF NOT EXISTS letterhead_logo TEXT,
        ADD COLUMN IF NOT EXISTS letterhead_school_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS letterhead_address TEXT
    `,
    []
  );
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    school_name: row.school_name || "",
    school_code: row.school_code || "",
    school_address: row.school_address || "",
    established_year: row.established_year ?? "",
    academic_year: row.academic_year || "",
    principal_name: row.principal_name || "",
    contact_number: row.contact_number || "",
    email: row.email || "",
    school_logo: row.school_logo || "",
    letterhead_logo: row.letterhead_logo || "",
    letterhead_school_name: row.letterhead_school_name || "",
    letterhead_address: row.letterhead_address || "",
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
    await ensureSchoolSettingsColumns();

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
        normalizeValue(body.school_address),
        toIntegerOrNull(body.established_year),
        normalizeValue(body.academic_year),
        normalizeValue(body.principal_name),
        normalizeValue(body.contact_number),
        normalizeValue(body.email),
        normalizeValue(body.school_logo),
        normalizeValue(body.letterhead_logo),
        normalizeValue(body.letterhead_school_name),
        normalizeValue(body.letterhead_address),
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
              school_address = $3,
              established_year = $4,
              academic_year = $5,
              principal_name = $6,
              contact_number = $7,
              email = $8,
              school_logo = $9,
              letterhead_logo = $10,
              letterhead_school_name = $11,
              letterhead_address = $12,
              admission_number_prefix = $13,
              account_name = $14,
              bank_name = $15,
              branch_name = $16,
              account_number = $17,
              ifsc_code = $18,
              upi_id = $19,
              qr_code_image = $20,
              updated_at = NOW()
            WHERE id = $21
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
              school_address,
              established_year,
              academic_year,
              principal_name,
              contact_number,
              email,
              school_logo,
              letterhead_logo,
              letterhead_school_name,
              letterhead_address,
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
              $9, $10, $11, $12, $13, $14, $15, $16,
              $17, $18, $19, $20, NOW(), NOW()
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
