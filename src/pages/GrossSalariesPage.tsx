import React, { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, Button, Input } from "../components/ui";
import { useAppContext, Employee } from "../store/AppContext";
import { Search, Download, Upload } from "lucide-react";
import { cn, parseFlexibleDate } from "../lib/utils";
import { parseGrossImport } from "../lib/salaryImport";

const formatVal = (val: number | undefined | null) => {
  if (!val) return "-";
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export function GrossSalariesPage() {
  const { employees, visibleEmployees, setEmployees, user, permissions } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMonth, setSelectedMonth] = useState("Jan");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const years = [2024, 2025, 2026, 2027];

  const selectedMonthIndex = months.indexOf(selectedMonth);
  const startOfSelectedMonth = new Date(selectedYear, selectedMonthIndex, 1);
  const endOfSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0, 23, 59, 59);
  const totalDaysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

  const calculateProratedSalary = (emp: Employee) => {
    const hiringDateLocal = parseFlexibleDate(emp.dateHiring);
    if (!hiringDateLocal) return 0;

    let resignDateLocal = parseFlexibleDate(emp.dateResign);

    const actualStart =
      hiringDateLocal > startOfSelectedMonth
        ? hiringDateLocal
        : startOfSelectedMonth;
    const actualEnd =
      resignDateLocal && resignDateLocal < endOfSelectedMonth
        ? resignDateLocal
        : endOfSelectedMonth;

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
      return emp.netSalary || 0;
    }

    return Math.round(((emp.netSalary || 0) / totalDaysInMonth) * daysWorked);
  };

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("Gross Salaries", "Manage Gross Salaries") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("Gross Salaries", "Export Gross Salaries") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canImport = canEdit;

  const handleUpdate = (empId: string, field: keyof Employee, value: number) => {
    setEmployees((prev) => 
      prev.map((e) => (e.id === empId ? { ...e, [field]: value || 0 } : e))
    );
  };

  const filteredEmployees = visibleEmployees.filter((emp) => {
    const hiringDateLocal = parseFlexibleDate(emp.dateHiring);
    if (!hiringDateLocal) return false;

    let resignDateLocal = parseFlexibleDate(emp.dateResign);

    if (hiringDateLocal > endOfSelectedMonth) return false;
    if (resignDateLocal && resignDateLocal < startOfSelectedMonth) return false;

    return (
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.hrCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const res = parseGrossImport(String(event.target?.result || ""), employees);
        if (res.error) {
          alert(res.error);
          return;
        }
        setEmployees((prev) =>
          prev.map((emp) =>
            res.updates.has(emp.id) ? { ...emp, ...res.updates.get(emp.id)! } : emp,
          ),
        );
        alert(
          `تم استيراد ${res.matched} موظف` +
            (res.unmatched ? ` — ${res.unmatched} صف مش متطابق` : ""),
        );
      } catch (error) {
        console.error("Error parsing CSV", error);
        alert("فشل قراءة الملف. تأكد إنه ملف CSV صحيح.");
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (filteredEmployees.length === 0) return;

    const headers = [
      "Employee",
      "HR Code",
      "Position",
      "Salary (Net)",
      "Social Ins. Employee",
      "Social Ins. Company",
      "Taxes",
      "Medical",
      "Final Gross Salary"
    ];

    const csvRows = [headers.join(",")];

    filteredEmployees.forEach(emp => {
      const netSalary = calculateProratedSalary(emp);
      const siEmp = emp.socialInsuranceEmployee || 0;
      const siComp = emp.socialInsuranceCompany || 0;
      const taxes = emp.taxes || 0;
      const medical = emp.medical || 0;
      const gross = netSalary + siEmp + siComp + taxes + medical;

      const row = [
        emp.name || "",
        emp.hrCode || "",
        emp.position || "",
        netSalary || 0,
        siEmp || 0,
        siComp || 0,
        taxes || 0,
        medical || 0,
        gross || 0
      ].map(val => `"${val}"`).join(",");
      
      csvRows.push(row);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gross_salaries_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gross Salaries</h2>
          <p className="text-muted-fg">
            Calculate Final Monthly Gross Salary per Employee.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-input-bg"
          />
        </div>
        <div className="flex gap-2">
          {canImport && (
            <>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2 shrink-0 self-end sm:self-auto min-w-[120px]">
                <Upload className="w-4 h-4" /> Import
              </Button>
            </>
          )}
          {canExport && (
            <Button onClick={handleExport} variant="outline" className="gap-2 shrink-0 self-end sm:self-auto min-w-[120px]">
              <Download className="w-4 h-4" /> Export
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b bg-muted flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {months.map((m) => (
                <Button
                  key={m}
                  variant={selectedMonth === m ? "default" : "ghost"}
                  onClick={() => setSelectedMonth(m)}
                  className="rounded-full px-4 h-8 text-xs sm:text-sm"
                >
                  {m}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-muted-fg/80 uppercase tracking-wider">
                Year:
              </label>
              <select
                className="bg-card-bg border border-border rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto max-h-[600px] no-scrollbar">
          <table className="data-table min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-muted text-muted-fg uppercase text-[10px] tracking-wider">
                <th className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] bg-muted/80 z-50 text-left px-4 py-3 border-b">Employee</th>
                <th className="text-right py-3 px-4 border-b">Salary (Net)</th>
                <th className="text-right py-3 px-4 border-b">Social Ins. Employee</th>
                <th className="text-right py-3 px-4 border-b">Social Ins. Company</th>
                <th className="text-right py-3 px-4 border-b">Taxes</th>
                <th className="text-right py-3 px-4 border-b">Medical</th>
                <th className="text-right py-3 px-4 border-b text-accent font-bold">Final Gross Salary</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-fg">
                    No employees found for {selectedMonth} {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const netSalary = calculateProratedSalary(emp);
                  const siEmp = emp.socialInsuranceEmployee || 0;
                  const siComp = emp.socialInsuranceCompany || 0;
                  const taxes = emp.taxes || 0;
                  const medical = emp.medical || 0;
                  const gross = netSalary + siEmp + siComp + taxes + medical;

                  return (
                    <tr key={emp.id} className="border-b border-border hover:bg-muted/30">
                      <td className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] bg-card-bg z-40 text-left px-4 py-3">
                        <div className="font-medium text-ink">{emp.name}</div>
                        <div className="text-[10px] text-muted-fg mt-0.5">{emp.hrCode} • {emp.position}</div>
                      </td>
                      <td className="text-right px-4 py-3 font-medium">
                        <div>{formatVal(netSalary)}</div>
                        {netSalary !== emp.netSalary && (
                          <span className="block text-[10px] text-muted-fg/80">
                            Prorated
                          </span>
                        )}
                      </td>
                      <td className="text-right px-2 py-2">
                        <input 
                          type="number"
                          step="any"
                          className="w-[100px] h-8 px-2 bg-muted/50 focus:bg-card-bg border border-transparent focus:border-accent text-right outline-none rounded-md transition-all"
                          value={emp.socialInsuranceEmployee ?? ""}
                          placeholder="0"
                          disabled={!canEdit}
                          onChange={(e) => handleUpdate(emp.id, 'socialInsuranceEmployee', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="text-right px-2 py-2">
                        <input 
                          type="number"
                          step="any"
                          className="w-[100px] h-8 px-2 bg-muted/50 focus:bg-card-bg border border-transparent focus:border-accent text-right outline-none rounded-md transition-all"
                          value={emp.socialInsuranceCompany ?? ""}
                          placeholder="0"
                          disabled={!canEdit}
                          onChange={(e) => handleUpdate(emp.id, 'socialInsuranceCompany', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="text-right px-2 py-2">
                        <input 
                          type="number"
                          step="any"
                          className="w-[100px] h-8 px-2 bg-muted/50 focus:bg-card-bg border border-transparent focus:border-accent text-right outline-none rounded-md transition-all"
                          value={emp.taxes ?? ""}
                          placeholder="0"
                          disabled={!canEdit}
                          onChange={(e) => handleUpdate(emp.id, 'taxes', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="text-right px-2 py-2">
                        <input 
                          type="number"
                          step="any"
                          className="w-[100px] h-8 px-2 bg-muted/50 focus:bg-card-bg border border-transparent focus:border-accent text-right outline-none rounded-md transition-all"
                          value={emp.medical ?? ""}
                          placeholder="0"
                          disabled={!canEdit}
                          onChange={(e) => handleUpdate(emp.id, 'medical', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-accent bg-muted/20">
                        {formatVal(gross)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
