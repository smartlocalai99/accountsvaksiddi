import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureStudentColumns() {
  await pool.query(`
    ALTER TABLE public.students
      ADD COLUMN IF NOT EXISTS sts_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS pen_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS caste VARCHAR(100),
      ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar'
  `);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  try {
    await ensureStudentColumns();

    const result = await pool.query(
      `
        SELECT
          id,
          full_name,
          gender,
          date_of_birth,
          age,
          class,
          blood_group,
          religion,
          medium,
          sts_no,
          pen_number,
          caste,
          student_type,
          admission_id,
          student_unique_id,
          created_at
        FROM public.students
        ORDER BY id DESC
      `
    );
    res.status(200).json({ success: true, students: result.rows });
  } catch (err) {
    console.error("Students API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
