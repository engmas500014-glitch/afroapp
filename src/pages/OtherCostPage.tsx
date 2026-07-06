import React, { useState } from "react";
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
  X,
  Search,
  Trash2,
  Mail,
  Send,
  Loader2,
} from "lucide-react";

import { parseFlexibleDate } from "../lib/utils";
import { getEmailServerUrl } from "../lib/emailServer";

export function OtherCostPage() {
  const {
    employees,
    visibleEmployees,
    visiblePoBudgets: poBudgets,
    user,
    permissions,
    salaryOverrides,
    setSalaryOverrides,
    projectManagers,
  } = useAppContext();
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
  const [editForm, setEditForm] = useState<{
    empId: string;
    empName: string;
    otherCostNet: number | "";
    laptop: number | "";
  }>({
    empId: "",
    empName: "",
    otherCostNet: "",
    laptop: "",
  });

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find(
      (x) => x.module === module && x.action === action,
    );
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("Other Cost", "Modify Other Cost") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canSendPayslip = false; // Disabled by user request
  const canExport = hasPermission("Other Cost", "Export Other Cost") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";

  const handleEditClick = (emp: Employee, otherCostNet: number, laptop: number) => {
    setEditForm({
      empId: emp.id,
      empName: emp.name,
      otherCostNet: otherCostNet === 0 ? "" : otherCostNet,
      laptop: laptop === 0 ? "" : laptop,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = `${editForm.empId}_${selectedMonth}_${selectedYear}`;
    setSalaryOverrides((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        otherCostNet: Number(editForm.otherCostNet || 0),
        laptop: Number(editForm.laptop || 0),
      },
    }));
    setIsEditOpen(false);
  };
  const handleResetClick = (empId: string) => {
    const key = `${empId}_${selectedMonth}_${selectedYear}`;
    setSalaryOverrides((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        otherCostNet: 0,
        laptop: 0,
      },
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
      mobile: 334.21,
      laptop: 0,
    };
    const currentNetSalary = calculateProratedSalary(emp);
    const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
    const laptop = overrides.laptop !== undefined ? overrides.laptop : (overrides.bonus || 0);

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
            cc: (emp.project && projectManagers[emp.project]) || undefined,
            employeeName: emp.name,
            netSalary,
            details: {
              base: currentNetSalary,
              ot: overrides.ot,
              bonus: topHero,
              gift: overrides.gift,
              retro: overrides.retro,
              mobile: overrides.mobile,
              laptop: laptop,
            },
            month: selectedMonth,
            year: selectedYear,
          }),
        });
      } catch (fetchErr) {
        simulated = true;
      }

      if (simulated || !response) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        showNotification(
          `تمت محاكاة إرسال تفاصيل التكلفة بنجاح إلى ${emp.name} (وضع التشغيل التجريبي بدون خادم)`,
          "success"
        );
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to send");
        showNotification(
          data.message || `Cost details sent to ${emp.name}`,
          "success",
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        showNotification(
          `تمت محاكاة إرسال تفاصيل التكلفة بنجاح إلى ${emp.name} (وضع التشغيل التجريبي بدون خادم)`,
          "success"
        );
      }
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
      const payload = filteredEmployees
        .filter((emp) => emp.email)
        .map((emp) => {
          const overrideKey = `${emp.id}_${selectedMonth}_${selectedYear}`;
          const overrides = salaryOverrides[overrideKey] || {
            ot: 0,
            topHero: emp.id === "EMP-001" ? 1000 : 0,
            gift: selectedMonth === "Mar" ? 500 : 0,
            retro: 0,
            mobile: 334.21,
            laptop: 0,
          };
          const currentNetSalary = calculateProratedSalary(emp);
          const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
          const laptop = overrides.laptop !== undefined ? overrides.laptop : (overrides.bonus || 0);
          const otherCostNet =
            currentNetSalary +
            overrides.ot +
            overrides.gift +
            overrides.retro +
            overrides.mobile +
            topHero;
          const totalOtherCost = laptop + otherCostNet;

          return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            cc: (emp.project && projectManagers[emp.project]) || undefined,
            netSalary: totalOtherCost,
            details: {
              base: currentNetSalary,
              ot: overrides.ot,
              bonus: topHero,
              gift: overrides.gift,
              retro: overrides.retro,
              mobile: overrides.mobile,
              laptop: laptop,
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

      if (simulated || !response) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        showNotification(
          `تمت محاكاة إرسال قسائم التكاليف بنجاح لعدد ${payload.length} موظف (وضع التشغيل التجريبي بدون خادم)`,
          "success"
        );
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to send all");
        showNotification(
          data.message || `Sent ${data.successCount} cost slips`,
          "success",
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        showNotification(
          `تمت محاكاة إرسال قسائم التكاليف بنجاح لعدد ${payload.length} موظف (وضع التشغيل التجريبي بدون خادم)`,
          "success"
        );
      }
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

    const overrideKey = `${e.id}_${selectedMonth}_${selectedYear}`;
    const overrides = salaryOverrides[overrideKey];

    const topHero =
      overrides !== undefined && overrides.topHero !== undefined
        ? overrides.topHero
        : e.id === "EMP-001"
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
      overrides !== undefined ? overrides.mobile : 334.21;
    const laptop =
      overrides !== undefined && overrides.laptop !== undefined
        ? overrides.laptop
        : overrides !== undefined && overrides.bonus !== undefined
          ? overrides.bonus
          : 0;

    const otherCostNet =
      overrides !== undefined && overrides.otherCostNet !== undefined
        ? overrides.otherCostNet
        : 0;
    const totalOtherCost = laptop + otherCostNet;

    return (
      e.name.toLowerCase().includes(term) ||
      e.id.toLowerCase().includes(term) ||
      (e.hrCode && e.hrCode.toLowerCase().includes(term)) ||
      e.position.toLowerCase().includes(term) ||
      (e.account && e.account.toLowerCase().includes(term)) ||
      (e.project && e.project.toLowerCase().includes(term)) ||
      e.status.toLowerCase().includes(term) ||
      currentNetSalary.toString().includes(term) ||
      totalOtherCost.toString().includes(term)
    );
  });

  const handleExport = () => {
    if (filteredEmployees.length === 0) return;

    const headers = [
      "Employee",
      "HR Code",
      "Position",
      "Total Other Cost (EGP)",
      "Other Cost (Net)",
      "Labtop",
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
      const overrides = salaryOverrides[key];

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
        overrides !== undefined ? overrides.mobile : 334.21;
      const laptop =
        overrides !== undefined && overrides.laptop !== undefined
          ? overrides.laptop
          : overrides !== undefined && overrides.bonus !== undefined
            ? overrides.bonus
            : 0;

      const otherCostNet =
        overrides !== undefined && overrides.otherCostNet !== undefined
          ? overrides.otherCostNet
          : 0;
      const totalOtherCost = laptop + otherCostNet;

      const row = [
        emp.name || "",
        emp.hrCode || "",
        emp.position || "",
        totalOtherCost || 0,
        otherCostNet || 0,
        laptop || 0,
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
    link.setAttribute("download", `other_cost_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Other Cost
          </h2>
          <p className="text-muted-fg">
            Manage other monthly cost and compensation components for each employee.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
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
              placeholder="Search other cost components..."
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
                <th className="text-right">Total Other Cost (EGP)</th>
                <th className="text-right">Other Cost (Net)</th>
                <th className="text-right">Labtop</th>
                {canEdit && (
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
                  overrides !== undefined ? overrides.mobile : 334.21;
                const laptop =
                  overrides !== undefined && overrides.laptop !== undefined
                    ? overrides.laptop
                    : overrides !== undefined && overrides.bonus !== undefined
                      ? overrides.bonus
                      : 0;

                const otherCostNet =
                  overrides !== undefined && overrides.otherCostNet !== undefined
                    ? overrides.otherCostNet
                    : 0;

                const totalOtherCost = laptop + otherCostNet;

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
                      {totalOtherCost > 0 ? totalOtherCost.toLocaleString() : "-"}
                    </td>
                    <td className="text-emerald-600 dark:text-emerald-400 font-medium text-right">
                      {otherCostNet > 0 ? `+${otherCostNet.toLocaleString()}` : "-"}
                    </td>
                    <td className="text-accent font-medium text-right">
                      {laptop > 0 ? `+${laptop.toLocaleString()}` : "-"}
                    </td>
                    {canEdit && (
                      <td className="sticky right-0 bg-card-bg group-hover:bg-muted border-l border-border z-20 shadow-[-1px_0_0_0_var(--color-border)]">
                        <div className="flex justify-center gap-1">
                          <Button
                            onClick={() =>
                              handleEditClick(emp, otherCostNet, laptop)
                            }
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-fg/80 hover:text-accent"
                            title="Edit Cost Components"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleResetClick(emp.id)}
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-fg/80 hover:text-danger"
                            title="Reset Components to Zero"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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



      {/* Edit Salary Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted">
              <div>
                <h3 className="font-bold text-lg text-ink">
                  Edit Cost Components
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Other Cost (Net)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.otherCostNet}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        otherCostNet: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink/80 uppercase">
                    Labtop
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={editForm.laptop}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        laptop: e.target.value === "" ? "" : Number(e.target.value),
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
