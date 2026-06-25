import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { useAppContext } from "../store/AppContext";
import { Users, DollarSign, Activity, Wallet } from "lucide-react";
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
  const { visibleEmployees: employees, visiblePoBudgets: poBudgets, salaryOverrides, finConfig } = useAppContext();

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

  const activeEmployees = employees.filter((e) => e.status === "Active").length;
  const totalSalaries = employees
    .filter((e) => e.status === "Active")
    .reduce((sum, e) => sum + e.netSalary, 0);

  const currentYearBudgets = poBudgets.filter(
    (p) => p.year === new Date().getFullYear(),
  );

  const computedBudgets = currentYearBudgets.map((budget) => {
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
      (budget.actualLaptop || 0) * gl;

    return {
      ...budget,
      totalActualCost,
    };
  });

  const totalPOAmount = computedBudgets.reduce(
    (sum, p) => sum + (p.poAmount || 0),
    0,
  );
  const totalCost = computedBudgets.reduce(
    (sum, p) => sum + p.totalActualCost,
    0,
  );
  const remainingBudget = totalPOAmount - totalCost;
  const burnRate = totalPOAmount ? (totalCost / totalPOAmount) * 100 : 0;

  const chartData = computedBudgets.map((po) => ({
    month: po.month,
    PO: po.poAmount,
    Actual: po.totalActualCost,
  }));

  const statCards = [
    {
      title: "Active Employees",
      value: activeEmployees,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Total PO Amount (YTD)",
      value: `${totalPOAmount.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Total Actual Cost",
      value: `${totalCost.toLocaleString()}`,
      icon: Activity,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      title: "Remaining Budget",
      value: `${remainingBudget.toLocaleString()}`,
      icon: Wallet,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-fg">Overview of HR and Financial metrics.</p>
      </div>

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
                <h4 className="text-2xl font-bold tracking-tight text-slate-900">
                  {stat.value}
                </h4>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>PO vs Actual Cost (Monthly)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full min-h-[300px]">
            {chartData && (chartData.length === 0 || chartData.every(d => d.po === 0 && d.actual === 0)) ? (
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
                  tick={{ fontSize: 12 }}
                  dy={10}
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
            {chartData && (chartData.length === 0 || chartData.every(d => d.po === 0 && d.actual === 0)) ? (
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
                  tick={{ fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-card-bg)",
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
