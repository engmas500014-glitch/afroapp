import React, { createContext, useContext, useState, ReactNode } from "react";

import { 
  loadDataFromSupabase,
  syncEmployees,
  syncSafetyRecords,
  syncAccounts,
  syncPoBudgets,
  syncSalaryOverrides,
  syncEscalations,
  syncPermissions,
  syncPoAcceptances,
  syncFinConfig,
  syncUsers
} from "../lib/db";

// Types
export type Role = "Admin" | "HR" | "Manager" | "Employee" | "Acceptances" | "PM" | "CM";

export interface User {
  id: string;
  name: string; // Used as username
  role: Role;
  password?: string;
  projects?: string[];
}

export interface Employee {
  id: string;
  hrCode: string;
  name: string;
  position: string;
  account?: string;
  project?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  dateHiring: string;
  dateResign: string | null;
  status: "Active" | "Resigned";
  netSalary: number;
  socialInsuranceEmployee?: number;
  socialInsuranceCompany?: number;
  taxes?: number;
  medical?: number;
  bankAccount?: string;
  notes?: string;
}

export interface SafetyRecord {
  medicalCheck: number;
  medicalCheckStart?: string;
  medicalCheckEnd?: string;
  workingAtHeight: number;
  workingAtHeightStart?: string;
  workingAtHeightEnd?: string;
  electricity: number;
  electricityStart?: string;
  electricityEnd?: string;
  riskAssessment: number;
  riskAssessmentStart?: string;
  riskAssessmentEnd?: string;
  fireFighting: number;
  fireFightingStart?: string;
  fireFightingEnd?: string;
  firstAid: number;
  firstAidStart?: string;
  firstAidEnd?: string;
  ppe: number;
  ppeStart?: string;
  ppeEnd?: string;
}

export interface AccountItem {
  id: string;
  name: string;
  projects: string[];
}

export interface CustomAllocationCategory {
  id: string;
  name: string;
}

export interface AllocationLabels {
  poSalaries: string;
  poOT: string;
  poRetro: string;
  poGifts: string;
  poTopHero: string;
  poBreakfast: string;
  poAnnual: string;
  poMobile: string;
  poMedical: string;
  poLaptop: string;
  poNetProfit: string;
}

export const DEFAULT_ALLOCATION_LABELS: AllocationLabels = {
  poSalaries: "Net Salaries",
  poOT: "Net OT",
  poRetro: "Retro",
  poGifts: "Gifts",
  poTopHero: "Top Hero Bonus",
  poBreakfast: "Breakfast",
  poAnnual: "Annual",
  poMobile: "Mobile Allowance",
  poMedical: "Medical",
  poLaptop: "Laptop",
  poNetProfit: "Net Profit",
};

export const DEFAULT_ACTUAL_LABELS: AllocationLabels = {
  poSalaries: "Actual Salaries",
  poOT: "Actual OT",
  poRetro: "Actual Retro",
  poGifts: "Actual Gifts",
  poTopHero: "Actual Top Hero Bonus",
  poBreakfast: "Actual Breakfast",
  poAnnual: "Actual Annual",
  poMobile: "Actual Mobile Allowance",
  poMedical: "Actual Medical",
  poLaptop: "Actual Laptop",
  poNetProfit: "Actual Net Profit",
};

export interface ProjectConfig {
  labels: AllocationLabels;
  actualLabels?: AllocationLabels;
  customCategories: CustomAllocationCategory[];
  disabledCores: string[];
  grossPercentage?: number;
  grossPercentages?: Record<string, number>;
}

export interface POBudget {
  id: string;
  account: string;
  project: string;
  month: string;
  year: number;
  poAmount: number;
  noOfStaff: number; // Budget No Of Staff

  // PO Fields (Allocated budget)
  poSalaries: number;
  poOT: number;
  poRetro: number;
  poGifts: number;
  poTopHero: number;
  poBreakfast: number;
  poAnnual: number;
  poMobile: number;
  poMedical: number;
  poLaptop: number;
  poNetProfit: number;

  // Custom PO Allocations
  customAllocations?: Record<string, number>;
  customActualAllocations?: Record<string, number>;

  // Actual/Grid Fields (Entered via Master Financial Grid)
  actualBreakfast: number;
  actualAnnual: number;
  actualMedical: number;
  actualLaptop: number;
  actualNetProfit: number;
  actualTopHero: number;
}

export interface SalaryRecord {
  ot: number;
  bonus: number;
  gift: number;
  retro: number;
  mobile: number;
  topHero: number;
  poNumbers?: string[];
  poAmountRequests?: string[];
}

export interface EscalationReply {
  id: string;
  author: string;
  date: string;
  comment: string;
}

export interface Escalation {
  id: string;
  employeeId: string;
  employeeName: string;
  managerName: string;
  subject: string;
  description: string;
  date: string;
  status: "Pending" | "In Progress" | "Resolved" | "Rejected";
  replies: EscalationReply[];
}

export interface PermissionNode {
  id: string;
  module: string;
  action: string;
  roles: Record<Role, boolean>;
}

export interface POAcceptance {
  id: string;
  month: string;
  year: number;
  poNumber: string;
  amountPo: number;
  poAmountRequest?: number;
  costPo: number;
  balancePo: number;
  grnNumber: string;
  grnDate: string;
  invoiceNo: string;
  invoiceDate: string;
  collectDate: string;
  collectState?: string;
}

export type Theme = "light" | "dark";

interface AppContextType {
  isSupabaseConnected: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  employees: Employee[];
  visibleEmployees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  poBudgets: POBudget[];
  visiblePoBudgets: POBudget[];
  setPoBudgets: React.Dispatch<React.SetStateAction<POBudget[]>>;
  poAcceptances: POAcceptance[];
  setPoAcceptances: React.Dispatch<React.SetStateAction<POAcceptance[]>>;
  salaryOverrides: Record<string, SalaryRecord>;
  setSalaryOverrides: React.Dispatch<
    React.SetStateAction<Record<string, SalaryRecord>>
  >;
  safetyRecords: Record<string, SafetyRecord>;
  setSafetyRecords: React.Dispatch<React.SetStateAction<Record<string, SafetyRecord>>>;
  positions: string[];
  setPositions: React.Dispatch<React.SetStateAction<string[]>>;
  accounts: AccountItem[];
  visibleAccounts: AccountItem[];
  setAccounts: React.Dispatch<React.SetStateAction<AccountItem[]>>;
  projects: string[];
  setProjects: React.Dispatch<React.SetStateAction<string[]>>;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
  finConfig: Record<string, ProjectConfig>;
  setFinConfig: React.Dispatch<
    React.SetStateAction<Record<string, ProjectConfig>>
  >;
  escalations: Escalation[];
  setEscalations: React.Dispatch<React.SetStateAction<Escalation[]>>;
  permissions: PermissionNode[];
  setPermissions: React.Dispatch<React.SetStateAction<PermissionNode[]>>;
  theme: Theme;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  React.useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const [finConfig, setFinConfig] = useState<Record<string, ProjectConfig>>(
    () => {
      const saved = localStorage.getItem("finConfig");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach(key => {
            parsed[key].labels = { ...DEFAULT_ALLOCATION_LABELS, ...parsed[key].labels };
            parsed[key].actualLabels = { ...DEFAULT_ACTUAL_LABELS, ...(parsed[key].actualLabels || {}) };
          });
          return parsed;
        } catch (e) {
          console.warn("Failed to parse finConfig from localStorage", e);
        }
      }

      // Migration from old un-scoped data
      try {
        const oldLabels = JSON.parse(
          localStorage.getItem("allocationLabels") || "null",
        );
        const oldCustom = JSON.parse(
          localStorage.getItem("customCategories") || "null",
        );

        return {
          default: {
            labels: oldLabels || DEFAULT_ALLOCATION_LABELS,
            actualLabels: DEFAULT_ACTUAL_LABELS,
            customCategories: oldCustom || [],
            disabledCores: [],
          },
        };
      } catch (e) {
        return {
          default: {
            labels: DEFAULT_ALLOCATION_LABELS,
            actualLabels: DEFAULT_ACTUAL_LABELS,
            customCategories: [],
            disabledCores: [],
          },
        };
      }
    },
  );

  React.useEffect(() => {
    localStorage.setItem("finConfig", JSON.stringify(finConfig));
    if (isLoaded && isSupabaseConnected) syncFinConfig(finConfig).catch(console.warn);
  }, [finConfig, isLoaded, isSupabaseConnected]);

  // Mock Data
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem("employees");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: "EMP-001",
        hrCode: "HR-1001",
        name: "Ahmed Ali",
        email: "ahmed@example.com",
        phone1: "01001234567",
        position: "Software Engineer",
        account: "NBE",
        project: "NBE Main",
        dateHiring: "2023-01-15",
        dateResign: null,
        status: "Active",
        netSalary: 15000,
        bankAccount: "123456789012",
      },
      {
        id: "EMP-002",
        hrCode: "HR-1002",
        name: "Sara Mohamed",
        email: "sara@example.com",
        phone1: "01112223344",
        phone2: "01234567890",
        position: "HR Specialist",
        account: "Internal",
        project: "HR System",
        dateHiring: "2022-05-10",
        dateResign: null,
        status: "Active",
        netSalary: 12000,
        bankAccount: "987654321098",
      },
      {
        id: "EMP-003",
        hrCode: "HR-1003",
        name: "Omar Khaled",
        email: "omar@example.com",
        phone1: "01555667788",
        position: "Project Manager",
        account: "CIB",
        project: "CIB Retail",
        dateHiring: "2021-08-01",
        dateResign: null,
        status: "Active",
        netSalary: 25000,
        bankAccount: "112233445566",
      },
      {
        id: "EMP-004",
        hrCode: "HR-1004",
        name: "Nour Hassan",
        email: "nour@example.com",
        phone1: "01099887766",
        position: "Sales Representative",
        account: "Banque Misr",
        project: "BM Portal",
        dateHiring: "2024-02-01",
        dateResign: "2024-05-01",
        status: "Resigned",
        netSalary: 8000,
        bankAccount: "998877665544",
      },
    ];
  });

  const [poAcceptances, setPoAcceptances] = useState<POAcceptance[]>(() => {
    const saved = localStorage.getItem("poAcceptances");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [poBudgets, setPoBudgets] = useState<POBudget[]>(() => {
    const saved = localStorage.getItem("poBudgets");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: "PO-1",
        account: "Project NOC",
        project: "NOC Phase 1",
        month: "Jan",
        year: 2024,
        poAmount: 100000,
        noOfStaff: 5,
        poSalaries: 40000,
        poOT: 5000,
        poRetro: 0,
        poGifts: 2000,
        poTopHero: 0,
        poBreakfast: 1000,
        poAnnual: 0,
        poMobile: 1000,
        poMedical: 2000,
        poLaptop: 5000,
        actualBreakfast: 800,
        actualAnnual: 0,
        actualMedical: 1900,
        actualLaptop: 0,
        actualNetProfit: 0,
        actualTopHero: 0,
      },
      {
        id: "PO-2",
        account: "Project NOC",
        project: "NOC Phase 1",
        month: "Feb",
        year: 2024,
        poAmount: 100000,
        noOfStaff: 5,
        poSalaries: 40000,
        poOT: 6000,
        poRetro: 1000,
        poGifts: 3000,
        poTopHero: 0,
        poBreakfast: 1000,
        poAnnual: 0,
        poMobile: 1000,
        poMedical: 2000,
        poLaptop: 5000,
        actualBreakfast: 900,
        actualAnnual: 0,
        actualMedical: 1900,
        actualLaptop: 0,
        actualNetProfit: 0,
        actualTopHero: 1000,
      },
    ];
  });

  const [salaryOverrides, setSalaryOverrides] = useState<Record<string, SalaryRecord>>(() => {
    const saved = localStorage.getItem("salaryOverrides");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  React.useEffect(() => {
    localStorage.setItem("employees", JSON.stringify(employees));
    if (isLoaded && isSupabaseConnected) syncEmployees(employees).catch(console.warn);
  }, [employees, isLoaded, isSupabaseConnected]);

  React.useEffect(() => {
    localStorage.setItem("poAcceptances", JSON.stringify(poAcceptances));
    if (isLoaded && isSupabaseConnected) syncPoAcceptances(poAcceptances).catch(console.warn);
  }, [poAcceptances, isLoaded, isSupabaseConnected]);

  React.useEffect(() => {
    localStorage.setItem("poBudgets", JSON.stringify(poBudgets));
    if (isLoaded && isSupabaseConnected) syncPoBudgets(poBudgets).catch(console.warn);
  }, [poBudgets, isLoaded, isSupabaseConnected]);

  React.useEffect(() => {
    localStorage.setItem("salaryOverrides", JSON.stringify(salaryOverrides));
    if (isLoaded && isSupabaseConnected) syncSalaryOverrides(salaryOverrides).catch(console.warn);
  }, [salaryOverrides, isLoaded, isSupabaseConnected]);
  
  const [safetyRecords, setSafetyRecords] = useState<Record<string, SafetyRecord>>(() => {
    const saved = localStorage.getItem("safetyRecords");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse safetyRecords", e);
      }
    }
    return {};
  });

  React.useEffect(() => {
    localStorage.setItem("safetyRecords", JSON.stringify(safetyRecords));
    if (isLoaded && isSupabaseConnected) syncSafetyRecords(safetyRecords).catch(console.warn);
  }, [safetyRecords, isLoaded, isSupabaseConnected]);

  const [positions, setPositions] = useState<string[]>([
    "Software Engineer",
    "HR Specialist",
    "Project Manager",
    "Sales Representative",
    "Team Lead",
    "Accountant",
  ]);

  const [accounts, setAccounts] = useState<AccountItem[]>([
    { id: "acc-1", name: "NBE", projects: ["NBE Main"] },
    { id: "acc-2", name: "CIB", projects: ["CIB Retail", "CIB Corporate"] },
    { id: "acc-3", name: "Banque Misr", projects: ["BM Portal"] },
    { id: "acc-4", name: "Internal", projects: ["HR System", "IT Support"] },
    { id: "acc-5", name: "QNB", projects: [] },
    { id: "acc-6", name: "Project NOC", projects: ["NOC Phase 1"] },
  ]);
  
  React.useEffect(() => {
    if (isLoaded && isSupabaseConnected) syncAccounts(accounts).catch(console.warn);
  }, [accounts, isLoaded, isSupabaseConnected]);

  const [projects, setProjects] = useState<string[]>([]);

  const visibleAccounts = React.useMemo(() => {
    if (!user || user.role === "Admin" || !user.projects || user.projects.length === 0) {
      return accounts;
    }
    // Filter projects based on user.projects
    return accounts.map(acc => ({
      ...acc,
      projects: acc.projects.filter(p => user.projects!.includes(p))
    })).filter(acc => acc.projects.length > 0 || user.projects!.includes(acc.name));
  }, [accounts, user]);

  const visibleEmployees = React.useMemo(() => {
    if (!user || user.role === "Admin" || !user.projects || user.projects.length === 0) {
      return employees;
    }
    return employees.filter(emp => !emp.project || user.projects!.includes(emp.project));
  }, [employees, user]);

  const visiblePoBudgets = React.useMemo(() => {
    if (!user || user.role === "Admin" || !user.projects || user.projects.length === 0) {
      return poBudgets;
    }
    return poBudgets.filter(po => user.projects!.includes(po.project));
  }, [poBudgets, user]);

  const [systemUsers, setSystemUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("systemUsers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: "u1", name: "admin", role: "Admin", password: "password" },
      { id: "u2", name: "hr", role: "HR", password: "password" },
      { id: "u3", name: "manager", role: "Manager", password: "password" },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem("systemUsers", JSON.stringify(systemUsers));
    if (isLoaded && isSupabaseConnected) syncUsers(systemUsers).catch(console.warn);
  }, [systemUsers, isLoaded, isSupabaseConnected]);

  const [escalations, setEscalations] = useState<Escalation[]>(() => {
    const saved = localStorage.getItem("escalations");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "ESC-001",
        employeeId: "EMP-001",
        employeeName: "Ahmed Ali",
        managerName: "Admin",
        subject: "OT not reflected in salary",
        description:
          "My overtime hours from last month were not calculated in the recent paycheck.",
        date: "2024-03-10",
        status: "Pending",
        replies: [],
      },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem("escalations", JSON.stringify(escalations));
    if (isLoaded && isSupabaseConnected) syncEscalations(escalations).catch(console.warn);
  }, [escalations, isLoaded, isSupabaseConnected]);

  const [permissions, setPermissions] = useState<PermissionNode[]>(() => {
    const defaultPerms: PermissionNode[] = [
      {
        id: "p1",
        module: "Dashboard",
        action: "View Metrics & Charts",
        roles: { Admin: true, HR: true, Manager: true, Employee: true, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p2",
        module: "Employees",
        action: "View Employee List",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p3",
        module: "Employees",
        action: "Add / Edit / Delete Employees",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_emp_import",
        module: "Employees",
        action: "Import Employees",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_emp_export",
        module: "Employees",
        action: "Export Employees",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p4",
        module: "Salaries",
        action: "View Monthly Salaries",
        roles: { Admin: true, HR: true, Manager: false, Employee: true, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p5",
        module: "Salaries",
        action: "Modify Salary & Bonus",
        roles: { Admin: true, HR: false, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p5b",
        module: "Salaries",
        action: "Send Payslips",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_sal_export",
        module: "Salaries",
        action: "Export Salaries",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p12",
        module: "Gross Salaries",
        action: "View Gross Salaries",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_gsal_export",
        module: "Gross Salaries",
        action: "Export Gross Salaries",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_cost_view",
        module: "Cost",
        action: "View Cost Page",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_cost_manage",
        module: "Cost",
        action: "Manage Cost Data",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_cost_export",
        module: "Cost",
        action: "Export Cost Page",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_saf_view",
        module: "Safety",
        action: "View Safety Page",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p13",
        module: "Safety",
        action: "Manage Safety",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_saf_export",
        module: "Safety",
        action: "Export Safety",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p6",
        module: "PO & Budget",
        action: "View Financial Dashboard",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p7",
        module: "PO & Budget",
        action: "Edit Budget Rows",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_pob_export",
        module: "PO & Budget",
        action: "Export Budget Rows",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_poa_view",
        module: "PO Acceptances",
        action: "View PO Acceptances",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_poa_manage",
        module: "PO Acceptances",
        action: "Manage PO Acceptances",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_poa_export",
        module: "PO Acceptances",
        action: "Export PO Acceptances",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_poe_view",
        module: "PO Entry",
        action: "View PO Entry",
        roles: { Admin: true, HR: true, Manager: true, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_poe_manage",
        module: "PO Entry",
        action: "Edit PO Entry",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p10",
        module: "Escalations",
        action: "View & Manage Escalations",
        roles: { Admin: true, HR: true, Manager: true, Employee: true, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p11",
        module: "Escalations",
        action: "Edit / Delete Escalations",
        roles: { Admin: true, HR: true, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p9",
        module: "System",
        action: "Manage Roles & Permissions",
        roles: { Admin: true, HR: false, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
      {
        id: "p_sys_settings",
        module: "System",
        action: "Manage Settings",
        roles: { Admin: true, HR: false, Manager: false, Employee: false, Acceptances: false, PM: false, CM: false },
      },
    ];

    const saved = localStorage.getItem("permissions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PermissionNode[];
        // Map over defaultPerms to keep the new order and drop obsolete ones
        return defaultPerms.map((dp) => {
          const existing = parsed.find((p) => p.id === dp.id);
          return existing ? existing : dp;
        });
      } catch (e) {
        return defaultPerms;
      }
    }
    return defaultPerms;
  });

  React.useEffect(() => {
    localStorage.setItem("permissions", JSON.stringify(permissions));
    if (isLoaded && isSupabaseConnected) syncPermissions(permissions).catch(console.warn);
  }, [permissions, isLoaded, isSupabaseConnected]);

  React.useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const dbData = await loadDataFromSupabase();
        if (mounted) {
          if (dbData.employees.length > 0) setEmployees(dbData.employees);
          else syncEmployees(employees).catch(console.warn);

          if (dbData.poBudgets.length > 0) setPoBudgets(dbData.poBudgets);
          else syncPoBudgets(poBudgets).catch(console.warn);

          if (dbData.accounts.length > 0) setAccounts(dbData.accounts);
          else syncAccounts(accounts).catch(console.warn);

          if (Object.keys(dbData.finConfig).length > 0) setFinConfig(dbData.finConfig);
          else syncFinConfig(finConfig).catch(console.warn);

          if (dbData.poAcceptances.length > 0) setPoAcceptances(dbData.poAcceptances);
          else syncPoAcceptances(poAcceptances).catch(console.warn);

          if (Object.keys(dbData.salaryOverrides).length > 0) setSalaryOverrides(dbData.salaryOverrides);
          else syncSalaryOverrides(salaryOverrides).catch(console.warn);

          if (Object.keys(dbData.safetyRecords).length > 0) setSafetyRecords(dbData.safetyRecords);
          else syncSafetyRecords(safetyRecords).catch(console.warn);

          if (dbData.users && dbData.users.length > 0) setSystemUsers(dbData.users);
          else syncUsers(systemUsers).catch(console.warn);

          if (dbData.escalations.length > 0) setEscalations(dbData.escalations);
          else syncEscalations(escalations).catch(console.warn);

          if (dbData.permissions.length > 0) setPermissions(dbData.permissions);
          else syncPermissions(permissions).catch(console.warn);

          setIsSupabaseConnected(true);
          setIsLoaded(true);
        }
      } catch (err) {
        console.warn("Failed to load data from Supabase", err);
        if (mounted) {
          // If connection fails, fallback to local storage
          setIsSupabaseConnected(false);
          setIsLoaded(true);
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  return (
    <AppContext.Provider
      value={{
        isSupabaseConnected,
        user,
        setUser,
        employees,
        visibleEmployees,
        setEmployees,
        poBudgets,
        visiblePoBudgets,
        setPoBudgets,
        poAcceptances,
        setPoAcceptances,
        salaryOverrides,
        setSalaryOverrides,
        safetyRecords,
        setSafetyRecords,
        positions,
        setPositions,
        accounts,
        visibleAccounts,
        setAccounts,
        projects,
        setProjects,
        finConfig,
        setFinConfig,
        systemUsers,
        setSystemUsers,
        escalations,
        setEscalations,
        permissions,
        setPermissions,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
