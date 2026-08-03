import React, { useState, useRef } from "react";
import { Card, CardHeader, Input, Button } from "../components/ui";
import { useAppContext } from "../store/AppContext";
import { Search, Edit2, Check, X, Download, Upload } from "lucide-react";
import { parseSalaryImport } from "../lib/salaryImport";
import { currentMonthShort } from "../lib/utils";

const formatVal = (val: number | undefined | null) => {
  if (!val) return "-";
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export function CostPage() {
  const { visibleEmployees: employees, employees: allEmployees, setEmployees, user, permissions, salaryOverrides, setSalaryOverrides, safetyRecords } = useAppContext();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("Cost", "Manage Cost Data") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("Cost", "Export Cost Page") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthShort());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingField, setEditingField] = useState<{ id: string, field: 'poNumber' | 'poAmountRequest' } | null>(null);
  const [tempPoNumber, setTempPoNumber] = useState("");
  const [tempPoAmountRequest, setTempPoAmountRequest] = useState("");

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const years = [2024, 2025, 2026, 2027];

  const selectedMonthIndex = months.indexOf(selectedMonth);
  const startOfSelectedMonth = new Date(selectedYear, selectedMonthIndex, 1);
  const endOfSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0, 23, 59, 59);
  const totalDaysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

  const calculateProratedSalary = (emp: any) => {
    let hiringDateLocal = new Date(0);
    if (emp.dateHiring) {
      const parts = emp.dateHiring.split("-");
      if (parts.length === 3) {
        hiringDateLocal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        hiringDateLocal = new Date(emp.dateHiring);
      }
    } else {
      return 0;
    }

    let resignDateLocal: Date | null = null;
    if (emp.dateResign) {
      const parts = emp.dateResign.split("-");
      if (parts.length === 3) {
        resignDateLocal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        resignDateLocal = new Date(emp.dateResign);
      }
    }

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

  const filteredEmployees = employees.filter((e) => {
    // Check if active in this month
    let hiringDateLocal = new Date(0);
    if (e.dateHiring) {
      const parts = e.dateHiring.split("-");
      if (parts.length === 3) {
        hiringDateLocal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        hiringDateLocal = new Date(e.dateHiring);
      }
    }

    let resignDateLocal: Date | null = null;
    if (e.status === "Resigned" && e.dateResign) {
      const parts = e.dateResign.split("-");
      if (parts.length === 3) {
        resignDateLocal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        resignDateLocal = new Date(e.dateResign);
      }
    }
    
    if (hiringDateLocal && !isNaN(hiringDateLocal.getTime()) && hiringDateLocal > endOfSelectedMonth) return false;
    if (resignDateLocal && !isNaN(resignDateLocal.getTime()) && resignDateLocal < startOfSelectedMonth) return false;

    const term = searchTerm.toLowerCase();
    const poNumbers = (salaryOverrides[`${e.id}_${selectedMonth}_${selectedYear}`]?.poNumbers || [])
      .join(" ")
      .toLowerCase();
    return (
      e.name.toLowerCase().includes(term) ||
      e.id.toLowerCase().includes(term) ||
      (e.hrCode && e.hrCode.toLowerCase().includes(term)) ||
      e.position.toLowerCase().includes(term) ||
      poNumbers.includes(term)
    );
  });

  const handleSavePo = (empId: string) => {
    const overrideKey = `${empId}_${selectedMonth}_${selectedYear}`;
    const currentOverrides = salaryOverrides[overrideKey] || {
      ot: 0,
      bonus: empId === "EMP-001" ? 1000 : 0,
      topHero: empId === "EMP-001" ? 1000 : 0,
      gift: selectedMonth === "Mar" ? 500 : 0,
      retro: 0,
      mobile: 0,
      poNumbers: [],
      poAmountRequests: []
    };

    const newPoNumbers = tempPoNumber.split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    const newPoAmountRequests = tempPoAmountRequest.split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    setSalaryOverrides(prev => ({
      ...prev,
      [overrideKey]: {
        ...currentOverrides,
        poNumbers: newPoNumbers,
        poAmountRequests: newPoAmountRequests
      }
    }));
    setEditingField(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = parseSalaryImport(
          String(reader.result || ""),
          allEmployees,
          salaryOverrides,
          selectedMonth,
          selectedYear,
        );
        if (res.error) {
          showNotification(res.error, "error");
          return;
        }
        setSalaryOverrides(res.overrides);
        if (res.employeeUpdates.size > 0) {
          setEmployees((prev) =>
            prev.map((emp) =>
              res.employeeUpdates.has(emp.id)
                ? { ...emp, ...res.employeeUpdates.get(emp.id)! }
                : emp,
            ),
          );
        }
        const msg =
          `تم استيراد ${res.matched} موظف لشهر ${selectedMonth} ${selectedYear}` +
          (res.unmatched ? ` — ${res.unmatched} صف مش متطابق` : "");
        showNotification(msg, res.matched > 0 ? "success" : "error");
      } catch (err) {
        showNotification("فشل قراءة الملف. تأكد إنه ملف CSV صحيح.", "error");
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
      "Project",
      "PO Number",
      "PO Amount Request",
      "Gross Salary",
      "OT (Net)",
      "Top Hero Bonus",
      "Gift",
      "Retro",
      "Total Allowance",
      "Mobile",
      "Total Safety Amount",
      "Other Cost (Net)",
      "Labtop",
      "Total Other Cost (EGP)",
      "Total Cost"
    ];

    const csvRows = [headers.join(",")];

    filteredEmployees.forEach(emp => {
      const netSalary = calculateProratedSalary(emp);
      const siEmp = emp.socialInsuranceEmployee || 0;
      const siComp = emp.socialInsuranceCompany || 0;
      const taxes = emp.taxes || 0;
      const medical = emp.medical || 0;
      const gross = netSalary + siEmp + siComp + taxes + medical;

      const overrideKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
      const overrides = salaryOverrides[overrideKey] || {
        ot: 0,
        bonus: emp.id === "EMP-001" ? 1000 : 0,
        topHero: emp.id === "EMP-001" ? 1000 : 0,
        gift: selectedMonth === "Mar" ? 500 : 0,
        retro: 0,
        mobile: 0,
        laptop: 0,
        otherCostNet: 0,
      };

      const ot = overrides.ot || 0;
      const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
      const gift = overrides.gift || 0;
      const retro = overrides.retro || 0;
      const mobile = overrides.mobile || 0;

      const laptop =
        overrides.laptop !== undefined
          ? overrides.laptop
          : overrides.bonus !== undefined
            ? overrides.bonus
            : 0;
      const otherCostNet = overrides.otherCostNet !== undefined ? overrides.otherCostNet : 0;
      const totalOtherCost = laptop + otherCostNet;

      const safetyDataKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
      const safetyData = safetyRecords[safetyDataKey] || {
        medicalCheck: 0,
        workingAtHeight: 0,
        electricity: 0,
        riskAssessment: 0,
        fireFighting: 0,
        firstAid: 0,
        ppe: 0
      };
      const totalSafetyAmount = (safetyData.medicalCheck || 0) + 
        (safetyData.workingAtHeight || 0) + 
        (safetyData.electricity || 0) + 
        (safetyData.riskAssessment || 0) + 
        (safetyData.fireFighting || 0) + 
        (safetyData.firstAid || 0) + 
        (safetyData.ppe || 0);

      const totalAllowance = ot + topHero + gift + retro + mobile;
      const totalCost = gross + totalAllowance + totalSafetyAmount + totalOtherCost;

      const poNumbersStr = (overrides.poNumbers && overrides.poNumbers.length > 0) 
        ? overrides.poNumbers.join(" | ") 
        : "-";

      const poAmountRequestsStr = (overrides.poAmountRequests && overrides.poAmountRequests.length > 0) 
        ? overrides.poAmountRequests.join(" | ") 
        : "-";

      const row = [
        emp.name || "",
        emp.hrCode || "",
        emp.position || "",
        emp.project || "",
        poNumbersStr,
        poAmountRequestsStr,
        gross || 0,
        ot || 0,
        topHero || 0,
        gift || 0,
        retro || 0,
        totalAllowance || 0,
        mobile || 0,
        totalSafetyAmount || 0,
        otherCostNet || 0,
        laptop || 0,
        totalOtherCost || 0,
        totalCost || 0
      ].map(val => `"${val}"`).join(",");
      
      csvRows.push(row);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `total_cost_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Total Cost Calculation</h2>
          <p className="text-muted-fg">
            Calculate Total Cost per employee based on Gross Salary and Allowances.
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-md flex justify-between items-center ${notification.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
              <Input
                placeholder="Search by name, HR code, position, or PO number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-input-bg w-full"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {canEdit && (
                <>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <Button onClick={() => importInputRef.current?.click()} variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" /> Import
                  </Button>
                </>
              )}
              {canExport && (
                <Button onClick={handleExport} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" /> Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto max-h-[600px] no-scrollbar">
          <table className="data-table min-w-[1200px] whitespace-nowrap">
            <thead>
              <tr className="bg-muted text-muted-fg uppercase text-[10px] tracking-wider">
                <th className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] bg-muted/80 z-50 text-left px-4 py-3 border-b">Employee</th>
                <th className="text-left py-3 px-4 border-b">PO Number</th>
                <th className="text-left py-3 px-4 border-b">PO Amount Request</th>
                <th className="text-right py-3 px-4 border-b">Gross Salary</th>
                <th className="text-right py-3 px-4 border-b">OT (Net)</th>
                <th className="text-right py-3 px-4 border-b">Top Hero Bonus</th>
                <th className="text-right py-3 px-4 border-b">Gift</th>
                <th className="text-right py-3 px-4 border-b">Retro</th>
                <th className="text-right py-3 px-4 border-b font-medium text-purple-600">Total Allowance</th>
                <th className="text-right py-3 px-4 border-b">Mobile</th>
                <th className="text-right py-3 px-4 border-b">Total Safety Amount</th>
                <th className="text-right py-3 px-4 border-b text-ink font-medium">Other Cost (Net)</th>
                <th className="text-right py-3 px-4 border-b text-accent font-medium">Labtop</th>
                <th className="text-right py-3 px-4 border-b text-amber-600 font-medium">Total Other Cost (EGP)</th>
                <th className="text-right py-3 px-4 border-b text-accent font-bold">Total Cost</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-8 text-muted-fg">
                    No employees found.
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

                  const overrideKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
                  const overrides = salaryOverrides[overrideKey] || {
                    ot: 0,
                    bonus: emp.id === "EMP-001" ? 1000 : 0,
                    topHero: emp.id === "EMP-001" ? 1000 : 0,
                    gift: selectedMonth === "Mar" ? 500 : 0,
                    retro: 0,
                    mobile: 0,
                    laptop: 0,
                    otherCostNet: 0
                  };

                  const ot = overrides.ot || 0;
                  const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
                  const gift = overrides.gift || 0;
                  const retro = overrides.retro || 0;
                  const mobile = overrides.mobile || 0;

                  const safetyDataKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
                  const safetyData = safetyRecords[safetyDataKey] || {
                    medicalCheck: 0,
                    workingAtHeight: 0,
                    electricity: 0,
                    riskAssessment: 0,
                    fireFighting: 0,
                    firstAid: 0,
                    ppe: 0
                  };
                  const totalSafetyAmount = (safetyData.medicalCheck || 0) + 
                    (safetyData.workingAtHeight || 0) + 
                    (safetyData.electricity || 0) + 
                    (safetyData.riskAssessment || 0) + 
                    (safetyData.fireFighting || 0) + 
                    (safetyData.firstAid || 0) + 
                    (safetyData.ppe || 0);

                  const laptop =
                    overrides.laptop !== undefined
                      ? overrides.laptop
                      : overrides.bonus !== undefined
                        ? overrides.bonus
                        : 0;
                  const otherCostNet = overrides.otherCostNet !== undefined ? overrides.otherCostNet : 0;
                  const totalOtherCost = laptop + otherCostNet;

                  const totalAllowance = ot + topHero + gift + retro + mobile;
                  const totalCost = gross + totalAllowance + totalSafetyAmount + totalOtherCost;

                  const isEditingPoNumber = editingField?.id === emp.id && editingField.field === 'poNumber';
                  const isEditingPoAmountRequest = editingField?.id === emp.id && editingField.field === 'poAmountRequest';

                  return (
                    <tr key={emp.id} className="border-b border-border hover:bg-muted/30">
                      <td className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] bg-card-bg z-40 text-left px-4 py-3">
                        <div className="font-medium text-ink">{emp.name}</div>
                        <div className="text-[10px] text-muted-fg mt-0.5">
                          {emp.hrCode} • {emp.position}
                          {emp.project ? ` • ${emp.project}` : ""}
                        </div>
                      </td>
                      <td className="text-left px-4 py-3">
                        {isEditingPoNumber ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={tempPoNumber}
                              onChange={e => setTempPoNumber(e.target.value)}
                              className="w-32 h-8 text-xs"
                              placeholder="PO Num (comma sep)"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:bg-green-50" onClick={() => handleSavePo(emp.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-50" onClick={() => setEditingField(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group min-w-[100px]">
                            <div className="flex flex-wrap gap-1">
                              {overrides.poNumbers && overrides.poNumbers.length > 0 ? (
                                overrides.poNumbers.map((po, idx) => (
                                  <span key={idx} className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    {po}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-fg font-medium">-</span>
                              )}
                            </div>
                            {canEdit && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" 
                                onClick={() => {
                                  setEditingField({ id: emp.id, field: 'poNumber' });
                                  setTempPoNumber(overrides.poNumbers ? overrides.poNumbers.join(", ") : "");
                                  setTempPoAmountRequest(overrides.poAmountRequests ? overrides.poAmountRequests.join(", ") : "");
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-left px-4 py-3">
                        {isEditingPoAmountRequest ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={tempPoAmountRequest}
                              onChange={e => setTempPoAmountRequest(e.target.value)}
                              className="w-32 h-8 text-xs"
                              placeholder="Amounts (comma sep)"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:bg-green-50" onClick={() => handleSavePo(emp.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-50" onClick={() => setEditingField(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group min-w-[100px]">
                            <div className="flex flex-wrap gap-1">
                              {overrides.poAmountRequests && overrides.poAmountRequests.length > 0 ? (
                                overrides.poAmountRequests.map((po, idx) => (
                                  <span key={idx} className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    {po}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-fg font-medium">-</span>
                              )}
                            </div>
                            {canEdit && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" 
                                onClick={() => {
                                  setEditingField({ id: emp.id, field: 'poAmountRequest' });
                                  setTempPoNumber(overrides.poNumbers ? overrides.poNumbers.join(", ") : "");
                                  setTempPoAmountRequest(overrides.poAmountRequests ? overrides.poAmountRequests.join(", ") : "");
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(gross)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(ot)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(topHero)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(gift)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(retro)}
                      </td>
                      <td className="text-right px-4 py-3 font-medium text-purple-600 bg-purple-50/50">
                        {formatVal(totalAllowance)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(mobile)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(totalSafetyAmount)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(otherCostNet)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {formatVal(laptop)}
                      </td>
                      <td className="text-right px-4 py-3 text-amber-600 font-medium">
                        {formatVal(totalOtherCost)}
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-accent bg-muted/20">
                        {formatVal(totalCost)}
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
