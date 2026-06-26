-- Unified Supabase Database Schema and Data Setup Script
-- Copy and paste this complete script into your Supabase SQL Editor (SQL Editor -> New Query)
-- It will safely recreate all 10 tables, disable RLS to prevent sync errors, and seed them with realistic mock data.

SET session_replication_role = 'replica';

--------------------------------------------------------------------------------
-- 1. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS safety_records CASCADE;
DROP TABLE IF EXISTS salary_records CASCADE;
DROP TABLE IF EXISTS escalations CASCADE;
DROP TABLE IF EXISTS po_budgets CASCADE;
DROP TABLE IF EXISTS po_acceptances CASCADE;
DROP TABLE IF EXISTS fin_config CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

--------------------------------------------------------------------------------
-- 2. CREATE SCHEMAS CORRECTLY
--------------------------------------------------------------------------------

-- Table 1: Employees Table
CREATE TABLE employees (
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
    social_insurance_employee NUMERIC DEFAULT 0,
    social_insurance_company NUMERIC DEFAULT 0,
    taxes NUMERIC DEFAULT 0,
    medical NUMERIC DEFAULT 0,
    bank_account TEXT,
    notes TEXT
);

-- Table 2: Safety Records Table
CREATE TABLE safety_records (
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

-- Table 3: Accounts Table
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    projects TEXT[] -- Array of project names
);

-- Table 4: PO Budgets Table
CREATE TABLE po_budgets (
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

-- Table 5: Salary Records Table (Salary Overrides)
CREATE TABLE salary_records (
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

-- Table 6: Escalations Table
CREATE TABLE escalations (
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

-- Table 7: Permissions Table
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    module TEXT,
    action TEXT,
    roles JSONB
);

-- Table 8: PO Acceptances Table
CREATE TABLE po_acceptances (
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

-- Table 9: Finance Configuration Table
CREATE TABLE fin_config (
    id TEXT PRIMARY KEY, -- Project Name
    labels JSONB,
    actual_labels JSONB,
    custom_categories JSONB DEFAULT '[]'::jsonb,
    disabled_cores JSONB DEFAULT '[]'::jsonb,
    gross_percentage NUMERIC,
    gross_percentages JSONB
);

-- Table 10: Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    role TEXT,
    projects TEXT[]
);

--------------------------------------------------------------------------------
-- 3. DISABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
--------------------------------------------------------------------------------
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

--------------------------------------------------------------------------------
-- 4. INSERT REALISTIC SEED DATA
--------------------------------------------------------------------------------

-- Users Seed
INSERT INTO users (id, name, password, role, projects) VALUES
('u1', 'admin', 'password', 'Admin', ARRAY[]::TEXT[]),
('u2', 'hr', 'password', 'HR', ARRAY[]::TEXT[]),
('u3', 'manager', 'password', 'Manager', ARRAY[]::TEXT[]);

-- Permissions Seed
INSERT INTO permissions (id, module, action, roles) VALUES
('p1', 'Dashboard', 'View Metrics & Charts', '{"Admin": true, "HR": true, "Manager": true, "Employee": true, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p2', 'Employees', 'View Employee List', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p3', 'Employees', 'Add / Edit / Delete Employees', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_emp_import', 'Employees', 'Import Employees', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_emp_export', 'Employees', 'Export Employees', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p4', 'Salaries', 'View Monthly Salaries', '{"Admin": true, "HR": true, "Manager": false, "Employee": true, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p5', 'Salaries', 'Modify Salary & Bonus', '{"Admin": true, "HR": false, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p5b', 'Salaries', 'Send Payslips', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_sal_export', 'Salaries', 'Export Salaries', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_other_cost_view', 'Other Cost', 'View Other Cost', '{"Admin": true, "HR": true, "Manager": false, "Employee": true, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_other_cost_manage', 'Other Cost', 'Modify Other Cost', '{"Admin": true, "HR": false, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_other_cost_payslips', 'Other Cost', 'Send Cost Slips', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_other_cost_export', 'Other Cost', 'Export Other Cost', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p12', 'Gross Salaries', 'View Gross Salaries', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_gsal_export', 'Gross Salaries', 'Export Gross Salaries', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_cost_view', 'Cost', 'View Cost Page', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_cost_manage', 'Cost', 'Manage Cost Data', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_cost_export', 'Cost', 'Export Cost Page', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_saf_view', 'Safety', 'View Safety Page', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p13', 'Safety', 'Manage Safety', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_saf_export', 'Safety', 'Export Safety', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p6', 'PO & Budget', 'View Financial Dashboard', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p7', 'PO & Budget', 'Edit Budget Rows', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_pob_export', 'PO & Budget', 'Export Budget Rows', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_poa_view', 'PO Acceptances', 'View PO Acceptances', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_poa_manage', 'PO Acceptances', 'Manage PO Acceptances', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_poa_export', 'PO Acceptances', 'Export PO Acceptances', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_poe_view', 'PO Entry', 'View PO Entry', '{"Admin": true, "HR": true, "Manager": true, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_poe_manage', 'PO Entry', 'Edit PO Entry', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p10', 'Escalations', 'View & Manage Escalations', '{"Admin": true, "HR": true, "Manager": true, "Employee": true, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p11', 'Escalations', 'Edit / Delete Escalations', '{"Admin": true, "HR": true, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p9', 'System', 'Manage Roles & Permissions', '{"Admin": true, "HR": false, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb),
('p_sys_settings', 'System', 'Manage Settings', '{"Admin": true, "HR": false, "Manager": false, "Employee": false, "Acceptances": false, "PM": false, "CM": false}'::jsonb);

-- Accounts Seed
INSERT INTO accounts (id, name, projects) VALUES
('acc-1', 'NBE', ARRAY['NBE Main']),
('acc-2', 'CIB', ARRAY['CIB Retail', 'CIB Corporate']),
('acc-3', 'Banque Misr', ARRAY['BM Portal']),
('acc-4', 'Internal', ARRAY['HR System', 'IT Support']),
('acc-5', 'QNB', ARRAY[]::TEXT[]),
('acc-6', 'Project NOC', ARRAY['NOC Phase 1']);

-- Employees Seed
INSERT INTO employees (
    id, hr_code, name, position, account, project, email, phone1, phone2,
    date_hiring, date_resign, status, net_salary, social_insurance_employee,
    social_insurance_company, taxes, medical, bank_account, notes
) VALUES
('EMP-001', 'HR-1001', 'Ahmed Ali', 'Software Engineer', 'NBE', 'NBE Main', 'ahmed@example.com', '01001234567', NULL, '2023-01-15', NULL, 'Active', 15000, 500, 1000, 1200, 200, '123456789012', 'Excellent performance'),
('EMP-002', 'HR-1002', 'Sara Mohamed', 'HR Specialist', 'Internal', 'HR System', 'sara@example.com', '01112223344', '01234567890', '2022-05-10', NULL, 'Active', 12000, 400, 800, 900, 200, '987654321098', NULL),
('EMP-003', 'HR-1003', 'Omar Khaled', 'Project Manager', 'CIB', 'CIB Retail', 'omar@example.com', '01555667788', NULL, '2021-08-01', NULL, 'Active', 25000, 800, 1600, 2200, 200, '112233445566', 'PM for retail accounts'),
('EMP-004', 'HR-1004', 'Nour Hassan', 'Sales Representative', 'Banque Misr', 'BM Portal', 'nour@example.com', '01099887766', NULL, '2024-02-01', '2024-05-01', 'Resigned', 8000, 300, 600, 500, 200, '998877665544', 'Resigned due to personal reasons');

-- Safety Records Seed
INSERT INTO safety_records (
    id, medical_check, medical_check_start, medical_check_end,
    working_at_height, working_at_height_start, working_at_height_end,
    electricity, electricity_start, electricity_end,
    risk_assessment, risk_assessment_start, risk_assessment_end,
    fire_fighting, fire_fighting_start, fire_fighting_end,
    first_aid, first_aid_start, first_aid_end,
    ppe, ppe_start, ppe_end
) VALUES
('EMP-001', 1, '2024-01-01', '2025-01-01', 1, '2024-01-01', '2025-01-01', 0, NULL, NULL, 1, '2024-01-01', '2025-01-01', 1, '2024-01-01', '2025-01-01', 1, '2024-01-01', '2025-01-01', 1, '2024-01-01', '2025-01-01'),
('EMP-002', 1, '2024-02-01', '2025-02-01', 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 1, '2024-02-01', '2025-02-01', 1, '2024-02-01', '2025-02-01', 0, NULL, NULL),
('EMP-003', 1, '2024-03-01', '2025-03-01', 1, '2024-03-01', '2025-03-01', 1, '2024-03-01', '2025-03-01', 1, '2024-03-01', '2025-03-01', 1, '2024-03-01', '2025-03-01', 1, '2024-03-01', '2025-03-01', 1, '2024-03-01', '2025-03-01'),
('EMP-004', 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL);

-- PO Budgets Seed
INSERT INTO po_budgets (
    id, account, project, month, year, po_amount, no_of_staff,
    po_salaries, po_ot, po_retro, po_gifts, po_top_hero, po_breakfast,
    po_annual, po_mobile, po_medical, po_laptop, po_net_profit,
    actual_breakfast, actual_annual, actual_medical, actual_laptop,
    actual_net_profit, actual_top_hero, custom_allocations, custom_actual_allocations
) VALUES
('PO-1', 'Project NOC', 'NOC Phase 1', 'Jan', 2024, 100000, 5, 40000, 5000, 0, 2000, 0, 1000, 0, 1000, 2000, 5000, 44000, 800, 0, 1900, 0, 0, 0, '{}'::jsonb, '{}'::jsonb),
('PO-2', 'Project NOC', 'NOC Phase 1', 'Feb', 2024, 100000, 5, 40000, 6000, 1000, 3000, 0, 1000, 0, 1000, 2000, 5000, 41000, 900, 0, 1900, 0, 0, 1000, '{}'::jsonb, '{}'::jsonb);

-- Salary Records Seed (Overrides)
INSERT INTO salary_records (
    id, ot, bonus, gift, retro, mobile, top_hero, po_numbers, po_amount_requests
) VALUES
('EMP-001_Jan_2024', 1500, 500, 0, 0, 334.21, 0, '[]'::jsonb, '{}'::jsonb),
('EMP-001_Mar_2024', 2000, 0, 500, 1000, 334.21, 1000, '[]'::jsonb, '{}'::jsonb);

-- Escalations Seed
INSERT INTO escalations (id, employee_id, employee_name, manager_name, subject, description, date, status, replies) VALUES
('ESC-001', 'EMP-001', 'Ahmed Ali', 'Admin', 'OT not reflected in salary', 'My overtime hours from last month were not calculated in the recent paycheck.', '2024-03-10', 'Pending', '[]'::jsonb);

-- PO Acceptances Seed
INSERT INTO po_acceptances (
    id, month, year, po_number, amount_po, po_amount_request, cost_po, balance_po,
    grn_number, grn_date, invoice_no, invoice_date, collect_date, collect_state
) VALUES
('poa-1', 'Jan', 2024, 'PO-100230', 120000, 115000, 100000, 20000, 'GRN-998822', '2024-01-28', 'INV-2024-001', '2024-02-05', '2024-03-01', 'Collected'),
('poa-2', 'Feb', 2024, 'PO-100231', 145000, 140000, 125000, 20000, 'GRN-998823', '2024-02-28', 'INV-2024-002', '2024-03-06', '', 'Pending');

-- Finance Configuration Seed
INSERT INTO fin_config (id, labels, actual_labels, custom_categories, disabled_cores, gross_percentage, gross_percentages) VALUES
('NBE Main', 
 '{"poSalaries": "Net Salaries", "poOT": "Net OT", "poRetro": "Retro", "poGifts": "Gifts", "poTopHero": "Top Hero Bonus", "poBreakfast": "Breakfast", "poAnnual": "Annual", "poMobile": "Mobile Allowance", "poMedical": "Medical", "poLaptop": "Laptop", "poNetProfit": "Net Profit"}'::jsonb, 
 '{"poSalaries": "Actual Salaries", "poOT": "Actual OT", "poRetro": "Actual Retro", "poGifts": "Actual Gifts", "poTopHero": "Actual Top Hero Bonus", "poBreakfast": "Actual Breakfast", "poAnnual": "Actual Annual", "poMobile": "Actual Mobile Allowance", "poMedical": "Actual Medical", "poLaptop": "Actual Laptop", "poNetProfit": "Actual Net Profit"}'::jsonb, 
 '[]'::jsonb, 
 '[]'::jsonb, 
 15, 
 '{"NBE Main": 15}'::jsonb),
('HR System', 
 '{"poSalaries": "Net Salaries", "poOT": "Net OT", "poRetro": "Retro", "poGifts": "Gifts", "poTopHero": "Top Hero Bonus", "poBreakfast": "Breakfast", "poAnnual": "Annual", "poMobile": "Mobile Allowance", "poMedical": "Medical", "poLaptop": "Laptop", "poNetProfit": "Net Profit"}'::jsonb, 
 '{"poSalaries": "Actual Salaries", "poOT": "Actual OT", "poRetro": "Actual Retro", "poGifts": "Actual Gifts", "poTopHero": "Actual Top Hero Bonus", "poBreakfast": "Actual Breakfast", "poAnnual": "Actual Annual", "poMobile": "Actual Mobile Allowance", "poMedical": "Actual Medical", "poLaptop": "Actual Laptop", "poNetProfit": "Actual Net Profit"}'::jsonb, 
 '[]'::jsonb, 
 '[]'::jsonb, 
 12, 
 '{"HR System": 12}'::jsonb);

SET session_replication_role = 'origin';
