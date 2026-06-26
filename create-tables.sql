-- Supabase Database Schema Creation Script
-- Copy and paste this script into your Supabase SQL Editor (SQL Editor -> New Query)
-- It will create all 10 tables required for your application with correct columns, types, and primary keys.

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    hr_code TEXT,
    name TEXT,
    position TEXT,
    account TEXT,
    project TEXT,
    email TEXT,
    phone1 TEXT,
    phone2 TEXT,
    date_hiring TEXT,
    date_resign TEXT,
    status TEXT,
    net_salary NUMERIC DEFAULT 0,
    social_insurance_employee NUMERIC,
    social_insurance_company NUMERIC,
    taxes NUMERIC,
    medical NUMERIC,
    bank_account TEXT,
    notes TEXT
);

-- 2. Safety Records Table
CREATE TABLE IF NOT EXISTS safety_records (
    id TEXT PRIMARY KEY,
    medical_check INTEGER DEFAULT 0,
    medical_check_start TEXT,
    medical_check_end TEXT,
    working_at_height INTEGER DEFAULT 0,
    working_at_height_start TEXT,
    working_at_height_end TEXT,
    electricity INTEGER DEFAULT 0,
    electricity_start TEXT,
    electricity_end TEXT,
    risk_assessment INTEGER DEFAULT 0,
    risk_assessment_start TEXT,
    risk_assessment_end TEXT,
    fire_fighting INTEGER DEFAULT 0,
    fire_fighting_start TEXT,
    fire_fighting_end TEXT,
    first_aid INTEGER DEFAULT 0,
    first_aid_start TEXT,
    first_aid_end TEXT,
    ppe INTEGER DEFAULT 0,
    ppe_start TEXT,
    ppe_end TEXT
);

-- 3. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    projects TEXT[] -- Array of project names
);

-- 4. PO Budgets Table
CREATE TABLE IF NOT EXISTS po_budgets (
    id TEXT PRIMARY KEY,
    account TEXT,
    project TEXT,
    month TEXT,
    year INTEGER,
    po_amount NUMERIC DEFAULT 0,
    no_of_staff INTEGER DEFAULT 0,
    po_salaries NUMERIC DEFAULT 0,
    po_ot NUMERIC DEFAULT 0,
    po_retro NUMERIC DEFAULT 0,
    po_gifts NUMERIC DEFAULT 0,
    po_top_hero NUMERIC DEFAULT 0,
    po_breakfast NUMERIC DEFAULT 0,
    po_annual NUMERIC DEFAULT 0,
    po_mobile NUMERIC DEFAULT 0,
    po_medical NUMERIC DEFAULT 0,
    po_laptop NUMERIC DEFAULT 0,
    po_net_profit NUMERIC DEFAULT 0,
    actual_breakfast NUMERIC DEFAULT 0,
    actual_annual NUMERIC DEFAULT 0,
    actual_medical NUMERIC DEFAULT 0,
    actual_laptop NUMERIC DEFAULT 0,
    actual_net_profit NUMERIC DEFAULT 0,
    actual_top_hero NUMERIC DEFAULT 0,
    custom_allocations JSONB,
    custom_actual_allocations JSONB
);

-- 5. Salary Records Table (Salary Overrides)
CREATE TABLE IF NOT EXISTS salary_records (
    id TEXT PRIMARY KEY, -- employee_month_year id format
    ot NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    gift NUMERIC DEFAULT 0,
    retro NUMERIC DEFAULT 0,
    mobile NUMERIC DEFAULT 0,
    top_hero NUMERIC DEFAULT 0,
    po_numbers JSONB,
    po_amount_requests JSONB
);

-- 6. Escalations Table
CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    employee_name TEXT,
    manager_name TEXT,
    subject TEXT,
    description TEXT,
    date TEXT,
    status TEXT,
    replies JSONB DEFAULT '[]'::jsonb
);

-- 7. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    projects TEXT[]
);

-- 8. PO Acceptances Table
CREATE TABLE IF NOT EXISTS po_acceptances (
    id TEXT PRIMARY KEY,
    month TEXT,
    year INTEGER,
    po_number TEXT,
    amount_po NUMERIC DEFAULT 0,
    po_amount_request NUMERIC,
    cost_po NUMERIC DEFAULT 0,
    balance_po NUMERIC DEFAULT 0,
    grn_number TEXT,
    grn_date TEXT,
    invoice_no TEXT,
    invoice_date TEXT,
    collect_date TEXT,
    collect_state TEXT
);

-- 9. Finance Configuration Table
CREATE TABLE IF NOT EXISTS fin_config (
    id TEXT PRIMARY KEY, -- Project Name
    labels JSONB,
    actual_labels JSONB,
    custom_categories JSONB DEFAULT '[]'::jsonb,
    disabled_cores JSONB DEFAULT '[]'::jsonb,
    gross_percentage NUMERIC,
    gross_percentages JSONB
);

-- 10. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    role TEXT,
    projects TEXT[]
);

-- Disable Row Level Security (RLS) to ensure direct API access (Unrestricted setup)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE safety_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE po_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE escalations DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE po_acceptances DISABLE ROW LEVEL SECURITY;
ALTER TABLE fin_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
