-- Employees Table
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
  net_salary NUMERIC,
  social_insurance_employee NUMERIC,
  social_insurance_company NUMERIC,
  taxes NUMERIC,
  medical NUMERIC,
  bank_account TEXT,
  notes TEXT
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE, -- Added UNIQUE for foreign keys
  projects JSONB
);

-- Relationships for Employees
ALTER TABLE employees
  ADD CONSTRAINT fk_employee_account
  FOREIGN KEY (account) REFERENCES accounts(name)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- Safety Records Table
CREATE TABLE IF NOT EXISTS safety_records (
  id TEXT PRIMARY KEY,
  medical_check NUMERIC,
  medical_check_start TEXT,
  medical_check_end TEXT,
  working_at_height NUMERIC,
  working_at_height_start TEXT,
  working_at_height_end TEXT,
  electricity NUMERIC,
  electricity_start TEXT,
  electricity_end TEXT,
  risk_assessment NUMERIC,
  risk_assessment_start TEXT,
  risk_assessment_end TEXT,
  fire_fighting NUMERIC,
  fire_fighting_start TEXT,
  fire_fighting_end TEXT,
  first_aid NUMERIC,
  first_aid_start TEXT,
  first_aid_end TEXT,
  ppe NUMERIC,
  ppe_start TEXT,
  ppe_end TEXT,
  CONSTRAINT fk_safety_employee FOREIGN KEY (id) REFERENCES employees(id) ON DELETE CASCADE
);

-- PO Budgets Table
CREATE TABLE IF NOT EXISTS po_budgets (
  id TEXT PRIMARY KEY,
  account TEXT,
  project TEXT,
  month TEXT,
  year NUMERIC,
  po_amount NUMERIC,
  no_of_staff NUMERIC,
  po_salaries NUMERIC,
  po_ot NUMERIC,
  po_retro NUMERIC,
  po_gifts NUMERIC,
  po_top_hero NUMERIC,
  po_breakfast NUMERIC,
  po_annual NUMERIC,
  po_mobile NUMERIC,
  po_medical NUMERIC,
  po_laptop NUMERIC,
  po_net_profit NUMERIC,
  actual_breakfast NUMERIC,
  actual_annual NUMERIC,
  actual_medical NUMERIC,
  actual_laptop NUMERIC,
  actual_net_profit NUMERIC,
  actual_top_hero NUMERIC,
  custom_allocations JSONB,
  custom_actual_allocations JSONB,
  CONSTRAINT fk_po_budget_account FOREIGN KEY (account) REFERENCES accounts(name) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Salary Records Table
CREATE TABLE IF NOT EXISTS salary_records (
  id TEXT PRIMARY KEY,
  ot NUMERIC,
  bonus NUMERIC,
  gift NUMERIC,
  retro NUMERIC,
  mobile NUMERIC,
  top_hero NUMERIC,
  po_numbers JSONB,
  po_amount_requests JSONB
);

-- Escalations Table
CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  employee_name TEXT,
  manager_name TEXT,
  subject TEXT,
  description TEXT,
  date TEXT,
  status TEXT,
  replies JSONB,
  CONSTRAINT fk_escalation_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Permissions Table (Updated to match PermissionNode interface)
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  module TEXT,
  action TEXT,
  roles JSONB
);

-- PO Acceptances Table
CREATE TABLE IF NOT EXISTS po_acceptances (
  id TEXT PRIMARY KEY,
  month TEXT,
  year NUMERIC,
  po_number TEXT,
  amount_po NUMERIC,
  po_amount_request NUMERIC,
  cost_po NUMERIC,
  balance_po NUMERIC,
  grn_number TEXT,
  grn_date TEXT,
  invoice_no TEXT,
  invoice_date TEXT,
  collect_date TEXT,
  collect_state TEXT
);

-- Fin Config Table
CREATE TABLE IF NOT EXISTS fin_config (
  id TEXT PRIMARY KEY,
  labels JSONB,
  actual_labels JSONB,
  custom_categories JSONB,
  disabled_cores JSONB,
  gross_percentage NUMERIC,
  gross_percentages JSONB
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  role TEXT,
  password TEXT
);
