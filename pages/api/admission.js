
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await pool.query(
        `SELECT id, student_name, gender, date_of_birth, age, blood_group, aadhar_last4,
                nationality, religion, class_applying_for, previous_school_name, previous_class,
                transfer_certificate, medium, program, father_name, father_mobile,
                father_occupation, mother_name, mother_mobile, mother_occupation, guardian_name,
                mother_aadhar_last4, mother_bank_account, bank_name, branch_name, ifsc_code,
                address, door_no, street, city, village, pin_code, emergency_contact,
                admission_status, created_at, student_id, parent_id, admission_fee_mode, fees
         FROM public.admissions
         ORDER BY created_at DESC, id DESC`
      );

      return res.status(200).json({ success: true, admissions: result.rows });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const body = req.body;
    const query = `
      INSERT INTO admissions (
        student_name, gender, date_of_birth, age, blood_group, aadhar_last4,
        nationality, religion,
        class_applying_for, previous_school_name, previous_class, transfer_certificate,
        medium, program, admission_fee_mode,
        father_name, father_mobile, father_occupation,
        mother_name, mother_mobile, mother_occupation,
        guardian_name,
        mother_aadhar_last4, mother_bank_account, bank_name, branch_name, ifsc_code,
        address, door_no, street, city, village, pin_code, emergency_contact
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22,
        $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32, $33, $34
      ) RETURNING *;
    `;
    const values = [
      body.student_name, body.gender, body.dob, body.age, body.blood_group, body.aadhar,
      body.nationality, body.religion,
      body.class_applying, body.previous_school, body.previous_class, body.tc === "Yes",
      body.medium, body.program, body.admission_fee_mode,
      body.father_name, body.father_mobile, body.father_occupation,
      body.mother_name, body.mother_mobile, body.mother_occupation,
      body.guardian_name,
      body.mother_aadhar, body.bank_account, body.bank_name, body.branch, body.ifsc,
      body.address, body.door_no, body.street, body.city, body.village, body.pin_code, body.emergency
    ];
    const result = await pool.query(query, values);
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
