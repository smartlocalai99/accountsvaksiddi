import bcrypt from "bcryptjs";
import { serialize } from "cookie";
import md4 from "js-md4";
import { query } from "@/lib/db";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth";

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

function legacyMd4Matches(plainPassword, storedHash) {
  if (typeof storedHash !== "string" || !storedHash) {
    return false;
  }

  const computedHash = md4.create().update(String(plainPassword)).hex();
  return computedHash.toLowerCase() === storedHash.trim().toLowerCase();
}

async function getStoredPasswordColumn() {
  const columnResult = await query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Login_accounts'
        AND column_name IN ('hashpassword', 'password')
      ORDER BY CASE column_name WHEN 'hashpassword' THEN 1 ELSE 2 END
      LIMIT 1
    `,
    []
  );

  return columnResult.rows[0]?.column_name || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const passwordColumn = await getStoredPasswordColumn();

    if (!passwordColumn) {
      return res.status(500).json({
        success: false,
        message: "Login password column not found",
      });
    }

    const result = await query(
      `SELECT id, username, ${passwordColumn} AS stored_password, role FROM public."Login_accounts" WHERE username = $1 LIMIT 1`,
      [String(username).trim()]
    );

    const account = result.rows[0];

    if (!account) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const storedPassword = String(account.stored_password || "").trim();

    const passwordMatches = isBcryptHash(storedPassword)
      ? await bcrypt.compare(String(password), storedPassword)
      : legacyMd4Matches(String(password), storedPassword);

    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const token = signToken({
      id: account.id,
      username: account.username,
      role: account.role,
    });

    res.setHeader(
      "Set-Cookie",
      serialize(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    return res.status(200).json({
      success: true,
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
      },
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({ success: false, message: "Unable to sign in" });
  }
}
