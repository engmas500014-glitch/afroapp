import React, { useState, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
} from "../components/ui";
import { useAppContext, Employee, SalaryRecord } from "../store/AppContext";
import {
  Settings2,
  Download,
  Upload,
  X,
  Search,
  Trash2,
  Mail,
  Send,
  Loader2,
} from "lucide-react";

import { parseFlexibleDate } from "../lib/utils";
import { getEmailServerUrl, ccForProject } from "../lib/emailServer";
import { parseSalaryImport } from "../lib/salaryImport";

export function SalariesPage() {
  const {
    employees,
    visibleEmployees,
    visiblePoBudgets: poBudgets,
    user,
    permissions,
    salaryOverrides,
    setSalaryOverrides,
    setEmployees,
    projectManagers,
  } = useAppContext();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [selectedMonth, setSelectedMonth] = useState("Jan");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [showConfirmSendAll, setShowConfirmSendAll] = useState(false);
  const [sendingEmpId, setSendingEmpId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const months = [
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
  ];
  const years = [2024, 2025, 2026, 2027];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<
    SalaryRecord & { empId: string; empName: string }
  >({
    empId: "",
    empName: "",
    ot: 0,
    bonus: 0,
    gift: 0,
    retro: 0,
    mobile: 0,
  });

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find(
      (x) => x.module === module && x.action === action,
    );
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("Salaries", "Modify Salary & Bonus") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canSendPayslip = hasPermission("Salaries", "Send Payslips") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("Salaries", "Export Salaries") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";

  const handleEditClick = (emp: Employee, currentData: SalaryRecord) => {
    setEditForm({
      empId: emp.id,
      empName: emp.name,
      ...currentData,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = `${editForm.empId}_${selectedMonth}_${selectedYear}`;
    setSalaryOverrides((prev) => ({
      ...prev,
      [key]: {
        ot: Number(editForm.ot),
        bonus: Number(editForm.bonus),
        gift: Number(editForm.gift),
        retro: Number(editForm.retro),
        mobile: Number(editForm.mobile),
        topHero: Number(editForm.topHero),
      },
    }));
    setIsEditOpen(false);
  };
  const handleResetClick = (empId: string) => {
    const key = `${empId}_${selectedMonth}_${selectedYear}`;
    setSalaryOverrides((prev) => ({
      ...prev,
      [key]: { ot: 0, bonus: 0, topHero: 0, gift: 0, retro: 0, mobile: 0 },
    }));
  };

  const selectedMonthIndex = months.indexOf(selectedMonth);
  const startOfSelectedMonth = new Date(selectedYear, selectedMonthIndex, 1);
  const endOfSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0);
  const totalDaysInMonth = endOfSelectedMonth.getDate();

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
      return emp.netSalary;
    }

    return Math.round((emp.netSalary / totalDaysInMonth) * daysWorked);
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSendPayslip = async (emp: Employee, netSalary: number) => {
    if (!canSendPayslip) return;

    if (!emp.email) {
      showNotification(
        `لا يوجد بريد إلكتروني مسجل للموظف ${emp.name}`,
        "error",
      );
      return;
    }

    const overrideKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
    const overrides = salaryOverrides[overrideKey] || {
      ot: 0,
      topHero: emp.id === "EMP-001" ? 1000 : 0,
      gift: selectedMonth === "Mar" ? 500 : 0,
      retro: 0,
      mobile: 0,
    };
    const currentNetSalary = calculateProratedSalary(emp);
    const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);

    setSendingEmpId(emp.id);
    try {
      let response;
      let simulated = false;
      try {
        response = await fetch(`${getEmailServerUrl()}/api/send-payslip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emp.email,
            cc: ccForProject(projectManagers, emp.project),
            employeeName: emp.name,
            netSalary,
            details: {
              base: currentNetSalary,
              ot: overrides.ot,
              bonus: topHero,
              gift: overrides.gift,
              retro: overrides.retro,
              mobile: overrides.mobile,
            },
            month: selectedMonth,
            year: selectedYear,
          }),
        });
      } catch (fetchErr) {
        simulated = true;
      }

      const contentType = response ? response.headers.get("content-type") : null;
      if (simulated || !response || !contentType || contentType.indexOf("application/json") === -1) {
        // No email server answered — do NOT pretend the payslip was sent.
        throw new Error(
          getEmailServerUrl()
            ? `تعذر الوصول لسيرفر الإيميلات (${getEmailServerUrl()}). تأكد أنه شغال ثم أعد المحاولة.`
            : "لم يتم الإرسال: سيرفر الإيميلات غير مضبوط. أدخل عنوانه في System Settings → Email Server."
        );
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send");
      if (data.simulated) {
        throw new Error(
          "لم يتم إرسال حقيقي: إعدادات SMTP غير مضبوطة على سيرفر الإيميلات (راجع ملف .env).",
        );
      }
      showNotification(
        data.message || `Payslip sent to ${emp.name}`,
        "success",
      );
    } catch (error: any) {
      showNotification(error.message, "error");
    } finally {
      setSendingEmpId(null);
    }
  };

  const handleSendAllPayslips = async () => {
    if (!canSendPayslip) return;

    setShowConfirmSendAll(false);
    setIsSendingAll(true);
    try {
      // Map to correct payload including calculated salary
      const payload = filteredEmployees
        .filter((emp) => emp.email)
        .map((emp) => {
          const overrideKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
          const overrides = salaryOverrides[overrideKey] || {
            ot: 0,
            topHero: emp.id === "EMP-001" ? 1000 : 0,
            gift: selectedMonth === "Mar" ? 500 : 0,
            retro: 0,
            mobile: 0,
          };
          const currentNetSalary = calculateProratedSalary(emp);
          const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
          const total =
            currentNetSalary +
            overrides.ot +
            overrides.gift +
            overrides.retro +
            overrides.mobile +
            topHero;

          return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            cc: ccForProject(projectManagers, emp.project),
            netSalary: total,
            details: {
              base: currentNetSalary,
              ot: overrides.ot,
              bonus: topHero,
              gift: overrides.gift,
              retro: overrides.retro,
              mobile: overrides.mobile,
            },
          };
        });

      if (payload.length === 0) {
        throw new Error(
          "لا يوجد موظفين لديهم بريد إلكتروني مسجل. يرجى إضافة بريد إلكتروني للموظفين أولاً.",
        );
      }

      let response;
      let simulated = false;
      try {
        response = await fetch(`${getEmailServerUrl()}/api/send-all-payslips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employees: payload,
            month: selectedMonth,
            year: selectedYear,
          }),
        });
      } catch (fetchErr) {
        simulated = true;
      }

      const contentType = response ? response.headers.get("content-type") : null;
      if (simulated || !response || !contentType || contentType.indexOf("application/json") === -1) {
        // No email server answered — do NOT pretend the payslips were sent.
        throw new Error(
          getEmailServerUrl()
            ? `تعذر الوصول لسيرفر الإيميلات (${getEmailServerUrl()}). تأكد أنه شغال ثم أعد المحاولة.`
            : "لم يتم الإرسال: سيرفر الإيميلات غير مضبوط. أدخل عنوانه في System Settings → Email Server."
        );
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send all");
      if (data.simulated) {
        throw new Error(
          "لم يتم إرسال حقيقي: إعدادات SMTP غير مضبوطة على سيرفر الإيميلات (راجع ملف .env).",
        );
      }
      showNotification(
        data.message || `Sent ${data.successCount} payslips`,
        "success",
      );
    } catch (error: any) {
      showNotification(error.message, "error");
    } finally {
      setIsSendingAll(false);
    }
  };

  const filteredEmployees = visibleEmployees.filter((e) => {
    if (user?.role === "Employee") {
      const uName = user.name.toLowerCase();
      if (
        e.name.toLowerCase() !== uName &&
        e.id.toLowerCase() !== uName &&
        (!e.hrCode || e.hrCode.toLowerCase() !== uName)
      ) {
        return false;
      }
    }

    // Determine active status for the selected month/year
    if (!e.dateHiring) return false;
    const [hYear, hMonth, hDay] = e.dateHiring.split("-").map(Number);
    const hiringDateLocal = new Date(hYear, hMonth - 1, hDay, 0, 0, 0);
    if (isNaN(hiringDateLocal.getTime())) return false;

    let resignDateLocal = null;
    if (e.dateResign) {
      const [rYear, rMonth, rDay] = e.dateResign.split("-").map(Number);
      resignDateLocal = new Date(rYear, rMonth - 1, rDay, 0, 0, 0);
    }

    if (hiringDateLocal > endOfSelectedMonth) return false;
    if (resignDateLocal && resignDateLocal < startOfSelectedMonth) return false;

    const term = searchTerm.toLowerCase();
    const currentNetSalary = calculateProratedSalary(e);

    // We get the financial overrides to allow searching by salary amounts too
    const overrideKey = `${e.id}_${selectedMonth}_${selectedYear}`;
    const overrides = salaryOverrides[overrideKey] || {
      ot: 0,
      topHero: e.id === "EMP-001" ? 1000 : 0,
      gift: selectedMonth === "Mar" ? 500 : 0,
      retro: 0,
      mobile: 0,
    };
    const topHero = overrides.topHero || (e.id === "EMP-001" ? 1000 : 0);
    const total =
      currentNetSalary +
      overrides.ot +
      topHero +
      overrides.gift +
      overrides.retro +
      overrides.mobile;

    return (
      e.name.toLowerCase().includes(term) ||
      e.id.toLowerCase().includes(term) ||
      (e.hrCode && e.hrCode.toLowerCase().includes(term)) ||
      e.position.toLowerCase().includes(term) ||
      (e.account && e.account.toLowerCase().includes(term)) ||
      (e.project && e.project.toLowerCase().includes(term)) ||
      e.status.toLowerCase().includes(term) ||
      currentNetSalary.toString().includes(term) ||
      total.toString().includes(term)
    );
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = parseSalaryImport(
          String(reader.result || ""),
          employees,
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
        showNotification(
          `تم استيراد ${res.matched} موظف لشهر ${selectedMonth} ${selectedYear}` +
            (res.unmatched ? ` — ${res.unmatched} صف مش متطابق` : ""),
          res.matched > 0 ? "success" : "error",
        );
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
      "Total Net (EGP)",
      "Salary (Net)",
      "OT (Net)",
      "Top Hero Bonus",
      "Gift",
      "Retro",
      "Mobile"
    ];

    const csvRows = [headers.join(",")];

    filteredEmployees.forEach(emp => {
      const currentNetSalary = calculateProratedSalary(emp);
      const key = `${emp.id}_${selectedMonth}_${selectedYear}`;
      const overrides = salaryOverrides[key] || {
        ot: 0,
        topHero: emp.id === "EMP-001" ? 1000 : 0,
        gift: selectedMonth === "Mar" ? 500 : 0,
        retro: 0,
        mobile: 0,
      };

      const ot = overrides.ot || 0;
      const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
      const gift = overrides.gift || 0;
      const retro = overrides.retro || 0;
      const mobile = overrides.mobile !== undefined ? overrides.mobile : 0;

      const total = currentNetSalary + ot + topHero + gift + retro + mobile;

      const row = [
        emp.name || "",
        emp.hrCode || "",
        emp.position || "",
        total || 0,
        currentNetSalary || 0,
        ot || 0,
        topHero || 0,
        gift || 0,
        retro || 0,
        mobile || 0
      ].map(val => `"${val}"`).join(",");
      
      csvRows.push(row);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_salaries_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Monthly Salaries
          </h2>
          <p className="text-muted-fg">
            Manage monthly compensation components for each employee.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </>
          )}
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          )}
          {canSendPayslip && (
            <Button
              variant="default"
              onClick={() => setShowConfirmSendAll(true)}
              disabled={isSendingAll || filteredEmployees.length === 0}
            >
              {isSendingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isSendingAll ? "Sending..." : "Send All Payslips"}
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-md flex justify-between items-center ${notification.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}
        >
          <p className="text-sm font-medium">{notification.message}</p>
          <button onClick={() => setNotification(null)}>
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

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg/80" />
            <Input
              placeholder="Search across all fields and amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-input-bg"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead className="shadow-sm">
              <tr>
                <th className="sticky left-0 bg-muted z-30 w-60 border-r">
                  Employee
                </th>
                <th className="text-right">Total Net (EGP)</th>
                <th className="text-right">Salary (Net)</th>
                <th className="text-right">OT (Net)</th>
                <th className="text-right">Top Hero Bonus</th>
                <th className="text-right">Gift</th>
                <th className="text-right">Retro</th>
                <th className="text-right">Mobile</th>
                {(canEdit || canSendPayslip) && (
                  <th className="sticky right-0 bg-muted z-30 border-l text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const overrideKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
                const overrides = salaryOverrides[overrideKey];

                // Fallback to mock data if no overrides exist for this employee + month + year
                const currentNetSalary = calculateProratedSalary(emp);
                const ot = overrides !== undefined ? overrides.ot : 0;
                const topHero =
                  overrides !== undefined && overrides.topHero !== undefined
                    ? overrides.topHero
                    : emp.id === "EMP-001"
                      ? 1000
                      : 0;
                const gift =
                  overrides !== undefined
                    ? overrides.gift
                    : selectedMonth === "Mar"
                      ? 500
                      : 0;
                const retro = overrides !== undefined ? overrides.retro : 0;
                const mobile =
                  overrides !== undefined ? overrides.mobile : 0;

                const total =
                  currentNetSalary +
                  ot +
                  topHero +
                  gift +
                  retro +
                  mobile;

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-muted transition-colors group"
                  >
                    <td className="font-medium sticky left-0 bg-card-bg group-hover:bg-muted border-r border-border z-20 shadow-[1px_0_0_0_var(--color-border)] py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-ink font-semibold truncate max-w-[150px]">
                            {emp.name}
                          </span>
                          <Badge
                            variant={
                              emp.status === "Active"
                                ? "success"
                                : "destructive"
                            }
                            className="text-[10px] h-4 px-1 min-w-0"
                          >
                            {emp.status}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-fg font-normal">
                          {emp.hrCode || emp.id} &bull;{" "}
                          {emp.account ? `${emp.account} / ` : ""}
                          {emp.project || ""}
                        </span>
                      </div>
                    </td>
                    <td className="font-bold text-ink text-right">
                      {total.toLocaleString()}
                    </td>
                    <td className="text-muted-fg text-right">
                      {currentNetSalary.toLocaleString()}
                      {currentNetSalary !== emp.netSalary && (
                        <span className="block text-[10px] text-muted-fg/80">
                          Prorated
                        </span>
                      )}
                    </td>
                    <td className="text-success font-medium text-right">
                      {ot > 0 ? `+${ot.toLocaleString()}` : "-"}
                    </td>
                    <td className="text-accent font-medium text-right">
                      {topHero > 0 ? `+${topHero.toLocaleString()}` : "-"}
                    </td>
                    <td className="text-purple-600 font-medium text-right">
                      {gift > 0 ? `+${gift.toLocaleString()}` : "-"}
                    </td>
                    <td className="text-ink/80 font-medium text-right">
                      {retro > 0 ? `+${retro.toLocaleString()}` : "-"}
                    </td>
                    <td className="text-ink/80 text-right">
                      {mobile > 0 ? `+${mobile.toLocaleString()}` : "-"}
                    </td>
                    {(canEdit || canSendPayslip) && (
                      <td className="sticky right-0 bg-card-bg group-hover:bg-muted border-l border-border z-20 shadow-[-1px_0_0_0_var(--color-border)]">
                        <div className="flex justify-center gap-1">
                          {canEdit && (
                            <>
                              <Button
                                onClick={() =>
                                  handleEditClick(emp, {
                                    ot,
                                    bonus: 0,
                                    topHero,
                                    gift,
                                    retro,
                                    mobile,
                                  })
                                }
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-fg/80 hover:text-accent"
                                title="Edit Allowances"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                onClick={() => handleResetClick(emp.id)}
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-fg/80 hover:text-danger"
                                title="Reset to Zero"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {canSendPayslip && (
                            <Button
                              onClick={() => handleSendPayslip(emp, total)}
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-fg/80 hover:text-accent disabled:opacity-50"
                              title="Send Payslip"
                              disabled={sendingEmpId === emp.id}
                            >
                              {sendingEmpId === emp.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirm Send All Modal */}
      {showConfirmSendAll && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted">
              <h3 className="font-bold text-lg text-ink">Confirm Send All</h3>
              <button
                onClick={() => setShowConfirmSendAll(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-ink/80">
                Are you sure you want to send payslips to all{" "}
                <strong>{filteredEmployees.length}</strong> employees for{" "}
                <strong>
                  {selectedMonth} {selectedYear}
                </strong>
                ?
              </p>
              <div className="pt-4 flex gap-3 justify-center border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmSendAll(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSendAllPayslips}>
                  Yes, Send All
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Salary Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted">
              <div>
                <h3 className="font-bold text-lg text-ink">
                  Edit Compensation
                </h3>
                <p className="text-xs text-muted-fg font-medium">
                  {editForm.empName} - {selectedMonth} {selectedYear}
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Overtime (Net)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.ot || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, ot: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Top Hero Bonus
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.topHero || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        topHero: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Gift
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.gift || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gift: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Retro
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.retro || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        retro: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Mobile Allowance
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.mobile || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        mobile: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3 justify-end border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
