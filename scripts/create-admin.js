const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params) {
  return pool.query(text, params);
}

async function main() {
  const username = "admin";
  const password = "admin123";
  const role = "SUPER_ADMIN";

  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await query(
    'SELECT id FROM public."Login_accounts" WHERE username = $1 LIMIT 1',
    [username]
  );

  if (existing.rows[0]) {
    await query(
      'UPDATE public."Login_accounts" SET password = $1, role = $2 WHERE id = $3',
      [hashedPassword, role, existing.rows[0].id]
    );
    console.log(`Updated admin account for username "${username}"`);
  } else {
    await query(
      'INSERT INTO public."Login_accounts" (username, password, role) VALUES ($1, $2, $3)',
      [username, hashedPassword, role]
    );
    console.log(`Created admin account for username "${username}"`);
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await pool.end();
  } catch {
    // ignore shutdown issues
  }
  process.exit(1);
});
