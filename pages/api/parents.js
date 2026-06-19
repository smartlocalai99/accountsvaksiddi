import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  try {
    const result = await pool.query(
      `SELECT id, father_name, father_mobile, mother_name, mother_mobile, created_at FROM parents ORDER BY id DESC`
    );
    res.status(200).json({ success: true, parents: result.rows });
  } catch (err) {
    console.error("Parents API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
