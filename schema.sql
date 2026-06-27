-- Schema-only export generated from Neon Postgres
-- Generated at 2026-06-27T06:06:13.738Z
-- Database schema: public

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET search_path = public, pg_catalog;

CREATE SCHEMA IF NOT EXISTS public;

CREATE SEQUENCE public."Login_accounts_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."admissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."assets_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."expenses_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."fee_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."fee_structure_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."ledger_change_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."parents_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."payroll_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."school_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."staff_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."students_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."whatsapp_config_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE public."whatsapp_message_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

CREATE SEQUENCE public."whatsapp_message_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

CREATE SEQUENCE public."whatsapp_opt_ins_id_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

CREATE TABLE public."Login_accounts" (
    "id" integer NOT NULL,
    "username" character varying(100) NOT NULL,
    "password" text NOT NULL,
    "role" character varying(50) DEFAULT 'ADMIN'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."admissions" (
    "id" integer NOT NULL,
    "student_name" character varying(150),
    "gender" character varying(30),
    "date_of_birth" date,
    "age" integer,
    "blood_group" character varying(20),
    "aadhar_last4" character varying(10),
    "religion" character varying(80),
    "class_applying_for" character varying(50),
    "previous_school_name" character varying(150),
    "previous_class" character varying(50),
    "transfer_certificate" boolean,
    "medium" character varying(50),
    "father_name" character varying(150),
    "father_mobile" character varying(30),
    "father_occupation" character varying(100),
    "mother_name" character varying(150),
    "mother_mobile" character varying(30),
    "mother_occupation" character varying(100),
    "guardian_name" character varying(150),
    "mother_aadhar_last4" character varying(10),
    "mother_bank_account" character varying(50),
    "bank_name" character varying(150),
    "branch_name" character varying(150),
    "ifsc_code" character varying(30),
    "address" text,
    "door_no" character varying(50),
    "street" character varying(150),
    "city" character varying(100),
    "village" character varying(100),
    "pin_code" character varying(20),
    "emergency_contact" character varying(30),
    "parent_id" integer,
    "fees" numeric(12,2) DEFAULT 0,
    "discount" numeric(8,2) DEFAULT 0,
    "final_fee" numeric(12,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "sts_no" character varying(50),
    "pen_number" character varying(50),
    "caste" character varying(100),
    "student_type" character varying(30) DEFAULT 'Day Scholar'::character varying NOT NULL,
    "hostel_fee" numeric(12,2) DEFAULT 0 NOT NULL
);

CREATE TABLE public."assets" (
    "id" integer NOT NULL,
    "asset_code" character varying(50) NOT NULL,
    "asset_name" character varying(150) NOT NULL,
    "asset_category" character varying(100) NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "purchase_date" date,
    "purchase_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "vendor_name" character varying(150),
    "invoice_number" character varying(100),
    "invoice_file_url" text,
    "brand" character varying(100),
    "model_number" character varying(100),
    "serial_number" character varying(100),
    "assigned_to" character varying(150),
    "assigned_location" character varying(150),
    "warranty_expiry_date" date,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."expenses" (
    "id" integer NOT NULL,
    "date" date DEFAULT CURRENT_DATE NOT NULL,
    "title" character varying(255) NOT NULL,
    "category" character varying(100) NOT NULL,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes" text,
    "receipt_file_name" character varying(255),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."fee_payments" (
    "id" integer NOT NULL,
    "admission_id" integer,
    "student_id" integer,
    "fee_type" character varying(50) DEFAULT 'School Fee'::character varying NOT NULL,
    "receipt_no" character varying(50) NOT NULL,
    "payment_date" date DEFAULT CURRENT_DATE NOT NULL,
    "amount_paid" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_mode" character varying(30) DEFAULT 'Cash'::character varying NOT NULL,
    "reference_no" character varying(100),
    "utr" character varying(100),
    "collected_by" character varying(100),
    "notes" text,
    "remarks" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."fee_structure" (
    "id" integer NOT NULL,
    "class_name" character varying(50) NOT NULL,
    "school_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "hostel_first_term_fee" numeric(12,2) DEFAULT 40000 NOT NULL,
    "hostel_second_term_fee" numeric(12,2) DEFAULT 20000 NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."ledger_change_requests" (
    "id" integer NOT NULL,
    "ledger_type" character varying(30) NOT NULL,
    "record_id" integer NOT NULL,
    "original_data" jsonb NOT NULL,
    "proposed_data" jsonb NOT NULL,
    "reason" text NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "requested_by" integer NOT NULL,
    "reviewed_by" integer,
    "review_note" text,
    "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
    "reviewed_at" timestamp with time zone
);

CREATE TABLE public."parents" (
    "id" integer NOT NULL,
    "father_name" character varying(150),
    "father_mobile" character varying(30),
    "mother_name" character varying(150),
    "mother_mobile" character varying(30),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."payroll" (
    "id" integer NOT NULL,
    "staff_id" integer NOT NULL,
    "payroll_month" integer NOT NULL,
    "payroll_year" integer NOT NULL,
    "working_days" integer DEFAULT 0,
    "leave_days" integer DEFAULT 0,
    "lop_days" integer DEFAULT 0,
    "carry_forward_leaves" integer DEFAULT 0,
    "basic_salary" numeric(12,2) DEFAULT 0,
    "increment_amount" numeric(12,2) DEFAULT 0,
    "bonus_amount" numeric(12,2) DEFAULT 0,
    "deduction_amount" numeric(12,2) DEFAULT 0,
    "net_salary" numeric(12,2) DEFAULT 0,
    "payment_status" character varying(30) DEFAULT 'PENDING'::character varying,
    "payment_date" date,
    "payment_mode" character varying(50),
    "reference_no" character varying(100),
    "remarks" text,
    "created_by" character varying(100),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."school_settings" (
    "id" integer NOT NULL,
    "school_name" character varying(200),
    "school_code" character varying(50),
    "established_year" integer,
    "academic_year" character varying(50),
    "principal_name" character varying(150),
    "contact_number" character varying(30),
    "email" character varying(150),
    "school_logo" text,
    "admission_number_prefix" character varying(30),
    "account_name" character varying(150),
    "bank_name" character varying(150),
    "branch_name" character varying(150),
    "account_number" character varying(50),
    "ifsc_code" character varying(30),
    "upi_id" character varying(150),
    "qr_code_image" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "school_address" text,
    "letterhead_logo" text,
    "letterhead_school_name" character varying(200),
    "letterhead_address" text
);

CREATE TABLE public."staff" (
    "id" integer NOT NULL,
    "staff_code" character varying(50),
    "full_name" character varying(150) NOT NULL,
    "gender" character varying(30),
    "date_of_birth" date,
    "age" integer,
    "blood_group" character varying(20),
    "mobile" character varying(30),
    "alternate_mobile" character varying(30),
    "email" character varying(150),
    "address" text,
    "aadhar_last4" character varying(10),
    "pan_number" character varying(20),
    "photo_url" text,
    "staff_type" character varying(50) DEFAULT 'Teaching'::character varying,
    "designation" character varying(100),
    "department" character varying(100),
    "subject" character varying(100),
    "classes_handling" text,
    "qualification" character varying(150),
    "experience_years" numeric(5,2),
    "joining_date" date,
    "employment_type" character varying(50) DEFAULT 'Permanent'::character varying,
    "salary_type" character varying(50) DEFAULT 'Monthly'::character varying,
    "monthly_salary" numeric(12,2) DEFAULT 0,
    "work_status" character varying(50) DEFAULT 'Active'::character varying,
    "bank_account_name" character varying(150),
    "bank_name" character varying(150),
    "bank_branch" character varying(150),
    "bank_account_number" character varying(50),
    "ifsc_code" character varying(30),
    "upi_id" character varying(150),
    "has_login_access" boolean DEFAULT false,
    "login_account_id" integer,
    "emergency_contact_name" character varying(150),
    "emergency_contact_mobile" character varying(30),
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."students" (
    "id" integer NOT NULL,
    "full_name" character varying(150),
    "gender" character varying(30),
    "date_of_birth" date,
    "age" integer,
    "class" character varying(50),
    "blood_group" character varying(20),
    "religion" character varying(80),
    "medium" character varying(50),
    "admission_id" integer,
    "student_unique_id" character varying(50),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "sts_no" character varying(50),
    "pen_number" character varying(50),
    "caste" character varying(100),
    "student_type" character varying(30) DEFAULT 'Day Scholar'::character varying NOT NULL
);

CREATE TABLE public."whatsapp_config" (
    "id" integer NOT NULL,
    "worker_url" text,
    "worker_api_key" text,
    "railway_api_token" text,
    "railway_service_id" text,
    "railway_environment_id" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."whatsapp_message_logs" (
    "id" bigint DEFAULT nextval('whatsapp_message_logs_id_seq'::regclass) NOT NULL,
    "queue_id" bigint,
    "organization_id" integer,
    "student_id" integer,
    "admission_id" integer,
    "parent_id" integer,
    "recipient_name" character varying(150),
    "recipient_phone" character varying(20),
    "message_type" character varying(50),
    "message_text" text,
    "status" character varying(20),
    "whatsapp_message_id" text,
    "error_message" text,
    "sent_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public."whatsapp_message_queue" (
    "id" bigint DEFAULT nextval('whatsapp_message_queue_id_seq'::regclass) NOT NULL,
    "organization_id" integer,
    "student_id" integer,
    "admission_id" integer,
    "parent_id" integer,
    "recipient_name" character varying(150),
    "recipient_phone" character varying(20) NOT NULL,
    "message_type" character varying(50) DEFAULT 'GENERAL'::character varying NOT NULL,
    "message_text" text NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "priority" integer DEFAULT 5,
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "scheduled_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "locked_at" timestamp without time zone,
    "processing_started_at" timestamp without time zone,
    "sent_at" timestamp without time zone,
    "failed_at" timestamp without time zone,
    "cancelled_at" timestamp without time zone,
    "whatsapp_message_id" text,
    "error_message" text,
    "created_by" integer,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public."whatsapp_opt_ins" (
    "id" bigint DEFAULT nextval('whatsapp_opt_ins_id_seq'::regclass) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "name" character varying(150),
    "is_opted_in" boolean DEFAULT true,
    "source" character varying(100),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER SEQUENCE public."whatsapp_message_logs_id_seq" OWNED BY public."whatsapp_message_logs"."id";
ALTER SEQUENCE public."whatsapp_message_queue_id_seq" OWNED BY public."whatsapp_message_queue"."id";
ALTER SEQUENCE public."whatsapp_opt_ins_id_seq" OWNED BY public."whatsapp_opt_ins"."id";

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

ALTER TABLE ONLY public."Login_accounts" ADD CONSTRAINT "Login_accounts_username_key" UNIQUE (username);
ALTER TABLE ONLY public."Login_accounts" ADD CONSTRAINT "Login_accounts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."admissions" ADD CONSTRAINT "admissions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."admissions" ADD CONSTRAINT "admissions_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public."assets" ADD CONSTRAINT "assets_asset_code_key" UNIQUE (asset_code);
ALTER TABLE ONLY public."assets" ADD CONSTRAINT "assets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."expenses" ADD CONSTRAINT "expenses_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."fee_payments" ADD CONSTRAINT "fee_payments_receipt_no_key" UNIQUE (receipt_no);
ALTER TABLE ONLY public."fee_payments" ADD CONSTRAINT "fee_payments_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."fee_payments" ADD CONSTRAINT "fee_payments_admission_id_fkey" FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public."fee_payments" ADD CONSTRAINT "fee_payments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE ONLY public."fee_structure" ADD CONSTRAINT "fee_structure_class_name_key" UNIQUE (class_name);
ALTER TABLE ONLY public."fee_structure" ADD CONSTRAINT "fee_structure_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."ledger_change_requests" ADD CONSTRAINT "ledger_change_requests_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."ledger_change_requests" ADD CONSTRAINT "ledger_change_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES "Login_accounts"(id);
ALTER TABLE ONLY public."ledger_change_requests" ADD CONSTRAINT "ledger_change_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES "Login_accounts"(id);
ALTER TABLE ONLY public."ledger_change_requests" ADD CONSTRAINT "ledger_change_requests_ledger_type_check" CHECK (ledger_type::text = ANY (ARRAY['FEE'::character varying, 'EXPENSE'::character varying]::text[]));
ALTER TABLE ONLY public."ledger_change_requests" ADD CONSTRAINT "ledger_change_requests_status_check" CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying]::text[]));
ALTER TABLE ONLY public."parents" ADD CONSTRAINT "parents_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."payroll" ADD CONSTRAINT "payroll_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."payroll" ADD CONSTRAINT "payroll_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE ONLY public."school_settings" ADD CONSTRAINT "school_settings_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."staff" ADD CONSTRAINT "staff_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."staff" ADD CONSTRAINT "staff_login_account_id_fkey" FOREIGN KEY (login_account_id) REFERENCES "Login_accounts"(id) ON DELETE SET NULL;
ALTER TABLE ONLY public."students" ADD CONSTRAINT "students_student_unique_id_key" UNIQUE (student_unique_id);
ALTER TABLE ONLY public."students" ADD CONSTRAINT "students_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."students" ADD CONSTRAINT "students_admission_id_fkey" FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL;
ALTER TABLE ONLY public."whatsapp_config" ADD CONSTRAINT "whatsapp_config_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."whatsapp_message_queue" ADD CONSTRAINT "whatsapp_message_queue_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."whatsapp_opt_ins" ADD CONSTRAINT "whatsapp_opt_ins_phone_key" UNIQUE (phone);
ALTER TABLE ONLY public."whatsapp_opt_ins" ADD CONSTRAINT "whatsapp_opt_ins_pkey" PRIMARY KEY (id);

CREATE INDEX idx_fee_payments_admission_id ON public.fee_payments USING btree (admission_id);
CREATE INDEX idx_fee_payments_payment_date ON public.fee_payments USING btree (payment_date);
CREATE UNIQUE INDEX idx_ledger_change_requests_pending ON public.ledger_change_requests USING btree (ledger_type, record_id) WHERE ((status)::text = 'PENDING'::text);
CREATE INDEX idx_students_admission_id ON public.students USING btree (admission_id);
CREATE INDEX idx_whatsapp_message_logs_recipient_status_created_at ON public.whatsapp_message_logs USING btree (recipient_phone, status, created_at);
CREATE INDEX idx_whatsapp_message_logs_status_created_at ON public.whatsapp_message_logs USING btree (status, created_at);
CREATE INDEX idx_whatsapp_message_queue_admission_id ON public.whatsapp_message_queue USING btree (admission_id);
CREATE INDEX idx_whatsapp_message_queue_message_type ON public.whatsapp_message_queue USING btree (message_type);
CREATE INDEX idx_whatsapp_message_queue_recipient_phone ON public.whatsapp_message_queue USING btree (recipient_phone);
CREATE INDEX idx_whatsapp_message_queue_scheduled_at ON public.whatsapp_message_queue USING btree (scheduled_at);
CREATE INDEX idx_whatsapp_message_queue_status ON public.whatsapp_message_queue USING btree (status);
CREATE INDEX idx_whatsapp_message_queue_status_scheduled_at ON public.whatsapp_message_queue USING btree (status, scheduled_at);
CREATE INDEX idx_whatsapp_message_queue_student_id ON public.whatsapp_message_queue USING btree (student_id);
CREATE INDEX idx_whatsapp_opt_ins_phone ON public.whatsapp_opt_ins USING btree (phone);

CREATE TRIGGER trg_whatsapp_message_queue_updated_at BEFORE UPDATE ON whatsapp_message_queue FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_whatsapp_opt_ins_updated_at BEFORE UPDATE ON whatsapp_opt_ins FOR EACH ROW EXECUTE FUNCTION set_updated_at();
