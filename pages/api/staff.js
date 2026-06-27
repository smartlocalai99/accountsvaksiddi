import { Pool } from "pg";

const pool =
  global.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.pgPool) {
  global.pgPool = pool;
}

function parseMoney(value) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT
          id,
          staff_code,
          full_name,
          gender,
          date_of_birth,
          age,
          blood_group,
          mobile,
          alternate_mobile,
          email,
          address,
          aadhar_last4,
          pan_number,
          staff_type,
          designation,
          department,
          subject,
          classes_handling,
          qualification,
          experience_years,
          joining_date,
          employment_type,
          salary_type,
          monthly_salary,
          work_status,
          photo_url,
          bank_account_name,
          bank_name,
          bank_branch,
          bank_account_number,
          ifsc_code,
          upi_id,
          has_login_access,
          login_account_id,
          emergency_contact_name,
          emergency_contact_mobile,
          notes,
          created_at
        FROM public.staff
        ORDER BY id DESC
      `);

      return res.status(200).json({
        success: true,
        staff: result.rows,
      });
    }

    if (req.method === "POST") {
      const {
        staff_code,
        full_name,
        gender,
        date_of_birth,
        age,
        blood_group,
        mobile,
        alternate_mobile,
        email,
        address,
        aadhar_last4,
        pan_number,
        photo_url,
        staff_type,
        designation,
        department,
        subject,
        classes_handling,
        qualification,
        experience_years,
        joining_date,
        employment_type,
        salary_type,
        monthly_salary,
        work_status,
        bank_account_name,
        bank_name,
        bank_branch,
        bank_account_number,
        ifsc_code,
        upi_id,
        has_login_access,
        login_account_id,
        emergency_contact_name,
        emergency_contact_mobile,
        notes,
      } = req.body;

      if (!full_name) {
        return res.status(400).json({
          success: false,
          error: "Staff full name is required",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO public.staff (
          staff_code,
          full_name,
          gender,
          date_of_birth,
          age,
          blood_group,
          mobile,
          alternate_mobile,
          email,
          address,
          aadhar_last4,
          pan_number,
          photo_url,
          staff_type,
          designation,
          department,
          subject,
          classes_handling,
          qualification,
          experience_years,
          joining_date,
          employment_type,
          salary_type,
          monthly_salary,
          work_status,
          bank_account_name,
          bank_name,
          bank_branch,
          bank_account_number,
          ifsc_code,
          upi_id,
          has_login_access,
          login_account_id,
          emergency_contact_name,
          emergency_contact_mobile,
          notes
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,$35,$36
        )
        RETURNING *
        `,
        [
          staff_code || null,
          full_name,
          gender || null,
          date_of_birth || null,
          parseOptionalNumber(age),
          blood_group || null,
          mobile || null,
          alternate_mobile || null,
          email || null,
          address || null,
          aadhar_last4 || null,
          pan_number || null,
          photo_url || null,
          staff_type || "Teaching",
          designation || null,
          department || null,
          subject || null,
          classes_handling || null,
          qualification || null,
          parseOptionalNumber(experience_years),
          joining_date || null,
          employment_type || "Permanent",
          salary_type || "Monthly",
          parseMoney(monthly_salary),
          work_status || "Active",
          bank_account_name || null,
          bank_name || null,
          bank_branch || null,
          bank_account_number || null,
          ifsc_code || null,
          upi_id || null,
          has_login_access || false,
          login_account_id || null,
          emergency_contact_name || null,
          emergency_contact_mobile || null,
          notes || null,
        ]
      );

      return res.status(201).json({
        success: true,
        staff: result.rows[0],
      });
    }

    if (req.method === "PUT") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Staff id is required",
        });
      }

      const {
        staff_code,
        full_name,
        gender,
        date_of_birth,
        age,
        blood_group,
        mobile,
        alternate_mobile,
        email,
        address,
        aadhar_last4,
        pan_number,
        photo_url,
        staff_type,
        designation,
        department,
        subject,
        classes_handling,
        qualification,
        experience_years,
        joining_date,
        employment_type,
        salary_type,
        monthly_salary,
        work_status,
        bank_account_name,
        bank_name,
        bank_branch,
        bank_account_number,
        ifsc_code,
        upi_id,
        has_login_access,
        login_account_id,
        emergency_contact_name,
        emergency_contact_mobile,
        notes,
      } = req.body;

      if (!full_name) {
        return res.status(400).json({
          success: false,
          error: "Staff full name is required",
        });
      }

      const result = await pool.query(
        `
        UPDATE public.staff
        SET
          staff_code = $1,
          full_name = $2,
          gender = $3,
          date_of_birth = $4,
          age = $5,
          blood_group = $6,
          mobile = $7,
          alternate_mobile = $8,
          email = $9,
          address = $10,
          aadhar_last4 = $11,
          pan_number = $12,
          photo_url = $13,
          staff_type = $14,
          designation = $15,
          department = $16,
          subject = $17,
          classes_handling = $18,
          qualification = $19,
          experience_years = $20,
          joining_date = $21,
          employment_type = $22,
          salary_type = $23,
          monthly_salary = $24,
          work_status = $25,
          bank_account_name = $26,
          bank_name = $27,
          bank_branch = $28,
          bank_account_number = $29,
          ifsc_code = $30,
          upi_id = $31,
          has_login_access = $32,
          login_account_id = $33,
          emergency_contact_name = $34,
          emergency_contact_mobile = $35,
          notes = $36,
          updated_at = NOW()
        WHERE id = $37
        RETURNING *
        `,
        [
          staff_code || null,
          full_name,
          gender || null,
          date_of_birth || null,
          parseOptionalNumber(age),
          blood_group || null,
          mobile || null,
          alternate_mobile || null,
          email || null,
          address || null,
          aadhar_last4 || null,
          pan_number || null,
          photo_url || null,
          staff_type || "Teaching",
          designation || null,
          department || null,
          subject || null,
          classes_handling || null,
          qualification || null,
          parseOptionalNumber(experience_years),
          joining_date || null,
          employment_type || "Permanent",
          salary_type || "Monthly",
          parseMoney(monthly_salary),
          work_status || "Active",
          bank_account_name || null,
          bank_name || null,
          bank_branch || null,
          bank_account_number || null,
          ifsc_code || null,
          upi_id || null,
          has_login_access || false,
          login_account_id || null,
          emergency_contact_name || null,
          emergency_contact_mobile || null,
          notes || null,
          Number(id),
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Staff not found",
        });
      }

      return res.status(200).json({
        success: true,
        staff: result.rows[0],
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Staff id is required",
        });
      }

      const result = await pool.query(
        `
        DELETE FROM public.staff
        WHERE id = $1
        RETURNING id, full_name
        `,
        [Number(id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Staff not found",
        });
      }

      return res.status(200).json({
        success: true,
        staff: result.rows[0],
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("Staff API Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
