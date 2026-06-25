-- Users Table
CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  password text,
  projects text[]
);

-- Employees Table
CREATE TABLE employees (
  id text PRIMARY KEY,
  hr_code text NOT NULL,
  name text NOT NULL,
  position text NOT NULL,
  account text,
  project text,
  email text,
  phone1 text,
  phone2 text,
  date_hiring date,
  date_resign date,
  status text NOT NULL,
  net_salary numeric NOT NULL,
  social_insurance_employee numeric,
  social_insurance_company numeric,
  taxes numeric,
  medical numeric,
  bank_account text,
  notes text
);

-- Safety Records Table
CREATE TABLE safety_records (
  id text PRIMARY KEY,
  medical_check numeric,
  medical_check_start date,
  medical_check_end date,
  working_at_height numeric,
  working_at_height_start date,
  working_at_height_end date,
  electricity numeric,
  electricity_start date,
  electricity_end date,
  risk_assessment numeric,
  risk_assessment_start date,
  risk_assessment_end date,
  fire_fighting numeric,
  fire_fighting_start date,
  fire_fighting_end date,
  first_aid numeric,
  first_aid_start date,
  first_aid_end date,
  ppe numeric,
  ppe_start date,
  ppe_end date
);

-- Accounts Table
CREATE TABLE accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  projects text[]
);

-- PO Budgets Table
CREATE TABLE po_budgets (
  id text PRIMARY KEY,
  account text NOT NULL,
  project text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  po_amount numeric NOT NULL,
  no_of_staff integer NOT NULL,
  po_salaries numeric NOT NULL,
  po_ot numeric NOT NULL,
  po_retro numeric NOT NULL,
  po_gifts numeric NOT NULL,
  po_top_hero numeric NOT NULL,
  po_breakfast numeric NOT NULL,
  po_annual numeric NOT NULL,
  po_mobile numeric NOT NULL,
  po_medical numeric NOT NULL,
  po_laptop numeric NOT NULL,
  po_net_profit numeric NOT NULL,
  actual_breakfast numeric NOT NULL,
  actual_annual numeric NOT NULL,
  actual_medical numeric NOT NULL,
  actual_laptop numeric NOT NULL,
  actual_net_profit numeric NOT NULL,
  actual_top_hero numeric NOT NULL,
  custom_allocations jsonb,
  custom_actual_allocations jsonb
);

-- Salary Records Table (Overrides)
CREATE TABLE salary_records (
  id text PRIMARY KEY,
  ot numeric NOT NULL,
  bonus numeric NOT NULL,
  gift numeric NOT NULL,
  retro numeric NOT NULL,
  mobile numeric NOT NULL,
  top_hero numeric NOT NULL,
  po_numbers text[],
  po_amount_requests text[]
);

-- Escalations Table
CREATE TABLE escalations (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  manager_name text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  date timestamp with time zone NOT NULL,
  status text NOT NULL,
  replies jsonb
);

-- Permissions Table
CREATE TABLE permissions (
  id text PRIMARY KEY,
  module text NOT NULL,
  action text NOT NULL,
  roles jsonb NOT NULL
);

-- PO Acceptances Table
CREATE TABLE po_acceptances (
  id text PRIMARY KEY,
  month text NOT NULL,
  year integer NOT NULL,
  po_number text NOT NULL,
  amount_po numeric NOT NULL,
  po_amount_request numeric,
  cost_po numeric NOT NULL,
  balance_po numeric NOT NULL,
  grn_number text NOT NULL,
  grn_date date NOT NULL,
  invoice_no text NOT NULL,
  invoice_date date NOT NULL,
  collect_date date NOT NULL,
  collect_state text
);

-- Financial Config Table
CREATE TABLE fin_config (
  id text PRIMARY KEY,
  labels jsonb NOT NULL,
  actual_labels jsonb,
  custom_categories jsonb NOT NULL,
  disabled_cores text[] NOT NULL,
  gross_percentage numeric,
  gross_percentages jsonb
);
