import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { useAppContext } from "../store/AppContext";
import { Users, DollarSign, Activity, Wallet, Calendar, Filter } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

import { parseFlexibleDate } from "../lib/utils";

export function DashboardPage() {
  const { visibleEmployees: employees, visiblePoBudgets: poBudgets, salaryOverrides, safetyRecords, poAcceptances } = useAppContext();

  // Filter options are built from the employees the cost figures come from —
  // poBudgets is often empty, which used to leave these dropdowns with no options.
  const uniqueAccounts = Array.from(
    new Set(
      [...employees.map((e) => e.account), ...poBudgets.map((p) => p.account)].filter(
        (v): v is string => Boolean(v),
      ),
    ),
  ).sort();

  const [selectedAccount, setSelectedAccount] = React.useState<string>("All");
  const [selectedProject, setSelectedProject] = React.useState<string>("All");

  const uniqueProjects = Array.from(
    new Set(
      [
        ...employees
          .filter((e) => selectedAccount === "All" || e.account === selectedAccount)
          .map((e) => e.project),
        ...poBudgets
          .filter((p) => selectedAccount === "All" || p.account === selectedAccount)
          .map((p) => p.project),
      ].filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  // Offer every year the data covers, plus the current one. Building this from
  // poBudgets alone left the picker stuck on whatever years that table happened
  // to hold, even when the acceptances were for another year.
  const availableYears: number[] = Array.from(
    new Set<number>([
      ...poAcceptances.map((a) => Number(a.year)),
      ...poBudgets.map((b) => Number(b.year)),
      new Date().getFullYear(),
    ].filter((y) => Number.isFinite(y))),
  ).sort((a: number, b: number) => b - a);

  // Default to current year if available, otherwise latest available year
  const defaultYear = availableYears.includes(new Date().getFullYear())
    ? new Date().getFullYear()
    : (availableYears[0] || new Date().getFullYear());

  const [selectedYear, setSelectedYear] = React.useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = React.useState<string>("All");

  const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Filter active employees based on current account, project, and month
  const activeEmployees = employees.filter((e) => {
    if (e.status !== "Active") return false;
    if (selectedAccount !== "All" && e.account !== selectedAccount) return false;
    if (selectedProject !== "All" && e.project !== selectedProject) return false;
    
    if (selectedMonth !== "All") {
      const monthIndex = monthsOrder.indexOf(selectedMonth);
      if (monthIndex !== -1) {
        const startOfBudgetMonth = new Date(selectedYear, monthIndex, 1);
        const endOfBudgetMonth = new Date(selectedYear, monthIndex + 1, 0);
        
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
      }
    }
    return true;
  }).length;

  // Total cost for one month, computed exactly like the Total Cost page:
  // gross salary + allowances + mobile + safety + other cost, per employee.
  const employeeCostForMonth = (month: string, year: number) => {
    const monthIndex = monthsOrder.indexOf(month);
    if (monthIndex === -1) return 0;

    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return employees.reduce((sum, emp) => {
      if (selectedAccount !== "All" && emp.account !== selectedAccount) return sum;
      if (selectedProject !== "All" && emp.project !== selectedProject) return sum;

      const hiringDate = parseFlexibleDate(emp.dateHiring);
      if (!hiringDate || hiringDate > endOfMonth) return sum;
      const resignDate = parseFlexibleDate(emp.dateResign);
      if (resignDate && resignDate < startOfMonth) return sum;

      const actualStart = hiringDate > startOfMonth ? hiringDate : startOfMonth;
      const actualEnd = resignDate && resignDate < endOfMonth ? resignDate : endOfMonth;
      if (actualStart > actualEnd) return sum;

      const utcStart = Date.UTC(actualStart.getFullYear(), actualStart.getMonth(), actualStart.getDate());
      const utcEnd = Date.UTC(actualEnd.getFullYear(), actualEnd.getMonth(), actualEnd.getDate());
      const daysWorked = Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
      const baseSalary = emp.netSalary || 0;
      const netSalary =
        daysWorked >= totalDaysInMonth
          ? baseSalary
          : Math.round((baseSalary / totalDaysInMonth) * daysWorked);

      const gross =
        netSalary +
        (emp.socialInsuranceEmployee || 0) +
        (emp.socialInsuranceCompany || 0) +
        (emp.taxes || 0) +
        (emp.medical || 0);

      const key = `${emp.id}_${month}_${year}`;
      const ov = salaryOverrides[key];
      const ot = ov?.ot || 0;
      const topHero = ov?.topHero || 0;
      const gift = ov ? ov.gift || 0 : month === "Mar" ? 500 : 0;
      const retro = ov?.retro || 0;
      const mobile = ov ? ov.mobile || 0 : 0;
      const laptop = ov?.laptop !== undefined ? ov.laptop : ov?.bonus || 0;
      const otherCostNet = ov?.otherCostNet || 0;

      const sr = safetyRecords[key];
      const safety = sr
        ? (sr.medicalCheck || 0) +
          (sr.workingAtHeight || 0) +
          (sr.electricity || 0) +
          (sr.riskAssessment || 0) +
          (sr.fireFighting || 0) +
          (sr.firstAid || 0) +
          (sr.ppe || 0)
        : 0;

      return sum + gross + ot + topHero + gift + retro + mobile + safety + laptop + otherCostNet;
    }, 0);
  };

  // Build a map of poNumber -> { accounts: Set<string>, projects: Set<string> }
  const poMapping = React.useMemo(() => {
    const map: Record<string, { accounts: Set<string>; projects: Set<string> }> = {};
    const monthsToCheck = selectedMonth === "All"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : [selectedMonth];

    employees.forEach((emp) => {
      monthsToCheck.forEach((m) => {
        const key = `${emp.id}_${m}_${selectedYear}`;
        const ov = salaryOverrides[key];
        if (ov && ov.poNumbers) {
          ov.poNumbers.forEach((poNum) => {
            if (!poNum) return;
            if (!map[poNum]) {
              map[poNum] = { accounts: new Set(), projects: new Set() };
            }
            if (emp.account) map[poNum].accounts.add(emp.account);
            if (emp.project) map[poNum].projects.add(emp.project);
          });
        }
      });
    });
    return map;
  }, [employees, salaryOverrides, selectedYear, selectedMonth]);

  // Calculate totalPOAmount from poAcceptances instead of poBudgets
  const totalPOAmount = React.useMemo(() => {
    const yearAcceptances = poAcceptances.filter((r) => r.year === selectedYear);
    
    const activeAcceptances = selectedMonth === "All"
      ? yearAcceptances
      : yearAcceptances.filter((r) => r.month === selectedMonth);

    const filteredAccs = activeAcceptances.filter((r) => {
      if (selectedAccount !== "All") {
        const info = poMapping[r.poNumber];
        if (!info || !info.accounts.has(selectedAccount)) return false;
      }
      if (selectedProject !== "All") {
        const info = poMapping[r.poNumber];
        if (!info || !info.projects.has(selectedProject)) return false;
      }
      return true;
    });

    const uniquePoNumbers = Array.from(new Set(filteredAccs.map((r) => r.poNumber).filter(Boolean)));
    
    return uniquePoNumbers.reduce((sum, poNum) => {
      const globalAmount = poAcceptances
        .filter((r) => r.poNumber === poNum)
        .reduce((s, r) => s + (Number(r.amountPo) || 0), 0);
      return sum + globalAmount;
    }, 0);
  }, [poAcceptances, selectedYear, selectedMonth, selectedAccount, selectedProject, poMapping]);

  // "All Months" means year-to-date: future months have no actual data yet, so
  // including them would report projected salaries as actual cost.
  const today = new Date();
  const elapsedMonths =
    selectedYear < today.getFullYear()
      ? 12
      : selectedYear > today.getFullYear()
        ? 0
        : today.getMonth() + 1;

  const shownMonths =
    selectedMonth === "All" ? monthsOrder.slice(0, elapsedMonths) : [selectedMonth];

  const totalCost = shownMonths.reduce(
    (sum, m) => sum + employeeCostForMonth(m, selectedYear),
    0,
  );
  const remainingBudget = totalPOAmount - totalCost;

  // Monthly chart data, in calendar order
  const chartData = shownMonths
    .map((month) => {
      // Find PO amount from poAcceptances for this specific month
      const monthAcceptances = poAcceptances.filter((r) => r.year === selectedYear && r.month === month);
      const filteredAccs = monthAcceptances.filter((r) => {
        if (selectedAccount !== "All") {
          const info = poMapping[r.poNumber];
          if (!info || !info.accounts.has(selectedAccount)) return false;
        }
        if (selectedProject !== "All") {
          const info = poMapping[r.poNumber];
          if (!info || !info.projects.has(selectedProject)) return false;
        }
        return true;
      });

      const uniquePoNumbers = Array.from(new Set(filteredAccs.map((r) => r.poNumber).filter(Boolean)));
      const monthPOAmount = uniquePoNumbers.reduce((sum, poNum) => {
        const globalAmount = poAcceptances
          .filter((r) => r.poNumber === poNum)
          .reduce((s, r) => s + (Number(r.amountPo) || 0), 0);
        return sum + globalAmount;
      }, 0);

      return {
        month,
        PO: monthPOAmount,
        Actual: employeeCostForMonth(month, selectedYear),
      };
    });

  const statCards = [
    {
      title: selectedMonth === "All" ? "Active Employees" : `Active Employees (${selectedMonth})`,
      value: activeEmployees,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: selectedMonth === "All" ? "Total PO Amount (YTD)" : `Total PO Amount (${selectedMonth})`,
      value: `${totalPOAmount.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: selectedMonth === "All" ? "Total Actual Cost" : `Actual Cost (${selectedMonth})`,
      value: `${totalCost.toLocaleString()}`,
      icon: Activity,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      title: selectedMonth === "All" ? "Remaining Budget" : `Remaining Budget (${selectedMonth})`,
      value: `${remainingBudget.toLocaleString()}`,
      icon: Wallet,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-fg">Overview of HR and Financial metrics.</p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2 bg-card-bg p-2 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-muted-fg">
            <Filter className="w-3.5 h-3.5 text-accent" />
            <span>Filters</span>
          </div>
          
          <select
            className="border-border rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-accent border bg-card-bg text-ink"
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
            className="border-border rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-accent border bg-card-bg text-ink"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="All">All Projects</option>
            {uniqueProjects.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
          </select>

          <select
            className="border-border rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-accent border bg-card-bg text-ink font-medium"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="All">All Months</option>
            {monthsOrder.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="border-border rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-accent border bg-card-bg text-ink font-medium"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="hover:-translate-y-1 transition-transform duration-300"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-4 rounded-xl flex-shrink-0 ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-1">
                  {stat.title}
                </p>
                <h4 className="text-2xl font-bold tracking-tight text-ink">
                  {stat.value}
                </h4>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>PO vs Actual Cost (Monthly)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full min-h-[300px]">
            {chartData && (chartData.length === 0 || chartData.every(d => (d.PO || 0) === 0 && (d.Actual || 0) === 0)) ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                    tick={{ fontSize: 12, fill: "var(--color-muted-fg)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-fg)" }}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-card-bg)",
                      color: "var(--color-ink)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="PO"
                    fill="var(--color-muted-fg)"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                  <Bar
                    dataKey="Actual"
                    fill="var(--color-accent)"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenditure Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full min-h-[300px]">
            {chartData && (chartData.length === 0 || chartData.every(d => (d.PO || 0) === 0 && (d.Actual || 0) === 0)) ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                    tick={{ fontSize: 12, fill: "var(--color-muted-fg)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-fg)" }}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-card-bg)",
                      color: "var(--color-ink)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Actual"
                    stroke="var(--color-success)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

