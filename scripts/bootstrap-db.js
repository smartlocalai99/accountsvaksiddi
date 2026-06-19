const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS public."Login_accounts" (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.parents (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        father_name VARCHAR(150),
        father_mobile VARCHAR(30),
        mother_name VARCHAR(150),
        mother_mobile VARCHAR(30),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.admissions (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        student_name VARCHAR(150),
        gender VARCHAR(30),
        date_of_birth DATE,
        age INTEGER,
        blood_group VARCHAR(20),
        aadhar_last4 VARCHAR(10),
        religion VARCHAR(80),
        sts_no VARCHAR(50),
        pen_number VARCHAR(50),
        caste VARCHAR(100),
        class_applying_for VARCHAR(50),
        previous_school_name VARCHAR(150),
        previous_class VARCHAR(50),
        transfer_certificate BOOLEAN,
        medium VARCHAR(50),
        student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar',
        hostel_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
        father_name VARCHAR(150),
        father_mobile VARCHAR(30),
        father_occupation VARCHAR(100),
        mother_name VARCHAR(150),
        mother_mobile VARCHAR(30),
        mother_occupation VARCHAR(100),
        guardian_name VARCHAR(150),
        mother_aadhar_last4 VARCHAR(10),
        mother_bank_account VARCHAR(50),
        bank_name VARCHAR(150),
        branch_name VARCHAR(150),
        ifsc_code VARCHAR(30),
        address TEXT,
        door_no VARCHAR(50),
        street VARCHAR(150),
        city VARCHAR(100),
        village VARCHAR(100),
        pin_code VARCHAR(20),
        emergency_contact VARCHAR(30),
        parent_id INTEGER REFERENCES public.parents(id) ON DELETE SET NULL,
        fees NUMERIC(12, 2) DEFAULT 0,
        discount NUMERIC(8, 2) DEFAULT 0,
        final_fee NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.students (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        full_name VARCHAR(150),
        gender VARCHAR(30),
        date_of_birth DATE,
        age INTEGER,
        class VARCHAR(50),
        blood_group VARCHAR(20),
        religion VARCHAR(80),
        medium VARCHAR(50),
        sts_no VARCHAR(50),
        pen_number VARCHAR(50),
        caste VARCHAR(100),
        student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar',
        admission_id INTEGER REFERENCES public.admissions(id) ON DELETE SET NULL,
        student_unique_id VARCHAR(50) UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.fee_payments (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        admission_id INTEGER REFERENCES public.admissions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES public.students(id) ON DELETE SET NULL,
        fee_type VARCHAR(50) NOT NULL DEFAULT 'School Fee',
        receipt_no VARCHAR(50) UNIQUE NOT NULL,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash',
        reference_no VARCHAR(100),
        utr VARCHAR(100),
        collected_by VARCHAR(100),
        notes TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.staff (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        staff_code VARCHAR(50),
        full_name VARCHAR(150) NOT NULL,
        gender VARCHAR(30),
        date_of_birth DATE,
        age INTEGER,
        blood_group VARCHAR(20),
        mobile VARCHAR(30),
        alternate_mobile VARCHAR(30),
        email VARCHAR(150),
        address TEXT,
        aadhar_last4 VARCHAR(10),
        pan_number VARCHAR(20),
        photo_url TEXT,
        staff_type VARCHAR(50) DEFAULT 'Teaching',
        designation VARCHAR(100),
        department VARCHAR(100),
        subject VARCHAR(100),
        classes_handling TEXT,
        qualification VARCHAR(150),
        experience_years NUMERIC(5, 2),
        joining_date DATE,
        employment_type VARCHAR(50) DEFAULT 'Permanent',
        salary_type VARCHAR(50) DEFAULT 'Monthly',
        monthly_salary NUMERIC(12, 2) DEFAULT 0,
        work_status VARCHAR(50) DEFAULT 'Active',
        bank_account_name VARCHAR(150),
        bank_name VARCHAR(150),
        bank_branch VARCHAR(150),
        bank_account_number VARCHAR(50),
        ifsc_code VARCHAR(30),
        upi_id VARCHAR(150),
        has_login_access BOOLEAN DEFAULT false,
        login_account_id INTEGER REFERENCES public."Login_accounts"(id) ON DELETE SET NULL,
        emergency_contact_name VARCHAR(150),
        emergency_contact_mobile VARCHAR(30),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.payroll (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
        payroll_month INTEGER NOT NULL,
        payroll_year INTEGER NOT NULL,
        working_days INTEGER DEFAULT 0,
        leave_days INTEGER DEFAULT 0,
        lop_days INTEGER DEFAULT 0,
        carry_forward_leaves INTEGER DEFAULT 0,
        basic_salary NUMERIC(12, 2) DEFAULT 0,
        increment_amount NUMERIC(12, 2) DEFAULT 0,
        bonus_amount NUMERIC(12, 2) DEFAULT 0,
        deduction_amount NUMERIC(12, 2) DEFAULT 0,
        net_salary NUMERIC(12, 2) DEFAULT 0,
        payment_status VARCHAR(30) DEFAULT 'PENDING',
        payment_date DATE,
        payment_mode VARCHAR(50),
        reference_no VARCHAR(100),
        remarks TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.expenses (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        receipt_file_name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.assets (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        asset_code VARCHAR(50) UNIQUE NOT NULL,
        asset_name VARCHAR(150) NOT NULL,
        asset_category VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        purchase_date DATE,
        purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        vendor_name VARCHAR(150),
        invoice_number VARCHAR(100),
        invoice_file_url TEXT,
        brand VARCHAR(100),
        model_number VARCHAR(100),
        serial_number VARCHAR(100),
        assigned_to VARCHAR(150),
        assigned_location VARCHAR(150),
        warranty_expiry_date DATE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.school_settings (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        school_name VARCHAR(200),
        school_code VARCHAR(50),
        school_address TEXT,
        established_year INTEGER,
        academic_year VARCHAR(50),
        principal_name VARCHAR(150),
        contact_number VARCHAR(30),
        email VARCHAR(150),
        school_logo TEXT,
        letterhead_logo TEXT,
        letterhead_school_name VARCHAR(200),
        letterhead_address TEXT,
        admission_number_prefix VARCHAR(30),
        account_name VARCHAR(150),
        bank_name VARCHAR(150),
        branch_name VARCHAR(150),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(30),
        upi_id VARCHAR(150),
        qr_code_image TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE public.admissions
        ADD COLUMN IF NOT EXISTS sts_no VARCHAR(50),
        ADD COLUMN IF NOT EXISTS pen_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS caste VARCHAR(100),
        ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar',
        ADD COLUMN IF NOT EXISTS hostel_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
        DROP COLUMN IF EXISTS nationality,
        DROP COLUMN IF EXISTS program,
        DROP COLUMN IF EXISTS admission_status
    `);

    await client.query(`
      ALTER TABLE public.students
        ADD COLUMN IF NOT EXISTS sts_no VARCHAR(50),
        ADD COLUMN IF NOT EXISTS pen_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS caste VARCHAR(100),
        ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar',
        DROP COLUMN IF EXISTS nationality
    `);

    await client.query(`
      ALTER TABLE public.school_settings
        ADD COLUMN IF NOT EXISTS school_address TEXT,
        ADD COLUMN IF NOT EXISTS letterhead_logo TEXT,
        ADD COLUMN IF NOT EXISTS letterhead_school_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS letterhead_address TEXT
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.fee_structure (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        class_name VARCHAR(50) UNIQUE NOT NULL,
        school_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
        hostel_first_term_fee NUMERIC(12, 2) NOT NULL DEFAULT 40000,
        hostel_second_term_fee NUMERIC(12, 2) NOT NULL DEFAULT 20000,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const defaultFees = [
      ["Baby", 15000],
      ["L.K.G.", 16000],
      ["U.K.G.", 17000],
      ["1st Std", 18000],
      ["2nd Std", 19000],
      ["3rd Std", 20000],
      ["4th Std", 21000],
      ["5th Std", 22000],
      ["6th Std", 23000],
      ["7th Std", 24000],
      ["8th Std", 25000],
    ];

    for (const [index, [className, schoolFee]] of defaultFees.entries()) {
      await client.query(
        `
          INSERT INTO public.fee_structure (
            class_name,
            school_fee,
            hostel_first_term_fee,
            hostel_second_term_fee,
            display_order
          ) VALUES ($1, $2, 40000, 20000, $3)
          ON CONFLICT (class_name) DO NOTHING
        `,
        [className, schoolFee, index + 1]
      );
    }

    await client.query(
      `
        INSERT INTO public.school_settings (
          school_name,
          school_address,
          contact_number,
          school_logo,
          letterhead_logo,
          letterhead_school_name,
          letterhead_address,
          created_at,
          updated_at
        )
        SELECT $1, $2, $3, $4, $4, $1, $2, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.school_settings)
      `,
      [
        "Vaksiddhi Public School (R), Manvi",
        "Manvi, Raichur, Karnataka, India",
        "+91 9449484004",
        "/logos.png",
      ]
    );

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_admission_id
        ON public.students(admission_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fee_payments_admission_id
        ON public.fee_payments(admission_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fee_payments_payment_date
        ON public.fee_payments(payment_date)
    `);

    const hashedPassword = await bcrypt.hash("admin123", 12);
    await client.query(
      `
        INSERT INTO public."Login_accounts" (username, password, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (username)
        DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role
      `,
      ["admin", hashedPassword, "SUPER_ADMIN"]
    );

    await client.query("COMMIT");
    console.log("Database bootstrap complete");
    console.log("Admin login: admin / admin123");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
