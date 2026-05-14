import bcrypt from "bcryptjs";
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

export default async function handler(req, res) {
  try {
    // =====================================================
    // GET USERS
    // =====================================================

    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT
          id,
          username,
          role
        FROM public."Login_accounts"
        ORDER BY id DESC
      `);

      return res.status(200).json({
        success: true,
        users: result.rows,
      });
    }

    // =====================================================
    // CREATE USER
    // =====================================================

    if (req.method === "POST") {
      const { username, password, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({
          success: false,
          error: "Username, password and role are required",
        });
      }

      const existing = await pool.query(
        `
        SELECT id
        FROM public."Login_accounts"
        WHERE username = $1
        `,
        [username]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Username already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
        INSERT INTO public."Login_accounts" (
          username,
          password,
          role
        )
        VALUES ($1, $2, $3)
        RETURNING id, username, role
        `,
        [username, hashedPassword, role]
      );

      return res.status(201).json({
        success: true,
        user: result.rows[0],
      });
    }

    // =====================================================
    // UPDATE USER
    // =====================================================

    if (req.method === "PUT") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "User id is required",
        });
      }

      const { username, password, role } = req.body;

      const existing = await pool.query(
        `
        SELECT *
        FROM public."Login_accounts"
        WHERE id = $1
        `,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const currentUser = existing.rows[0];

      let finalPassword = currentUser.password;

      if (password && password.trim()) {
        finalPassword = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        `
        UPDATE public."Login_accounts"
        SET
          username = $1,
          password = $2,
          role = $3
        WHERE id = $4
        RETURNING id, username, role
        `,
        [
          username || currentUser.username,
          finalPassword,
          role || currentUser.role,
          id,
        ]
      );

      return res.status(200).json({
        success: true,
        user: result.rows[0],
      });
    }

    // =====================================================
    // DELETE USER
    // =====================================================

    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "User id is required",
        });
      }

      await pool.query(
        `
        DELETE FROM public."Login_accounts"
        WHERE id = $1
        `,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    }

    // =====================================================
    // METHOD NOT ALLOWED
    // =====================================================

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("Users API Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}