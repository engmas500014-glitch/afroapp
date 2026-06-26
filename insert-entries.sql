-- Supabase Sample Data Insertion Script
-- Copy and paste this script into your Supabase SQL Editor (SQL Editor -> New Query)
-- It will populate realistic test data into all 10 tables, with correct relationships and exact field types.

-- Disable triggers temporarily if needed to avoid overhead
SET session_replication_role = 'replica';

--------------------------------------------------------------------------------
-- 1. Correcting the Permissions Table Schema if it was created incorrectly
-- (The application requires 'module', 'action', and 'roles' to match PermNode)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    module TEXT,
    action TEXT,
    roles JSONB
);

-- Re-disable Row Level Security to ensure direct client integration
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- Clean up existing data in correct dependency order
--------------------------------------------------------------------------------
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE permissions CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE safety_records CASCADE;
TRUNCATE TABLE po_budgets CASCADE;
TRUNCATE TABLE salary_records CASCADE;
TRUNCATE TABLE escalations CASCADE;
TRUNCATE TABLE po_acceptances CASCADE;
TRUNCATE TABLE fin_config CASCADE;

--------------------------------------------------------------------------------
-- 1. Users Table
--------------------------------------------------------------------------------
INSERT INTO users (id, name, password, role, projects) VALUES
('u1', 'admin', 'password', 'Admin', ARRAY[]::TEXT[]),
('u2', 'hr', 'password', 'HR', ARRAY[]::TEXT[]),
('u3', 'manager', 'password', 'Manager', ARRAY[]::TEXT[]);

--------------------------------------------------------------------------------
-- 2. Permissions Table (App Permission Matrix)
--------------------------------------------------------------------------------
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

--------------------------------------------------------------------------------
-- 3. Accounts Table
--------------------------------------------------------------------------------
INSERT INTO accounts (id, name, projects) VALUES
('acc-1', 'NBE', ARRAY['NBE Main']),
('acc-2', 'CIB', ARRAY['CIB Retail', 'CIB Corporate']),
('acc-3', 'Banque Misr', ARRAY['BM Portal']),
('acc-4', 'Internal', ARRAY['HR System', 'IT Support']),
('acc-5', 'QNB', ARRAY[]::TEXT[]),
('acc-6', 'Project NOC', ARRAY['NOC Phase 1']);

--------------------------------------------------------------------------------
-- 4. Employees Table
--------------------------------------------------------------------------------
INSERT INTO employees (
    id, hr_code, name, position, account, project, email, phone1, phone2,
    date_hiring, date_resign, status, net_salary, social_insurance_employee,
    social_insurance_company, taxes, medical, bank_account, notes
) VALUES
('EMP-001', 'HR-1001', 'Ahmed Ali', 'Software Engineer', 'NBE', 'NBE Main', 'ahmed@example.com', '01001234567', NULL, '2023-01-15', NULL, 'Active', 15000, 500, 1000, 1200, 200, '123456789012', 'Excellent performance'),
('EMP-002', 'HR-1002', 'Sara Mohamed', 'HR Specialist', 'Internal', 'HR System', 'sara@example.com', '01112223344', '01234567890', '2022-05-10', NULL, 'Active', 12000, 400, 800, 900, 200, '987654321098', NULL),
('EMP-003', 'HR-1003', 'Omar Khaled', 'Project Manager', 'CIB', 'CIB Retail', 'omar@example.com', '01555667788', NULL, '2021-08-01', NULL, 'Active', 25000, 800, 1600, 2200, 200, '112233445566', 'PM for retail accounts'),
('EMP-004', 'HR-1004', 'Nour Hassan', 'Sales Representative', 'Banque Misr', 'BM Portal', 'nour@example.com', '01099887766', NULL, '2024-02-01', '2024-05-01', 'Resigned', 8000, 300, 600, 500, 200, '998877665544', 'Resigned due to personal reasons');

--------------------------------------------------------------------------------
-- 5. Safety Records Table
--------------------------------------------------------------------------------
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

--------------------------------------------------------------------------------
-- 6. PO Budgets Table
--------------------------------------------------------------------------------
INSERT INTO po_budgets (
    id, account, project, month, year, po_amount, no_of_staff,
    po_salaries, po_ot, po_retro, po_gifts, po_top_hero, po_breakfast,
    po_annual, po_mobile, po_medical, po_laptop, po_net_profit,
    actual_breakfast, actual_annual, actual_medical, actual_laptop,
    actual_net_profit, actual_top_hero, custom_allocations, custom_actual_allocations
) VALUES
('PO-1', 'Project NOC', 'NOC Phase 1', 'Jan', 2024, 100000, 5, 40000, 5000, 0, 2000, 0, 1000, 0, 1000, 2000, 5000, 44000, 800, 0, 1900, 0, 0, 0, '{}'::jsonb, '{}'::jsonb),
('PO-2', 'Project NOC', 'NOC Phase 1', 'Feb', 2024, 100000, 5, 40000, 6000, 1000, 3000, 0, 1000, 0, 1000, 2000, 5000, 41000, 900, 0, 1900, 0, 0, 1000, '{}'::jsonb, '{}'::jsonb);

--------------------------------------------------------------------------------
-- 7. Salary Records Table (Salary Overrides)
--------------------------------------------------------------------------------
INSERT INTO salary_records (
    id, ot, bonus, gift, retro, mobile, top_hero, po_numbers, po_amount_requests
) VALUES
('EMP-001_Jan_2024', 1500, 500, 0, 0, 334.21, 0, '[]'::jsonb, '{}'::jsonb),
('EMP-001_Mar_2024', 2000, 0, 500, 1000, 334.21, 1000, '[]'::jsonb, '{}'::jsonb);

--------------------------------------------------------------------------------
-- 8. Escalations Table
--------------------------------------------------------------------------------
INSERT INTO escalations (id, employee_id, employee_name, manager_name, subject, description, date, status, replies) VALUES
('ESC-001', 'EMP-001', 'Ahmed Ali', 'Admin', 'OT not reflected in salary', 'My overtime hours from last month were not calculated in the recent paycheck.', '2024-03-10', 'Pending', '[]'::jsonb);

--------------------------------------------------------------------------------
-- 9. PO Acceptances Table
--------------------------------------------------------------------------------
INSERT INTO po_acceptances (
    id, month, year, po_number, amount_po, po_amount_request, cost_po, balance_po,
    grn_number, grn_date, invoice_no, invoice_date, collect_date, collect_state
) VALUES
('poa-1', 'Jan', 2024, 'PO-100230', 120000, 115000, 100000, 20000, 'GRN-998822', '2024-01-28', 'INV-2024-001', '2024-02-05', '2024-03-01', 'Collected'),
('poa-2', 'Feb', 2024, 'PO-100231', 145000, 140000, 125000, 20000, 'GRN-998823', '2024-02-28', 'INV-2024-002', '2024-03-06', '', 'Pending');

--------------------------------------------------------------------------------
-- 10. Finance Configuration Table (Project Layout and Metadata)
--------------------------------------------------------------------------------
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

-- Restore trigger replication role
SET session_replication_role = 'origin';
