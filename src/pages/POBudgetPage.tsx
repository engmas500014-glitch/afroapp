import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
} from "../components/ui";
import { useAppContext, POBudget } from "../store/AppContext";
import {
  Download,
  Plus,
  Filter,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import { useNavigate } from "react-router-dom";


const formatVal = (val: number | undefined | null) => {
  if (!val) return "-";
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

import { parseFlexibleDate } from "../lib/utils";

export function POBudgetPage() {
  const {
    visiblePoBudgets: poBudgets,
    setPoBudgets,
    user,
    employees,
    salaryOverrides,
    finConfig,
    visibleAccounts: accounts,
    permissions,
  } = useAppContext();

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("All");
  const [selectedProject, setSelectedProject] = useState<string>("All");

  const activeProjectConfig = React.useMemo(() => {
    const defaultConf = finConfig["default"] || {
      labels: {
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
      },
      actualLabels: {},
      grossPercentages: {},
      customCategories: [],
      disabledCores: [],
    };

    if (selectedProject === "All" || !finConfig[selectedProject]) {
      return defaultConf;
    }

    const proj = finConfig[selectedProject];
    return {
      ...defaultConf,
      ...proj,
      labels: { ...defaultConf.labels, ...proj.labels },
      actualLabels: { ...defaultConf.actualLabels, ...proj.actualLabels },
      grossPercentages: { ...defaultConf.grossPercentages, ...proj.grossPercentages },
      disabledCores: proj.disabledCores && proj.disabledCores.length > 0 
        ? proj.disabledCores 
        : defaultConf.disabledCores,
    };
  }, [finConfig, selectedProject]);

  const activeLabels = activeProjectConfig.labels;

  const renderedCustomCategories = React.useMemo(() => {
    if (selectedProject !== "All" && finConfig[selectedProject]) {
      return finConfig[selectedProject].customCategories || [];
    }
    const unique = new Map();
    const allBudgets = poBudgets.filter(
      (b) =>
        b.year === selectedYear &&
        (selectedAccount === "All" || b.account === selectedAccount),
    );
    allBudgets.forEach((b) => {
      const pConf = finConfig[b.project] || finConfig["default"];
      pConf?.customCategories?.forEach((c: any) => unique.set(c.id, c));
    });
    return Array.from(unique.values()) as any[];
  }, [selectedProject, selectedYear, selectedAccount, finConfig, poBudgets]);

  const canEdit = hasPermission("PO & Budget", "Edit Budget Rows") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("PO & Budget", "Export Budget Rows") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";

  const uniqueAccounts = Array.from(
    new Set([
      ...accounts.map(a => a.name),
      ...poBudgets.map((p) => p.account)
    ].filter(Boolean)),
  );
  
  const configuredProjectsForAccount = selectedAccount !== "All"
      ? accounts.find(a => a.name === selectedAccount)?.projects || []
      : accounts.flatMap(a => a.projects);

  const filteredBudgetsForProjects =
    selectedAccount === "All"
      ? poBudgets
      : poBudgets.filter((p) => p.account === selectedAccount);
      
  const uniqueProjects = Array.from(
    new Set([
      ...configuredProjectsForAccount,
      ...filteredBudgetsForProjects.map((p) => p.project)
    ].filter(Boolean)),
  );

  const getGrossMultiplier = (projectName: string | undefined, key: string) => {
    const p = projectName && projectName !== "All" ? projectName : "default";
    const config = finConfig[p] || finConfig["default"] || {};
    const defaultGross = {
      poSalaries: 22,
      poOT: 22,
      poRetro: 22,
      poTopHero: 22,
    };
    const pct = config.grossPercentages?.[key] ?? (defaultGross as Record<string, number>)[key] ?? 0;
    return 1 + (pct / 100);
  };

  let baseBudgets = poBudgets.filter((p) => p.year === selectedYear);
  if (selectedAccount !== "All") {
    baseBudgets = baseBudgets.filter((p) => p.account === selectedAccount);
  }
  if (selectedProject !== "All") {
    baseBudgets = baseBudgets.filter((p) => p.project === selectedProject);
  }

  // Aggregate Actuals from Employees and Salary Overrides
  const filteredBudgets = baseBudgets.map((budget) => {
    const monthIndex = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ].indexOf(budget.month);
    const startOfBudgetMonth = new Date(budget.year, monthIndex, 1);
    const endOfBudgetMonth = new Date(budget.year, monthIndex + 1, 0);
    const totalDaysInMonth = endOfBudgetMonth.getDate();

    const calculateProratedSalary = (emp: any) => {
      const hiringDateLocal = parseFlexibleDate(emp.dateHiring);
      if (!hiringDateLocal) return 0;

      let resignDateLocal = parseFlexibleDate(emp.dateResign);

      const actualStart =
        hiringDateLocal > startOfBudgetMonth
          ? hiringDateLocal
          : startOfBudgetMonth;
      const actualEnd =
        resignDateLocal && resignDateLocal < endOfBudgetMonth
          ? resignDateLocal
          : endOfBudgetMonth;

      if (actualStart > actualEnd) return 0;

      const utcStart = Date.UTC(
        actualStart.getFullYear(),
        actualStart.getMonth(),
        actualStart.getDate(),
      );
      const utcEnd = Date.UTC(
        actualEnd.getFullYear(),
        actualEnd.getMonth(),
        actualEnd.getDate(),
      );

      const daysWorked =
        Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;

      if (daysWorked >= totalDaysInMonth) {
        return emp.netSalary;
      }
      return Math.round((emp.netSalary / totalDaysInMonth) * daysWorked);
    };

    const projectEmployees = employees.filter((e) => {
      if (e.account !== budget.account || e.project !== budget.project)
        return false;
      if (!e.dateHiring) return false;
      const [hYear, hMonth, hDay] = e.dateHiring.split("-").map(Number);
      const hiringDateLocal = new Date(hYear, hMonth - 1, hDay, 0, 0, 0);
      if (isNaN(hiringDateLocal.getTime())) return false;

      let resignDateLocal = null;
      if (e.dateResign) {
        const [rYear, rMonth, rDay] = e.dateResign.split("-").map(Number);
        resignDateLocal = new Date(rYear, rMonth - 1, rDay, 0, 0, 0);
      }
      if (hiringDateLocal > endOfBudgetMonth) return false;
      if (resignDateLocal && resignDateLocal < startOfBudgetMonth) return false;
      return true;
    });

    let actualSalaries = 0;
    let actualOT = 0;
    let actualGift = 0;
    let actualRetro = 0;
    let mobileAllowance = 0;
    let actualTopHero = 0;

    projectEmployees.forEach((emp) => {
      actualSalaries += calculateProratedSalary(emp);
      const key = `${emp.id}_${budget.month}_${budget.year}`;
      const ov = salaryOverrides[key];

      if (ov) {
        actualOT += ov.ot || 0;
        actualGift += ov.gift || 0;
        actualRetro += ov.retro || 0;
        mobileAllowance += ov.mobile || 0;
        actualTopHero += ov.topHero || 0;
      } else {
        actualOT += 0;
        actualGift += budget.month === "Mar" ? 500 : 0;
        actualRetro += 0;
        mobileAllowance += 334.21;
        actualTopHero += 0;
      }
    });

    const actualMedical = projectEmployees.length * 800;

    const gs = getGrossMultiplier(budget.project, "poSalaries");
    const go = getGrossMultiplier(budget.project, "poOT");
    const gr = getGrossMultiplier(budget.project, "poRetro");
    const gg = getGrossMultiplier(budget.project, "poGifts");
    const gth = getGrossMultiplier(budget.project, "poTopHero");
    const gb = getGrossMultiplier(budget.project, "poBreakfast");
    const ga = getGrossMultiplier(budget.project, "poAnnual");
    const gm = getGrossMultiplier(budget.project, "poMobile");
    const gmed = getGrossMultiplier(budget.project, "poMedical");
    const gl = getGrossMultiplier(budget.project, "poLaptop");

    const customActualSum = Object.keys(budget.customActualAllocations || {}).reduce((sum, key) => sum + ((budget.customActualAllocations && budget.customActualAllocations[key] ? budget.customActualAllocations[key] : 0) * getGrossMultiplier(budget.project, key as any)), 0);

    const totalActualCost =
      actualSalaries * gs +
      actualOT * go +
      actualRetro * gr +
      actualGift * gg +
      actualTopHero * gth +
      (budget.actualBreakfast || 0) * gb +
      (budget.actualAnnual || 0) * ga +
      mobileAllowance * gm +
      actualMedical * gmed +
      (budget.actualLaptop || 0) * gl +
      customActualSum;

    return {
      ...budget,
      poSalaries: budget.poSalaries || 0,
      poOT: budget.poOT || 0,
      poRetro: budget.poRetro || 0,
      poGifts: budget.poGifts || 0,
      poTopHero: budget.poTopHero || 0,
      poBreakfast: budget.poBreakfast || 0,
      poAnnual: budget.poAnnual || 0,
      poMobile: budget.poMobile || 0,
      poMedical: budget.poMedical || 0,
      poLaptop: budget.poLaptop || 0,
      actualBreakfast: budget.actualBreakfast || 0,
      actualAnnual: budget.actualAnnual || 0,
      actualLaptop: budget.actualLaptop || 0,
      budgetStaff: budget.noOfStaff || 0,
      currentStaffCount: projectEmployees.length,
      actualSalaries,
      actualOT,
      actualGift,
      actualRetro,
      mobileAllowance,
      actualTopHero,
      actualMedical,
      totalActualCost,
    };
  });

  const handleInlineUpdate = (id: string, field: keyof POBudget, value: any) => { setPoBudgets(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b)); };

  const handleCustomActualUpdate = (id: string, catId: string, value: number) => { setPoBudgets(prev => prev.map(b => { if (b.id !== id) return b; return { ...b, customActualAllocations: { ...(b.customActualAllocations || {}), [catId]: value } }; })); };

  // Calculate Totals
  const totalPOSalaries = filteredBudgets.reduce(
    (sum, p) => sum + (p.poSalaries || 0),
    0,
  );
  const totalActualSalaries = filteredBudgets.reduce(
    (sum, p) => sum + p.actualSalaries,
    0,
  );

  const totalPOOT = filteredBudgets.reduce((sum, p) => sum + (p.poOT || 0), 0);
  const totalActualOT = filteredBudgets.reduce((sum, p) => sum + p.actualOT, 0);

  const totalPORetro = filteredBudgets.reduce(
    (sum, p) => sum + (p.poRetro || 0),
    0,
  );
  const totalActualRetro = filteredBudgets.reduce(
    (sum, p) => sum + p.actualRetro,
    0,
  );

  const totalPOGifts = filteredBudgets.reduce(
    (sum, p) => sum + (p.poGifts || 0),
    0,
  );
  const totalActualGift = filteredBudgets.reduce(
    (sum, p) => sum + p.actualGift,
    0,
  );

  const totalPOTopHero = filteredBudgets.reduce(
    (sum, p) => sum + (p.poTopHero || 0),
    0,
  );
  const totalActualTopHero = filteredBudgets.reduce(
    (sum, p) => sum + (p.actualTopHero || 0),
    0,
  );

  const totalPOBreakfast = filteredBudgets.reduce(
    (sum, p) => sum + (p.poBreakfast || 0),
    0,
  );
  const totalActualBreakfast = filteredBudgets.reduce(
    (sum, p) => sum + (p.actualBreakfast || 0),
    0,
  );

  const totalPOAnnual = filteredBudgets.reduce(
    (sum, p) => sum + (p.poAnnual || 0),
    0,
  );
  const totalActualAnnual = filteredBudgets.reduce(
    (sum, p) => sum + (p.actualAnnual || 0),
    0,
  );

  const totalPOMobile = filteredBudgets.reduce(
    (sum, p) => sum + (p.poMobile || 0),
    0,
  );
  const totalActualMobile = filteredBudgets.reduce(
    (sum, p) => sum + (p.mobileAllowance || 0),
    0,
  );

  const totalPOMedical = filteredBudgets.reduce(
    (sum, p) => sum + (p.poMedical || 0),
    0,
  );
  const totalActualMedical = filteredBudgets.reduce(
    (sum, p) => sum + (p.actualMedical || 0),
    0,
  );

  const totalPOLaptop = filteredBudgets.reduce(
    (sum, p) => sum + (p.poLaptop || 0),
    0,
  );
  const totalActualLaptop = filteredBudgets.reduce(
    (sum, p) => sum + (p.actualLaptop || 0),
    0,
  );

  const totalPOSalariesGross = filteredBudgets.reduce((sum, p) => sum + p.poSalaries * getGrossMultiplier(p.project, "poSalaries"), 0);
  const totalActualSalariesGross = filteredBudgets.reduce((sum, p) => sum + p.actualSalaries * getGrossMultiplier(p.project, "poSalaries"), 0);
  const totalPOOTGross = filteredBudgets.reduce((sum, p) => sum + p.poOT * getGrossMultiplier(p.project, "poOT"), 0);
  const totalActualOTGross = filteredBudgets.reduce((sum, p) => sum + p.actualOT * getGrossMultiplier(p.project, "poOT"), 0);
  const totalPORetroGross = filteredBudgets.reduce((sum, p) => sum + p.poRetro * getGrossMultiplier(p.project, "poRetro"), 0);
  const totalActualRetroGross = filteredBudgets.reduce((sum, p) => sum + p.actualRetro * getGrossMultiplier(p.project, "poRetro"), 0);
  const totalPOTopHeroGross = filteredBudgets.reduce((sum, p) => sum + (p.poTopHero || 0) * getGrossMultiplier(p.project, "poTopHero"), 0);
  const totalActualTopHeroGross = filteredBudgets.reduce((sum, p) => sum + (p.actualTopHero || 0) * getGrossMultiplier(p.project, "poTopHero"), 0);

  const totalPO =
    totalPOSalaries +
    totalPOOT +
    totalPORetro +
    totalPOGifts +
    totalPOTopHero +
    totalPOBreakfast +
    totalPOAnnual +
    totalPOMobile +
    totalPOMedical +
    totalPOLaptop;

  const totalCostActual = filteredBudgets.reduce((sum, p) => sum + p.totalActualCost, 0);

  const netProfit = totalPO - totalCostActual;
  const burnRate = totalPO > 0 ? (totalCostActual / totalPO) * 100 : 0;

  const getBurnRateColor = (rate: number) => {
    if (rate > 100) return "text-red-600 bg-red-100";
    if (rate > 80) return "text-amber-600 bg-amber-100";
    return "text-emerald-600 bg-emerald-100";
  };

  const getStatusBadge = (budget: number, actual: number) => {
    const diff = budget - actual;
    if (diff < 0) return <Badge variant="destructive">Over</Badge>;
    if (budget > 0 && diff / budget < 0.2)
      return <Badge variant="warning">Warning</Badge>;
    return <Badge variant="success">OK</Badge>;
  };

  const costBreakdownData = [
    { name: "Salaries", value: totalActualSalaries, color: "#3b82f6" },
    { name: "Retro", value: totalActualRetro, color: "#6366f1" },
    {
      name: "Gifts & Hero",
      value: totalActualGift + totalActualTopHero,
      color: "#10b981",
    },
    {
      name: "Expenses",
      value:
        totalActualBreakfast +
        totalActualAnnual +
        totalActualMobile +
        totalActualMedical +
        totalActualLaptop,
      color: "#ec4899",
    },
  ].filter((d) => d.value > 0);

  const handleExport = () => {
    const headers = [
      "Project",
      "Month",
      "Year",
      "PO Amount",
      "Staff (Actual)",
      "PO of Staff",
      "PO Net Salaries",
      "Total Salary (Net)",
      "Bal. Salary (Net)",
      "PO Net Salaries Gross",
      "Total Salary Gross",
      "Bal. Salary Gross",
      "PO Net OT",
      "Total OT (Net)",
      "Bal. OT (Net)",
      "PO OT Gross",
      "Total OT Gross",
      "Bal. OT Gross",
      "PO Retro",
      "Total Retro",
      "Bal. Retro",
      "PO Retro Gross",
      "Total Retro Gross",
      "Bal. Retro Gross",
      "PO Gifts",
      "Total Gift",
      "Bal. Gifts",
      "PO Total Top Hero Bonus",
      "Total Top Hero Bonus",
      "Bal. Total Top Hero Bonus",
      "PO Total Top Hero Bonus Gross",
      "Total Top Hero Bonus Gross",
      "Bal. Total Top Hero Bonus Gross",
      "PO Breakfast",
      "Breakfast",
      "Bal. Breakfast",
      "PO Annual",
      "Annual",
      "Bal. Annual",
      "PO Mobile allowance",
      "Total Mobile Allowance",
      "Bal. Mobile Allowance",
      "PO Medical Issuance",
      "Medical Issuance",
      "Bal. Medical Issuance",
      "PO Laptop",
      "Laptop",
      "Bal. Laptop",
      ...renderedCustomCategories.flatMap(c => [
        `PO ${c.name}`,
        `Actual ${c.name}`,
        `Bal. ${c.name}`
      ]),
      ...(!activeProjectConfig.disabledCores?.includes("poNetProfit") ? [activeLabels.poNetProfit || "Net Profit"] : [])
    ];

    const rows = filteredBudgets.map((row) => {
      const gs = getGrossMultiplier(row.project, "poSalaries");
      const go = getGrossMultiplier(row.project, "poOT");
      const gr = getGrossMultiplier(row.project, "poRetro");
      const gg = getGrossMultiplier(row.project, "poGifts");
      const gth = getGrossMultiplier(row.project, "poTopHero");
      
      const balSal = row.poSalaries - row.actualSalaries;
      const balSalGross = row.poSalaries * gs - row.actualSalaries * gs;
      const balOT = row.poOT - row.actualOT;
      const balOTGross = row.poOT * go - row.actualOT * go;
      const balRetro = row.poRetro - row.actualRetro;
      const balRetroGross = row.poRetro * gr - row.actualRetro * gr;
      const balGifts = row.poGifts - row.actualGift;
      const balHero = row.poTopHero - (row.actualTopHero || 0);
      const balHeroGross =
        row.poTopHero * gth - (row.actualTopHero || 0) * gth;
      const balBreakfast = row.poBreakfast - row.actualBreakfast;
      const balAnnual = row.poAnnual - row.actualAnnual;
      const balMobile = row.poMobile - row.mobileAllowance;
      const balMedical = row.poMedical - row.actualMedical;
      const balLaptop = row.poLaptop - row.actualLaptop;

      const rowActualCost = row.totalActualCost;

      const rowNetProfit = row.poAmount - rowActualCost;

      return [
        `"${row.account} - ${row.project}"`,
        row.month,
        row.year,
        row.poAmount,
        row.currentStaffCount,
        row.budgetStaff,
        row.poSalaries,
        row.actualSalaries,
        balSal,
        row.poSalaries * gs,
        row.actualSalaries * gs,
        balSalGross,
        row.poOT,
        row.actualOT,
        balOT,
        row.poOT * go,
        row.actualOT * go,
        balOTGross,
        row.poRetro,
        row.actualRetro,
        balRetro,
        row.poRetro * gr,
        row.actualRetro * gr,
        balRetroGross,
        row.poGifts,
        row.actualGift,
        balGifts,
        row.poTopHero,
        row.actualTopHero,
        balHero,
        row.poTopHero * gth,
        (row.actualTopHero || 0) * gth,
        balHeroGross,
        row.poBreakfast,
        row.actualBreakfast,
        balBreakfast,
        row.poAnnual,
        row.actualAnnual,
        balAnnual,
        row.poMobile,
        row.mobileAllowance,
        balMobile,
        row.poMedical,
        row.actualMedical,
        balMedical,
        row.poLaptop,
        row.actualLaptop,
        balLaptop,
        ...renderedCustomCategories.flatMap(c => {
          const poVal = row.customAllocations?.[c.id] || 0;
          const actualVal = row.customActualAllocations?.[c.id] || 0;
          return [poVal, actualVal, poVal - actualVal];
        }),
        ...(!activeProjectConfig.disabledCores?.includes("poNetProfit") ? [rowNetProfit] : []),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `PO_Budget_Report_${selectedYear}_${selectedAccount}_${selectedProject}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            PO & Budget Management
          </h2>
          <p className="text-muted-fg">
            Track and forecast monthly project financials.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {canEdit && (
            <Button
              onClick={() => navigate("/po-entry")}
              className="bg-accent hover:bg-accent/90"
            >
              <Plus className="w-4 h-4 mr-2" /> Manage Budgets
            </Button>
          )}
          <select
            className="border-border rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 border"
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setSelectedProject("All");
            }}
          >
            <option value="All">All Accounts</option>
            {uniqueAccounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
          <select
            className="border-border rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 border"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="All">All Projects</option>
            {uniqueProjects.map((po) => (
              <option key={po} value={po}>
                {po}
              </option>
            ))}
          </select>
          <select
            className="border-border rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 border font-medium bg-card-bg"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total PO Amount", value: totalPO, prefix: "EGP" },
          {
            label: "Total Actual Cost",
            value: totalCostActual,
            prefix: "EGP",
            tooltip:
              "Total Actual Cost is the sum of all elements multiplied by their respective Gross Percentages.",
          },
          { label: "Total Remaining", value: netProfit, prefix: "EGP" },
          { label: "Portfolio Profit", value: netProfit, prefix: "EGP" },
        ].map((item, i) => (
          <Card
            key={i}
            className="hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="px-5 py-5" title={item.tooltip}>
              <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2 cursor-help flex items-center gap-1">
                {item.label}
              </p>
              <h4 className="text-2xl font-bold tracking-tight text-slate-900">
                {item.prefix}{" "}
                {item.value.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </h4>
            </div>
          </Card>
        ))}
        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <div className="px-5 py-5 flex flex-col justify-between h-full">
            <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
              Burn Rate
            </p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-2xl font-bold tracking-tight rounded-md",
                  getBurnRateColor(burnRate),
                )}
              >
                {burnRate.toFixed(1)}%
              </span>
              {burnRate > 100 ? (
                <ArrowUpRight className="text-red-600 w-5 h-5" />
              ) : (
                <ArrowDownRight className="text-emerald-600 w-5 h-5" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Grid (Excel like) */}
      <div className="table-container">
        <div className="border-b border-border bg-card-bg p-4 flex justify-between items-center">
          <h3 className="text-[0.8rem] font-bold text-ink flex items-center gap-2 uppercase tracking-wide">
            <LayoutDashboard className="w-4 h-4 text-accent" /> Master Financial
            Grid
          </h3>
          <div className="flex gap-2">
            <Badge variant="success">Under Budget</Badge>
            <Badge variant="warning">Near Limit</Badge>
            <Badge variant="destructive">Over Budget</Badge>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[600px] no-scrollbar">
          <table className="data-table min-w-max whitespace-nowrap">
            <thead>
              <tr className="bg-muted text-muted-fg uppercase text-[10px] tracking-wider">
                <th className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] w-[250px] bg-muted z-50 text-muted-fg text-left px-4 font-bold py-3 px-3 border-b">
                  Project
                </th>
                <th className="sticky left-[250px] shadow-[1px_0_0_0_var(--color-border)] w-[80px] bg-muted z-50 text-muted-fg text-center px-4 font-bold py-3 px-3 border-b">
                  Month
                </th>
                <th className="text-right bg-muted/80 min-w-[120px] py-3 px-3 border-b">
                  PO Amount
                </th>
                <th className="text-center py-3 px-3 border-b">Staff</th>
                <th className="text-center py-3 px-3 border-b">PO of Staff</th>

                {/* Salaries */}
                {!activeProjectConfig.disabledCores?.includes("poSalaries") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poSalaries ? `PO ${activeLabels.poSalaries}` : "PO Net Salaries"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poSalaries || "Actual Salaries"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Salary (Net)
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poSalaries ? `PO ${activeLabels.poSalaries} Gross` : "PO Net Salaries Gross"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  Total Salary Gross
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Salary Gross
                </th>

                </>)}

                {/* OT */}
                {!activeProjectConfig.disabledCores?.includes("poOT") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poOT ? `PO ${activeLabels.poOT}` : "PO Net OT"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poOT || "Actual OT"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. OT (Net)
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poOT ? `PO ${activeLabels.poOT} Gross` : "PO OT Gross"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  Total OT Gross
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. OT Gross
                </th>

                </>)}

                {/* Retro */}
                {!activeProjectConfig.disabledCores?.includes("poRetro") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poRetro ? `PO ${activeLabels.poRetro}` : "PO Retro"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poRetro || "Actual Retro"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Retro
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poRetro ? `PO ${activeLabels.poRetro} Gross` : "PO Retro Gross"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  Total Retro Gross
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Retro Gross
                </th>

                </>)}

                {/* Gifts */}
                {!activeProjectConfig.disabledCores?.includes("poGifts") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poGifts ? `PO ${activeLabels.poGifts}` : "PO Gifts"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poGifts || "Actual Gifts"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Gifts
                </th>

                </>)}

                {/* Top Hero */}
                {!activeProjectConfig.disabledCores?.includes("poTopHero") && (<>
                <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poTopHero ? `PO ${activeLabels.poTopHero}` : "PO Top Hero Bonus"}
                </th>
                <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poTopHero || "Actual Top Hero Bonus"}
                </th>
                <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Total Top Hero Bonus
                </th>
                <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poTopHero ? `PO ${activeLabels.poTopHero} Gross` : "PO Top Hero Bonus Gross"}
                </th>
                <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold">
                  Total Top Hero Bonus Gross
                </th>
                <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Total Top Hero Bonus Gross
                </th>

                </>)}

                {/* Breakfast */}
                {!activeProjectConfig.disabledCores?.includes("poBreakfast") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poBreakfast ? `PO ${activeLabels.poBreakfast}` : "PO Breakfast"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poBreakfast || "Actual Breakfast"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Breakfast
                </th>

                </>)}

                {/* Annual */}
                {!activeProjectConfig.disabledCores?.includes("poAnnual") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poAnnual ? `PO ${activeLabels.poAnnual}` : "PO Annual"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poAnnual || "Actual Annual"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Annual
                </th>

                </>)}

                {/* Mobile */}
                {!activeProjectConfig.disabledCores?.includes("poMobile") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poMobile ? `PO ${activeLabels.poMobile}` : "PO Mobile allowance"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poMobile || "Actual Mobile Allowance"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Mobile Allowance
                </th>

                </>)}

                {/* Medical */}
                {!activeProjectConfig.disabledCores?.includes("poMedical") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poMedical ? `PO ${activeLabels.poMedical}` : "PO Medical"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poMedical || "Actual Medical"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  Bal. Medical Issuance
                </th>

                </>)}

                {/* Laptop */}
                {!activeProjectConfig.disabledCores?.includes("poLaptop") && (<>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeLabels.poLaptop || "PO Laptop"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold">
                  {activeProjectConfig.actualLabels?.poLaptop || "Actual Laptop"}
                </th>
                <th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                  {activeLabels.poLaptop
                    ? `Bal. ${activeLabels.poLaptop}`
                    : "Bal. Laptop"}
                </th>

                </>)}

                {/* Custom Categories Headers */}
                {renderedCustomCategories.map((c) => (
                  <React.Fragment key={c.id}>
                    <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold">
                      PO {c.name}
                    </th>
                    <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold">
                      Actual {c.name}
                    </th>
                    <th className="text-right bg-muted/50 text-muted-fg border-x py-3 px-3 border-b font-bold text-accent">
                      Bal. {c.name}
                    </th>
                  </React.Fragment>
                ))}

                {!activeProjectConfig.disabledCores?.includes("poNetProfit") && <th className="text-right bg-muted/80 py-3 px-3 border-b">
                  {activeLabels.poNetProfit || "Net Profit"}
                </th>}
                <th className="text-center py-3 px-3 border-b">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-mono text-muted-fg">
              {filteredBudgets.map((row) => {
                const gs = getGrossMultiplier(row.project, "poSalaries");
                const go = getGrossMultiplier(row.project, "poOT");
                const gr = getGrossMultiplier(row.project, "poRetro");
                const gg = getGrossMultiplier(row.project, "poGifts");
                const gth = getGrossMultiplier(row.project, "poTopHero");
                
                const balSal = row.poSalaries - row.actualSalaries;
                const balSalGross = row.poSalaries * gs - row.actualSalaries * gs;
                const balOT = row.poOT - row.actualOT;
                const balOTGross = row.poOT * go - row.actualOT * go;
                const balRetro = row.poRetro - row.actualRetro;
                const balRetroGross = row.poRetro * gr - row.actualRetro * gr;
                const balGifts = row.poGifts - row.actualGift;
                const balHero = row.poTopHero - (row.actualTopHero || 0);
                const balHeroGross =
                  row.poTopHero * gth - (row.actualTopHero || 0) * gth;
                const balBreakfast =
                  row.poBreakfast - (row.actualBreakfast || 0);
                const balAnnual = row.poAnnual - (row.actualAnnual || 0);
                const balMobile = row.poMobile - row.mobileAllowance;
                const balMedical = row.poMedical - (row.actualMedical || 0);
                const balLaptop = row.poLaptop - (row.actualLaptop || 0);

                const rowActualCost = row.totalActualCost;

                const rowNetProfit = row.poAmount - rowActualCost;

                return (
                  <tr
                    key={row.id}
                    className="even:bg-muted/30 hover:bg-muted group border-b border-border h-[44px] transition-colors"
                  >
                    <td className="sticky left-0 bg-card-bg group-hover:bg-muted z-10 font-bold shadow-[1px_0_0_0_var(--color-border)] w-[250px] px-4">
                      {row.account && (
                        <span className="text-muted-fg/80 font-normal mr-1">
                          {row.account} /
                        </span>
                      )}
                      {row.project}
                    </td>
                    <td className="sticky left-[250px] bg-card-bg group-hover:bg-muted z-10 text-muted-fg shadow-[1px_0_0_0_var(--color-border)] w-[80px] text-center">
                      {row.month}
                    </td>
                    <td className="text-right font-bold text-ink bg-muted/50 px-4">
                      {formatVal(row.poAmount)}
                    </td>
                    <td className="text-center px-4">
                      {row.currentStaffCount}
                    </td>
                    <td className="text-center px-4">{row.budgetStaff}</td>

                    {/* Salaries */}
                    {!activeProjectConfig.disabledCores?.includes("poSalaries") && (<>
                    <td className="text-right bg-blue-50/10 border-x px-3">
                      {formatVal(row.poSalaries)}
                    </td>
                    <td className="text-right bg-blue-50/10 border-x px-3">
                      {formatVal(row.actualSalaries)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-blue-50/10 border-x px-3 font-bold",
                        balSal < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balSal)}
                    </td>
                    <td className="text-right bg-blue-50/10 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.poSalaries * gs)}
                    </td>
                    <td className="text-right bg-blue-50/10 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.actualSalaries * gs)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-blue-50/10 border-x px-3 font-bold",
                        balSalGross < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {balSalGross.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    </>)}

                    {/* OT */}
                    {!activeProjectConfig.disabledCores?.includes("poOT") && (<>
                    <td className="text-right bg-amber-50/10 border-x px-3">
                      {formatVal(row.poOT)}
                    </td>
                    <td className="text-right bg-amber-50/10 border-x px-3">
                      {formatVal(row.actualOT)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-amber-50/10 border-x px-3 font-bold",
                        balOT < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balOT)}
                    </td>
                    <td className="text-right bg-amber-50/10 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.poOT * go)}
                    </td>
                    <td className="text-right bg-amber-50/10 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.actualOT * go)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-amber-50/10 border-x px-3 font-bold",
                        balOTGross < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {balOTGross.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    </>)}

                    {/* Retro */}
                    {!activeProjectConfig.disabledCores?.includes("poRetro") && (<>
                    <td className="text-right bg-indigo-50/10 border-x px-3">
                      {formatVal(row.poRetro)}
                    </td>
                    <td className="text-right bg-indigo-50/10 border-x px-3">
                      {formatVal(row.actualRetro)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-indigo-50/10 border-x px-3 font-bold",
                        balRetro < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balRetro)}
                    </td>
                    <td className="text-right bg-indigo-50/10 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.poRetro * gr)}
                    </td>
                    <td className="text-right bg-indigo-50/10 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.actualRetro * gr)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-indigo-50/10 border-x px-3 font-bold",
                        balRetroGross < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {balRetroGross.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    </>)}

                    {/* Gifts */}
                    {!activeProjectConfig.disabledCores?.includes("poGifts") && (<>
                    <td className="text-right bg-emerald-50/10 border-x px-3">
                      {formatVal(row.poGifts)}
                    </td>
                    <td className="text-right bg-emerald-50/10 border-x px-3">
                      {formatVal(row.actualGift)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-emerald-50/10 border-x px-3 font-bold",
                        balGifts < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balGifts)}
                    </td>

                    </>)}

                    {/* Top Hero */}
                    {!activeProjectConfig.disabledCores?.includes("poTopHero") && (<>
                    <td className="text-right bg-muted/30 border-x px-3">
                      {formatVal(row.poTopHero)}
                    </td>
                    <td className="text-right bg-muted/30 border-x px-3 font-medium">
                      {formatVal(row.actualTopHero)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-muted/30 border-x px-3 font-bold",
                        balHero < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balHero)}
                    </td>
                    <td className="text-right bg-muted/30 border-x px-3 text-muted-fg font-medium">
                      {formatVal(row.poTopHero * gth)}
                    </td>
                    <td className="text-right bg-muted/30 border-x px-3 text-muted-fg font-medium">
                      {((row.actualTopHero || 0) * gth).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 },
                      )}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-muted/30 border-x px-3 font-bold",
                        balHeroGross < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {balHeroGross.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    </>)}

                    {/* Breakfast */}
                    {!activeProjectConfig.disabledCores?.includes("poBreakfast") && (<>
                    <td className="text-right bg-orange-50/10 border-x px-3">
                      {formatVal(row.poBreakfast)}
                    </td>
                    <td className="text-right bg-orange-50/10 border-x px-3 p-0">
                      <input
                        type="number"
                        step="any"
                        value={row.actualBreakfast ?? ""}
                        onChange={(e) =>
                          handleInlineUpdate(
                            row.id,
                            "actualBreakfast",
                            Number(e.target.value),
                          )
                        }
                        className="w-full h-10 bg-transparent text-right outline-none px-3 focus:bg-card-bg transition-colors"
                      />
                    </td>
                    <td
                      className={cn(
                        "text-right bg-orange-50/10 border-x px-3 font-bold",
                        balBreakfast < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balBreakfast)}
                    </td>

                    </>)}

                    {/* Annual */}
                    {!activeProjectConfig.disabledCores?.includes("poAnnual") && (<>
                    <td className="text-right bg-purple-50/10 border-x px-3">
                      {formatVal(row.poAnnual)}
                    </td>
                    <td className="text-right bg-purple-50/10 border-x px-3 p-0">
                      <input
                        type="number"
                        step="any"
                        value={row.actualAnnual ?? ""}
                        onChange={(e) =>
                          handleInlineUpdate(
                            row.id,
                            "actualAnnual",
                            Number(e.target.value),
                          )
                        }
                        className="w-full h-10 bg-transparent text-right outline-none px-3 focus:bg-card-bg transition-colors"
                      />
                    </td>
                    <td
                      className={cn(
                        "text-right bg-purple-50/10 border-x px-3 font-bold",
                        balAnnual < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balAnnual)}
                    </td>

                    </>)}

                    {/* Mobile */}
                    {!activeProjectConfig.disabledCores?.includes("poMobile") && (<>
                    <td className="text-right bg-cyan-50/10 border-x px-3">
                      {formatVal(row.poMobile)}
                    </td>
                    <td className="text-right bg-cyan-50/10 border-x px-3">
                      {formatVal(row.mobileAllowance)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-cyan-50/10 border-x px-3 font-bold",
                        balMobile < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balMobile)}
                    </td>

                    </>)}

                    {/* Medical */}
                    {!activeProjectConfig.disabledCores?.includes("poMedical") && (<>
                    <td className="text-right bg-rose-50/10 border-x px-3">
                      {formatVal(row.poMedical)}
                    </td>
                    <td className="text-right bg-rose-50/10 border-x px-3 font-medium">
                      {formatVal(row.actualMedical)}
                    </td>
                    <td
                      className={cn(
                        "text-right bg-rose-50/10 border-x px-3 font-bold",
                        balMedical < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balMedical)}
                    </td>

                    </>)}

                    {/* Laptop */}
                    {!activeProjectConfig.disabledCores?.includes("poLaptop") && (<>
                    <td className="text-right bg-teal-50/10 border-x px-3">
                      {formatVal(row.poLaptop)}
                    </td>
                    <td className="text-right bg-teal-50/10 border-x px-3 p-0">
                      <input
                        type="number"
                        step="any"
                        value={row.actualLaptop ?? ""}
                        onChange={(e) =>
                          handleInlineUpdate(
                            row.id,
                            "actualLaptop",
                            Number(e.target.value),
                          )
                        }
                        className="w-full h-10 bg-transparent text-right outline-none px-3 focus:bg-card-bg transition-colors"
                      />
                    </td>
                    <td
                      className={cn(
                        "text-right bg-teal-50/10 border-x px-3 font-bold",
                        balLaptop < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(balLaptop)}
                    </td>

                    </>)}

                    {/* Custom Categories Rows */}
                    {renderedCustomCategories.map((c) => {
                      const poVal = row.customAllocations?.[c.id] || 0;
                      const actVal = row.customActualAllocations?.[c.id] || 0;
                      const balVal = poVal - actVal;
                      return (
                        <React.Fragment key={c.id}>
                          <td className="text-right bg-muted/50 border-x px-3">
                            {formatVal(poVal)}
                          </td>
                          <td className="text-right bg-muted/50 border-x px-3 p-0">
                             <input
                              type="number"
                              step="any"
                              value={row.customActualAllocations?.[c.id] ?? ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleCustomActualUpdate(
                                  row.id,
                                  c.id,
                                  Number(e.target.value),
                                )
                              }
                              className="w-[80px] h-[40px] bg-transparent text-right outline-none px-3 focus:bg-card-bg transition-colors inline-block"
                            />
                          </td>
                          <td className={cn("text-right bg-muted/50 border-x px-3 font-bold", balVal < 0 ? "text-danger" : "text-success")}>
                            {formatVal(balVal)}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {!activeProjectConfig.disabledCores?.includes("poNetProfit") && <td
                      className={cn(
                        "text-right font-bold bg-muted/50 px-4",
                        rowNetProfit < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {formatVal(rowNetProfit)}
                    </td>}
                    <td className="text-center px-4">
                      {getStatusBadge(row.poAmount, rowActualCost)}
                    </td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              {filteredBudgets.length > 0 && (
                <tr className="bg-muted font-bold text-ink h-12 border-t-[3px] border-border shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                  <td className="sticky left-0 bg-muted z-30 shadow-[1px_0_0_0_var(--color-border)] w-[250px] px-4 font-black">
                    TOTAL ACTUAL
                  </td>
                  <td className="sticky left-[250px] bg-muted z-30 shadow-[1px_0_0_0_var(--color-border)] w-[80px] text-center">
                    YTD
                  </td>
                  <td className="text-right bg-muted/50 px-4">
                    {formatVal(totalPO)}
                  </td>
                  <td colSpan={2}></td>

                  {/* Salaries */}
                  {!activeProjectConfig.disabledCores?.includes("poSalaries") && (<>
                  <td className="text-right bg-blue-100/50 border-x px-3">
                    {formatVal(totalPOSalaries)}
                  </td>
                  <td className="text-right bg-blue-100/50 border-x px-3">
                    {formatVal(totalActualSalaries)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-blue-100/50 border-x px-3",
                      totalPOSalaries - totalActualSalaries < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOSalaries - totalActualSalaries)}
                  </td>
                  <td className="text-right bg-blue-100/50 border-x px-3">
                    {totalPOSalariesGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="text-right bg-blue-100/50 border-x px-3">
                    {totalActualSalariesGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-blue-100/50 border-x px-3 font-bold",
                      totalPOSalariesGross - totalActualSalariesGross < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(
                      totalPOSalariesGross -
                      totalActualSalariesGross
                    )}
                  </td>
                  </>)}


                  {/* OT */}
                  {!activeProjectConfig.disabledCores?.includes("poOT") && (<>
                  <td className="text-right bg-amber-100/50 border-x px-3">
                    {formatVal(totalPOOT)}
                  </td>
                  <td className="text-right bg-amber-100/50 border-x px-3">
                    {formatVal(totalActualOT)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-amber-100/50 border-x px-3",
                      totalPOOT - totalActualOT < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOOT - totalActualOT)}
                  </td>
                  <td className="text-right bg-amber-100/50 border-x px-3 text-muted-fg">
                    {totalPOOTGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="text-right bg-amber-100/50 border-x px-3 text-muted-fg">
                    {totalActualOTGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-amber-100/50 border-x px-3 font-bold",
                      totalPOOTGross - totalActualOTGross < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOOTGross - totalActualOTGross)}
                  </td>
                  </>)}


                  {/* Retro */}
                  {!activeProjectConfig.disabledCores?.includes("poRetro") && (<>
                  <td className="text-right bg-indigo-100/50 border-x px-3">
                    {formatVal(totalPORetro)}
                  </td>
                  <td className="text-right bg-indigo-100/50 border-x px-3">
                    {formatVal(totalActualRetro)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-indigo-100/50 border-x px-3",
                      totalPORetro - totalActualRetro < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPORetro - totalActualRetro)}
                  </td>
                  <td className="text-right bg-indigo-100/50 border-x px-3 text-muted-fg">
                    {totalPORetroGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="text-right bg-indigo-100/50 border-x px-3 text-muted-fg">
                    {totalActualRetroGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-indigo-100/50 border-x px-3 font-bold",
                      totalPORetroGross - totalActualRetroGross < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(
                      totalPORetroGross -
                      totalActualRetroGross
                    )}
                  </td>
                  </>)}


                  {/* Gifts */}
                  {!activeProjectConfig.disabledCores?.includes("poGifts") && (<>
                  <td className="text-right bg-emerald-100/50 border-x px-3">
                    {formatVal(totalPOGifts)}
                  </td>
                  <td className="text-right bg-emerald-100/50 border-x px-3">
                    {formatVal(totalActualGift)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-emerald-100/50 border-x px-3",
                      totalPOGifts - totalActualGift < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOGifts - totalActualGift)}
                  </td>
                  </>)}


                  {/* Top Hero */}
                  {!activeProjectConfig.disabledCores?.includes("poTopHero") && (<>
                  <td className="text-right bg-muted/80/50 border-x px-3">
                    {formatVal(totalPOTopHero)}
                  </td>
                  <td className="text-right bg-muted/80/50 border-x px-3">
                    {formatVal(totalActualTopHero)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-muted/80/50 border-x px-3 font-bold",
                      totalPOTopHero - totalActualTopHero < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOTopHero - totalActualTopHero)}
                  </td>
                  <td className="text-right bg-muted/80/50 border-x px-3 text-muted-fg">
                    {totalPOTopHeroGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="text-right bg-muted/80/50 border-x px-3 text-muted-fg">
                    {totalActualTopHeroGross.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-muted/80/50 border-x px-3 font-bold",
                      totalPOTopHeroGross - totalActualTopHeroGross < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(
                      totalPOTopHeroGross -
                      totalActualTopHeroGross
                    )}
                  </td>
                  </>)}


                  {/* Breakfast */}
                  {!activeProjectConfig.disabledCores?.includes("poBreakfast") && (<>
                  <td className="text-right bg-orange-100/50 border-x px-3">
                    {formatVal(totalPOBreakfast)}
                  </td>
                  <td className="text-right bg-orange-100/50 border-x px-3">
                    {formatVal(totalActualBreakfast)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-orange-100/50 border-x px-3 font-bold",
                      totalPOBreakfast - totalActualBreakfast < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOBreakfast - totalActualBreakfast)}
                  </td>
                  </>)}


                  {/* Annual */}
                  {!activeProjectConfig.disabledCores?.includes("poAnnual") && (<>
                  <td className="text-right bg-purple-100/50 border-x px-3">
                    {formatVal(totalPOAnnual)}
                  </td>
                  <td className="text-right bg-purple-100/50 border-x px-3">
                    {formatVal(totalActualAnnual)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-purple-100/50 border-x px-3 font-bold",
                      totalPOAnnual - totalActualAnnual < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOAnnual - totalActualAnnual)}
                  </td>
                  </>)}


                  {/* Mobile */}
                  {!activeProjectConfig.disabledCores?.includes("poMobile") && (<>
                  <td className="text-right bg-cyan-100/50 border-x px-3">
                    {formatVal(totalPOMobile)}
                  </td>
                  <td className="text-right bg-cyan-100/50 border-x px-3">
                    {formatVal(totalActualMobile)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-cyan-100/50 border-x px-3",
                      totalPOMobile - totalActualMobile < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOMobile - totalActualMobile)}
                  </td>
                  </>)}


                  {/* Medical */}
                  {!activeProjectConfig.disabledCores?.includes("poMedical") && (<>
                  <td className="text-right bg-rose-100/50 border-x px-3">
                    {formatVal(totalPOMedical)}
                  </td>
                  <td className="text-right bg-rose-100/50 border-x px-3">
                    {formatVal(totalActualMedical)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-rose-100/50 border-x px-3 font-bold",
                      totalPOMedical - totalActualMedical < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOMedical - totalActualMedical)}
                  </td>
                  </>)}


                  {/* Laptop */}
                  {!activeProjectConfig.disabledCores?.includes("poLaptop") && (<>
                  <td className="text-right bg-teal-100/50 border-x px-3">
                    {formatVal(totalPOLaptop)}
                  </td>
                  <td className="text-right bg-teal-100/50 border-x px-3">
                    {formatVal(totalActualLaptop)}
                  </td>
                  <td
                    className={cn(
                      "text-right bg-teal-100/50 border-x px-3 font-bold",
                      totalPOLaptop - totalActualLaptop < 0
                        ? "text-danger"
                        : "text-success",
                    )}
                  >
                    {formatVal(totalPOLaptop - totalActualLaptop)}
                  </td>
                  </>)}


                  {/* Custom Categories Footers */}
                  {renderedCustomCategories.map((c) => {
                    const totalPoForCategory = filteredBudgets.reduce(
                      (sum, row) => sum + (row.customAllocations?.[c.id] || 0),
                      0,
                    );
                    const totalActualForCategory = filteredBudgets.reduce((sum, row) => sum + (row.customActualAllocations?.[c.id] || 0), 0);
                    const bal = totalPoForCategory - totalActualForCategory;
                    return (
                      <React.Fragment key={c.id}>
                        <td className="text-right bg-muted/80/50 border-x px-3">
                          {formatVal(totalPoForCategory)}
                        </td>
                        <td className="text-right bg-muted/80/50 border-x px-3">
                          {formatVal(totalActualForCategory)}
                        </td>
                        <td className={cn("text-right bg-muted/80/50 border-x px-3 font-bold", bal < 0 ? "text-danger" : "text-success")}>
                          {formatVal(bal)}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td
                    colSpan={!activeProjectConfig.disabledCores?.includes("poNetProfit") ? 2 : 1}
                    className={cn(
                      "text-right px-4",
                      netProfit < 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {!activeProjectConfig.disabledCores?.includes("poNetProfit") ? formatVal(netProfit) : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>PO vs Actual Breakdown (Monthly)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full min-h-[300px]">
            {costBreakdownData.reduce((sum, item) => sum + item.value, 0) === 0 && totalPO === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart
                data={filteredBudgets}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-card-bg)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Bar
                  dataKey="poAmount"
                  name="PO Amount"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalActualCost"
                  name="Total Actual Cost"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="poSalaries"
                  name="Salaries"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="poOT"
                  name="OT"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="poGift"
                  name="Gift"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[300px] w-full min-h-[300px] items-center justify-center">
            {costBreakdownData.reduce((sum, item) => sum + item.value, 0) === 0 && totalPO === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `EGP ${formatVal(value)}`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "13px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
