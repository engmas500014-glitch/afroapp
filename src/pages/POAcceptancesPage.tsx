import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, Button, Input } from "../components/ui";
import { useAppContext, POAcceptance } from "../store/AppContext";
import { Plus, Trash2, Save, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, X, Search, Edit2, Eye, Download, Upload, List } from "lucide-react";
import { parseCsv } from "../lib/salaryImport";

export function POAcceptancesPage() {
  const { poAcceptances, setPoAcceptances, employees, salaryOverrides, safetyRecords, user, permissions } = useAppContext();

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canManage = hasPermission("PO Acceptances", "Manage PO Acceptances") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("PO Acceptances", "Export PO Acceptances") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const [selectedMonth, setSelectedMonth] = useState("Jan");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  const [showAddPo, setShowAddPo] = useState(false);
  const [allocationModalAmounts, setAllocationModalAmounts] = useState<Record<string, number | "">>({});
  const [showAddNewPo, setShowAddNewPo] = useState(false);
  const [newPoData, setNewPoData] = useState({ poNumber: "", amountPo: "" });

  const [showEditPoAmount, setShowEditPoAmount] = useState(false);
  const [showEditPoAmountRequest, setShowEditPoAmountRequest] = useState(false);
  const [editPoAmountRequestSearch, setEditPoAmountRequestSearch] = useState("");
  const [editPoAmountRequests, setEditPoAmountRequests] = useState<Record<string, number | "">>({});
  const [editPoSearch, setEditPoSearch] = useState("");
  const [editPoAmounts, setEditPoAmounts] = useState<Record<string, number | "">>({});
  const [poToDelete, setPoToDelete] = useState<string | null>(null);
  const [showViewUnusedPo, setShowViewUnusedPo] = useState(false);
  const [showCollectStateModal, setShowCollectStateModal] = useState(false);
  const [collectDateFrom, setCollectDateFrom] = useState("");
  const [collectDateTo, setCollectDateTo] = useState("");
  const [collectStateSearchClicked, setCollectStateSearchClicked] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  const handleSaveEditPoAmounts = () => {
    setPoAcceptances(prev => {
      let next = [...prev];
      Object.keys(editPoAmounts).forEach(poNumber => {
        const newAmount = editPoAmounts[poNumber];
        if (newAmount !== undefined && newAmount !== "") {
          let firstFound = false;
          next = next.map(rec => {
            if (rec.poNumber === poNumber) {
              if (!firstFound) {
                firstFound = true;
                return { ...rec, amountPo: Number(newAmount) };
              } else {
                return { ...rec, amountPo: undefined as any }; // clear from duplicates
              }
            }
            return rec;
          });
        }
      });
      return next;
    });
    setShowEditPoAmount(false);
    setEditPoAmounts({});
  };

  const handleSaveEditPoAmountRequests = () => {
    setPoAcceptances(prev => {
      let next = [...prev];
      Object.keys(editPoAmountRequests).forEach(poNumber => {
        const newAmount = editPoAmountRequests[poNumber];
        if (newAmount !== undefined) {
          let firstFound = false;
          next = next.map(rec => {
            if (rec.poNumber === poNumber && rec.month === selectedMonth && rec.year === selectedYear) {
              if (!firstFound) {
                firstFound = true;
                return { ...rec, poAmountRequest: newAmount === "" ? undefined : Number(newAmount) };
              } else {
                return { ...rec, poAmountRequest: undefined };
              }
            }
            return rec;
          });
        }
      });
      return next;
    });
    setShowEditPoAmountRequest(false);
    setEditPoAmountRequests({});
  };

  const handleAddNewPoSubmit = () => {
    if (!newPoData.poNumber) return;
    const newRecord: POAcceptance = {
      id: `POA-${Date.now()}`,
      month: "",
      year: 0,
      poNumber: newPoData.poNumber,
      amountPo: newPoData.amountPo ? Number(newPoData.amountPo) : 0,
      costPo: 0,
      balancePo: 0,
      grnNumber: "",
      grnDate: "",
      invoiceNo: "",
      invoiceDate: "",
      collectDate: "",
      collectState: "",
    };
    setPoAcceptances((prev) => [...prev, newRecord]);
    setShowAddNewPo(false);
    setNewPoData({ poNumber: "", amountPo: "" });
  };

  const handleSavePoAllocations = () => {
    setPoAcceptances(prev => {
      const appliedPos = new Set<string>();
      return prev.map(rec => {
        if (rec.month === selectedMonth && rec.year === selectedYear && rec.poNumber && allocationModalAmounts[rec.poNumber] !== undefined && allocationModalAmounts[rec.poNumber] !== "") {
          if (!appliedPos.has(rec.poNumber)) {
            appliedPos.add(rec.poNumber);
            return { ...rec, amountPo: Number(allocationModalAmounts[rec.poNumber]) };
          }
        }
        return rec;
      });
    });
    setShowAddPo(false);
  };

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const years = [2024, 2025, 2026, 2027];

  const currentRecords = poAcceptances.filter(
    (r) => r.month === selectedMonth && r.year === selectedYear
  );

  const importInputRef = useRef<HTMLInputElement>(null);

  // Convert mm/dd/yyyy (the UI's display format) to the yyyy-mm-dd the date
  // inputs need; leave already-ISO or unknown values as-is.
  const normDate = (v: string): string => {
    const s = String(v || "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    return s;
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result || ""));
        if (rows.length < 2) {
          alert("الملف فاضي أو مفيهوش بيانات.");
          return;
        }
        const header = rows[0].map((h) => h.trim().toLowerCase());
        const col = (names: string[]) => {
          let i = header.findIndex((h) => names.some((n) => h === n));
          if (i !== -1) return i;
          i = header.findIndex((h) => names.some((n) => h.startsWith(n)));
          if (i !== -1) return i;
          return header.findIndex((h) => names.some((n) => h.includes(n)));
        };
        const iPo = col(["po number", "po_number"]);
        const iGrnNo = col(["grn number", "grn no"]);
        const iGrnDate = col(["grn date"]);
        const iInvNo = col(["invoice no", "invoice number"]);
        const iInvDate = col(["invoice date"]);
        const iColDate = col(["collect date"]);
        const iColState = col(["collect state"]);

        if (iPo === -1) {
          alert("الملف لازم يكون فيه عمود PO Number.");
          return;
        }

        // First non-empty row per PO wins; only non-empty cells are applied so
        // an import fills/updates values without wiping existing ones.
        const patches = new Map<string, Partial<POAcceptance>>();
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const po = String(row[iPo] || "").trim();
          if (!po || patches.has(po)) continue;
          const patch: Partial<POAcceptance> = {};
          const grnNo = iGrnNo >= 0 ? String(row[iGrnNo] || "").trim() : "";
          const grnDate = iGrnDate >= 0 ? normDate(row[iGrnDate]) : "";
          const invNo = iInvNo >= 0 ? String(row[iInvNo] || "").trim() : "";
          const invDate = iInvDate >= 0 ? normDate(row[iInvDate]) : "";
          const colDate = iColDate >= 0 ? normDate(row[iColDate]) : "";
          const colState = iColState >= 0 ? String(row[iColState] || "").trim() : "";
          if (grnNo) patch.grnNumber = grnNo;
          if (grnDate) patch.grnDate = grnDate;
          if (invNo) patch.invoiceNo = invNo;
          if (invDate) patch.invoiceDate = invDate;
          if (colDate) patch.collectDate = colDate;
          if (colState) patch.collectState = colState;
          if (Object.keys(patch).length > 0) patches.set(po, patch);
        }

        const existing = new Set(
          poAcceptances
            .filter((r) => r.month === selectedMonth && r.year === selectedYear && r.poNumber)
            .map((r) => r.poNumber),
        );
        let matched = 0;
        let unmatched = 0;
        patches.forEach((_, po) => (existing.has(po) ? matched++ : unmatched++));

        setPoAcceptances((prev) =>
          prev.map((rec) =>
            rec.month === selectedMonth &&
            rec.year === selectedYear &&
            rec.poNumber &&
            patches.has(rec.poNumber)
              ? { ...rec, ...patches.get(rec.poNumber)! }
              : rec,
          ),
        );

        alert(
          `تم تحديث ${matched} أمر شراء لشهر ${selectedMonth} ${selectedYear}` +
            (unmatched ? ` — ${unmatched} PO مش موجود في الشهر ده` : ""),
        );
      } catch (err) {
        alert("فشل قراءة الملف. تأكد إنه ملف CSV صحيح.");
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      "PO Number",
      "Total PO Amount",
      "PO Amount Request",
      "Cost Month",
      "Total Cost",
      "Balance PO",
      "GRN Number",
      "GRN Date",
      "Invoice No",
      "Invoice Date",
      "Collect Date",
      "Collect State",
      "HR Code",
      "Employee Name",
      "Account",
      "Project"
    ];

    const csvRows = [headers.join(",")];

    filteredRecords.forEach(record => {
      const globalAmount = poAcceptances
        .filter(r => r.poNumber === record.poNumber)
        .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
      const calculatedCostPo = record.poNumber ? (poCosts[record.poNumber] || 0) : 0;
      const calculatedPoAmountRequest = record.poNumber ? (poAmountRequestsMap[record.poNumber] || 0) : 0;
      const manualPoAmountRequest = record.poNumber ? (manualPoAmountRequestsMap[record.poNumber]) : undefined;
      const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
      const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
      
      const globalCost = record.poNumber ? (globalPoCosts[record.poNumber] || 0) : 0;
      const calculatedBalancePo = globalAmount - (cumReqs[record.poNumber] || 0) - displayPoAmountRequest;

      const baseRowData = [
        record.poNumber || "",
        globalAmount || 0,
        displayPoAmountRequest || 0,
        calculatedCostPo || 0,
        globalCost || 0,
        calculatedBalancePo || 0,
        record.grnNumber || "",
        record.grnDate || "",
        record.invoiceNo || "",
        record.invoiceDate || "",
        record.collectDate || "",
        record.collectState || ""
      ];

      const mappedEmployees = record.poNumber ? (poEmployees[record.poNumber] || []) : [];

      if (mappedEmployees.length === 0) {
        const row = [...baseRowData, "", "", "", ""].map(val => `"${val}"`).join(",");
        csvRows.push(row);
      } else {
        mappedEmployees.forEach(emp => {
          const row = [
            ...baseRowData,
            emp.hrCode || "",
            emp.name || "",
            emp.account || "",
            emp.project || ""
          ].map(val => `"${val}"`).join(",");
          csvRows.push(row);
        });
      }
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `po_acceptances_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const collectStateRecords = React.useMemo(() => {
    if (!collectStateSearchClicked) return [];
    
    return poAcceptances.filter(record => {
      if (!record.collectDate) return false;
      const rDate = record.collectDate;
      if (collectDateFrom && rDate < collectDateFrom) return false;
      if (collectDateTo && rDate > collectDateTo) return false;
      return true;
    });
  }, [poAcceptances, collectDateFrom, collectDateTo, collectStateSearchClicked]);

  const handleExportCollectState = () => {
    if (collectStateRecords.length === 0) return;

    const headers = [
      "PO Number",
      "Total PO Amount",
      "PO Amount Request",
      "Cost Month",
      "Total Cost",
      "Collect State",
      "Collect Date"
    ];

    const csvRows = [headers.join(",")];

    collectStateRecords.forEach(record => {
      const globalAmount = poAcceptances
        .filter(r => r.poNumber === record.poNumber)
        .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
      const calculatedCostPo = record.poNumber ? (poCosts[record.poNumber] || 0) : 0;
      const calculatedPoAmountRequest = record.poNumber ? (poAmountRequestsMap[record.poNumber] || 0) : 0;
      const manualPoAmountRequest = record.poNumber ? (manualPoAmountRequestsMap[record.poNumber]) : undefined;
      const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
      const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
      
      const globalCost = record.poNumber ? (globalPoCosts[record.poNumber] || 0) : 0;

      const row = [
        record.poNumber || "",
        globalAmount || 0,
        displayPoAmountRequest || 0,
        calculatedCostPo || 0,
        globalCost || 0,
        record.collectState || "",
        record.collectDate || ""
      ].map(val => `"${val}"`).join(",");
      
      csvRows.push(row);
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `collect_state_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportYear = () => {
    const yearRecords = poAcceptances.filter(r => r.year === selectedYear);
    if (yearRecords.length === 0) return;

    const headers = [
      "Month",
      "PO Number",
      "Total PO Amount",
      "PO Amount Request",
      "Cost Month",
      "Total Cost",
      "Balance PO",
      "GRN Number",
      "GRN Date",
      "Invoice No",
      "Invoice Date",
      "Collect Date",
      "Collect State",
      "HR Code",
      "Employee Name",
      "Account",
      "Project"
    ];

    const csvRows = [headers.join(",")];

    yearRecords.forEach(record => {
      const globalAmount = poAcceptances
        .filter(r => r.poNumber === record.poNumber)
        .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
      const key = `${record.month}_${record.year}_${record.poNumber}`;
      const calculatedCostPo = record.poNumber ? (monthlyCostsPo[key] || 0) : 0;
      const calculatedPoAmountRequest = record.poNumber ? (monthlyCalcReqs[key] || 0) : 0;
      const manualPoAmountRequest = record.poNumber ? (manualPoAmountRequestsMap[key]) : undefined;
      const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
      const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
      
      const globalCost = record.poNumber ? (globalPoCosts[record.poNumber] || 0) : 0;
      const calculatedBalancePo = globalAmount - (cumulativeDispReqs[key] || 0) - displayPoAmountRequest;

      const baseRowData = [
        record.month || "",
        record.poNumber || "",
        globalAmount || 0,
        displayPoAmountRequest || 0,
        calculatedCostPo || 0,
        globalCost || 0,
        calculatedBalancePo || 0,
        record.grnNumber || "",
        record.grnDate || "",
        record.invoiceNo || "",
        record.invoiceDate || "",
        record.collectDate || "",
        record.collectState || ""
      ];

      const mappedEmployees = record.poNumber ? (poEmployees[record.poNumber] || []) : [];

      if (mappedEmployees.length === 0) {
        const row = [...baseRowData, "", "", "", ""].map(val => `"${val}"`).join(",");
        csvRows.push(row);
      } else {
        mappedEmployees.forEach(emp => {
          const row = [
            ...baseRowData,
            emp.hrCode || "",
            emp.name || "",
            emp.account || "",
            emp.project || ""
          ].map(val => `"${val}"`).join(",");
          csvRows.push(row);
        });
      }
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `po_acceptances_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddRow = () => {
    const newRecord: POAcceptance = {
      id: `POA-${Date.now()}`,
      month: selectedMonth,
      year: selectedYear,
      poNumber: "",
      amountPo: 0,
      costPo: 0,
      balancePo: 0,
      grnNumber: "",
      grnDate: "",
      invoiceNo: "",
      invoiceDate: "",
      collectDate: "",
      collectState: "",
    };
    setPoAcceptances([...poAcceptances, newRecord]);
  };

  const selectedMonthIndex = months.indexOf(selectedMonth);
  const startOfSelectedMonth = new Date(selectedYear, selectedMonthIndex, 1);
  const endOfSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0, 23, 59, 59);

  const poAvailableCapacity: Record<string, number> = {};
  const globalPoCosts: Record<string, number> = {};

  poAcceptances
    .filter(r => !r.month || r.month === "")
    .forEach(record => {
      if (record.poNumber) {
        poAvailableCapacity[record.poNumber] = (poAvailableCapacity[record.poNumber] || 0) + (Number(record.amountPo) || 0);
      }
    });

  const monthlyCostsPo: Record<string, number> = {};
  const monthlyCalcReqs: Record<string, number> = {};
  const cumulativeDispReqs: Record<string, number> = {};

  const manualPoAmountRequestsMap: Record<string, number> = {};
  poAcceptances.forEach(r => {
    if (r.month && r.year && r.poNumber && r.poAmountRequest !== undefined) {
      const key = `${r.month}_${r.year}_${r.poNumber}`;
      if (manualPoAmountRequestsMap[key] === undefined) {
        manualPoAmountRequestsMap[key] = r.poAmountRequest;
      }
    }
  });

  const poEmployees: Record<string, { id: string; name: string; hrCode: string; account?: string; project?: string; cost: number }[]> = {};
  const posUsedInSelectedMonth = new Set<string>();
  let unallocatedEmployeeCost = 0;
  
  const runningDispReqSum: Record<string, number> = {};

  const calculateProratedSalaryForMonthYear = (emp: any, m: string, y: number) => {
    const monthIndex = months.indexOf(m);
    const startOfSelectedMonth = new Date(y, monthIndex, 1);
    const endOfSelectedMonth = new Date(y, monthIndex + 1, 0, 23, 59, 59);
    const totalDaysInMonth = new Date(y, monthIndex + 1, 0).getDate();

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

  years.forEach((y) => {
    months.forEach((m) => {
      const isSelectedMonth = m === selectedMonth && y === selectedYear;
      const monthIndex = months.indexOf(m);
      const startOfMonth = new Date(y, monthIndex, 1);
      const endOfMonth = new Date(y, monthIndex + 1, 0, 23, 59, 59);

      const monthKeyPrefix = `${m}_${y}_`;
      const currentMonthCosts: Record<string, number> = {};
      const currentMonthReqs: Record<string, number> = {};

      poAcceptances
        .filter((r) => r.month === m && r.year === y)
        .forEach((record) => {
          if (record.poNumber) {
            poAvailableCapacity[record.poNumber] = (poAvailableCapacity[record.poNumber] || 0) + (Number(record.amountPo) || 0);
          }
        });

      employees.forEach((emp) => {
        let hiringDateLocal = new Date(0);
        if (emp.dateHiring) {
          const parts = emp.dateHiring.split("-");
          if (parts.length === 3) {
            hiringDateLocal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            hiringDateLocal = new Date(emp.dateHiring);
          }
        }
        
        let resignDateLocal: Date | null = null;
        if (emp.status === "Resigned" && emp.dateResign) {
          const parts = emp.dateResign.split("-");
          if (parts.length === 3) {
            resignDateLocal = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            resignDateLocal = new Date(emp.dateResign);
          }
        }
        
        if (hiringDateLocal && !isNaN(hiringDateLocal.getTime()) && hiringDateLocal > endOfMonth) return;
        if (resignDateLocal && !isNaN(resignDateLocal.getTime()) && resignDateLocal < startOfMonth) return;

        const overrideKey = `${emp.id}_${m}_${y}`;
        const overrides = salaryOverrides[overrideKey] || { poNumbers: [] };

        const netSalary = calculateProratedSalaryForMonthYear(emp, m, y);
        const siEmp = emp.socialInsuranceEmployee || 0;
        const siComp = emp.socialInsuranceCompany || 0;
        const taxes = emp.taxes || 0;
        const medical = emp.medical || 0;
        const gross = netSalary + siEmp + siComp + taxes + medical;

        const ot = overrides.ot || 0;
        const topHero = overrides.topHero || (emp.id === "EMP-001" ? 1000 : 0);
        const gift = overrides.gift || 0;
        const retro = overrides.retro || 0;
        const mobile = overrides.mobile || 0;

        const safetyDataKey = `${emp.id}_${m}_${y}`;
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

        const totalCost = gross + ot + topHero + gift + retro + mobile + totalSafetyAmount;

        if (!overrides.poNumbers || overrides.poNumbers.length === 0) {
          if (isSelectedMonth) {
            unallocatedEmployeeCost += totalCost;
          }
          return;
        }

        let remainingCost = totalCost;

        overrides.poNumbers.forEach((poNum, index) => {
          if (isSelectedMonth) {
            posUsedInSelectedMonth.add(poNum);
          }
          if (overrides.poAmountRequests && overrides.poAmountRequests[index]) {
            const reqAmount = Number(overrides.poAmountRequests[index]);
            if (!isNaN(reqAmount)) {
              currentMonthReqs[poNum] = (currentMonthReqs[poNum] || 0) + reqAmount;
            }
          }

          if (remainingCost <= 0) return;

          let allocatedCost = 0;
          const isLastPo = index === overrides.poNumbers.length - 1;

          if (isLastPo) {
            allocatedCost = remainingCost;
          } else {
            const capacity = poAvailableCapacity[poNum] || 0;
            allocatedCost = Math.max(0, Math.min(capacity, remainingCost));
          }

          if (allocatedCost > 0) {
            if (poAvailableCapacity[poNum] !== undefined) {
              poAvailableCapacity[poNum] -= allocatedCost;
            } else {
              poAvailableCapacity[poNum] = -allocatedCost;
            }

            globalPoCosts[poNum] = (globalPoCosts[poNum] || 0) + allocatedCost;
            currentMonthCosts[poNum] = (currentMonthCosts[poNum] || 0) + allocatedCost;

            if (isSelectedMonth) {
              if (!poEmployees[poNum]) poEmployees[poNum] = [];
              poEmployees[poNum].push({
                id: emp.id,
                name: emp.name,
                hrCode: emp.hrCode,
                account: emp.account,
                project: emp.project,
                cost: allocatedCost,
              });
            }

            remainingCost -= allocatedCost;
          }
        });
      });

      const uniquePosThisMonth = new Set([...Object.keys(currentMonthCosts), ...Object.keys(currentMonthReqs)]);
      poAcceptances.filter(r => r.month === m && r.year === y && r.poNumber).forEach(r => uniquePosThisMonth.add(r.poNumber));

      uniquePosThisMonth.forEach(poNum => {
        const key = `${monthKeyPrefix}${poNum}`;
        monthlyCostsPo[key] = currentMonthCosts[poNum] || 0;
        monthlyCalcReqs[key] = currentMonthReqs[poNum] || 0;

        const manualReq = manualPoAmountRequestsMap[key];
        const targetReq = manualReq !== undefined ? manualReq : monthlyCalcReqs[key];
        const dispReq = targetReq > 0 ? targetReq : monthlyCostsPo[key];
        
        const currentCum = runningDispReqSum[poNum] || 0;
        cumulativeDispReqs[key] = currentCum;
        
        runningDispReqSum[poNum] = currentCum + dispReq;
      });
    });
  });

  const poCosts: Record<string, number> = {};
  const poAmountRequestsMap: Record<string, number> = {};
  const cumReqs: Record<string, number> = {};
  const manualSelectedReqs: Record<string, number> = {};
  Object.keys(monthlyCostsPo).forEach(key => {
    if (key.startsWith(`${selectedMonth}_${selectedYear}_`)) {
      const poNum = key.replace(`${selectedMonth}_${selectedYear}_`, '');
      poCosts[poNum] = monthlyCostsPo[key];
      poAmountRequestsMap[poNum] = monthlyCalcReqs[key];
      cumReqs[poNum] = cumulativeDispReqs[key];
    }
  });
  Object.keys(manualPoAmountRequestsMap).forEach(key => {
    if (key.startsWith(`${selectedMonth}_${selectedYear}_`)) {
      const poNum = key.replace(`${selectedMonth}_${selectedYear}_`, '');
      manualSelectedReqs[poNum] = manualPoAmountRequestsMap[key];
    }
  });

  const registeredPoNumbers = new Set(currentRecords.map(r => r.poNumber).filter(Boolean));
  const unregisteredPos = Array.from(posUsedInSelectedMonth).filter(po => po && !registeredPoNumbers.has(po));
  const unregisteredPoTotalCost = unregisteredPos.reduce((sum, po) => sum + (poCosts[po] || 0), 0);

  // Auto-add POs from Total Cost Calculation
  useEffect(() => {
    if (unregisteredPos.length > 0) {
      setPoAcceptances((prev) => {
        const existingPos = new Set(prev.filter(r => r.month === selectedMonth && r.year === selectedYear).map(r => r.poNumber).filter(Boolean));
        const newMissing = unregisteredPos.filter(po => !existingPos.has(po));
        if (newMissing.length === 0) return prev;
        
        const newRecords: POAcceptance[] = newMissing.map(poNum => ({
          id: `POA-${Date.now()}-${Math.random()}`,
          month: selectedMonth,
          year: selectedYear,
          poNumber: poNum,
          amountPo: 0,
          costPo: 0,
          balancePo: 0,
          grnNumber: "",
          grnDate: "",
          invoiceNo: "",
          invoiceDate: "",
          collectDate: "",
        }));
        return [...prev, ...newRecords];
      });
    }
  }, [unregisteredPos.join(","), selectedMonth, selectedYear, setPoAcceptances]);

  const hasIssues = unallocatedEmployeeCost > 0 || unregisteredPos.length > 0;

  const handleUpdate = (id: string, field: keyof POAcceptance, value: any) => {
    setPoAcceptances((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleDelete = (id: string) => {
    setPoAcceptances((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDeletePoNumber = (poNumber: string) => {
    setPoToDelete(poNumber);
  };

  const confirmDeletePo = (poNumber: string) => {
    setPoAcceptances((prev) => prev.filter((r) => r.poNumber !== poNumber));
    setEditPoAmounts((prev) => {
      const copy = { ...prev };
      delete copy[poNumber];
      return copy;
    });
    setPoToDelete(null);
  };

  const posNeedingAmount = currentRecords.filter(r => {
    if (!r.poNumber) return false;
    const globalAmount = poAcceptances
      .filter(allR => allR.poNumber === r.poNumber)
      .reduce((sum, allR) => sum + (Number(allR.amountPo) || 0), 0);
    return globalAmount === 0;
  }).reduce((acc, current) => {
    if (!acc.find(item => item.poNumber === current.poNumber)) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof currentRecords);

  const posNeedingAmountRequest = currentRecords.filter(r => {
    if (!r.poNumber) return false;
    const manualReq = manualSelectedReqs[r.poNumber];
    if (manualReq !== undefined) return false;
    const calcReq = poAmountRequestsMap[r.poNumber] || 0;
    return calcReq === 0;
  }).reduce((acc, current) => {
    if (!acc.find(item => item.poNumber === current.poNumber)) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof currentRecords);

  const allUniquePos: string[] = Array.from(new Set(poAcceptances.map(r => r.poNumber).filter(Boolean) as string[]));
  const posForEditing = allUniquePos.map(po => {
    const globalAmount = poAcceptances
      .filter(allR => allR.poNumber === po)
      .reduce((sum, allR) => sum + (Number(allR.amountPo) || 0), 0);
    return { poNumber: po, amountPo: globalAmount };
  }).filter(po => po.poNumber && po.poNumber.toLowerCase().includes(editPoSearch.toLowerCase()));

  const posForEditingRequest = allUniquePos.map(po => {
    const record = poAcceptances.find(allR => allR.poNumber === po && allR.poAmountRequest !== undefined);
    return { poNumber: po, poAmountRequest: record ? record.poAmountRequest : undefined };
  }).filter(po => po.poNumber && po.poNumber.toLowerCase().includes(editPoAmountRequestSearch.toLowerCase()));

  const unusedPos = poAcceptances.filter(r => 
    (!r.month || r.month === "") && 
    r.poNumber && 
    !(globalPoCosts[r.poNumber] > 0)
  );
  
  const unusedPosCount = unusedPos.length;

  const poRequests = currentRecords.filter((record) => {
    const globalAmount = poAcceptances
      .filter(r => r.poNumber === record.poNumber)
      .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
    const calculatedCostPo = record.poNumber ? (poCosts[record.poNumber] || 0) : 0;
    const calculatedPoAmountRequest = record.poNumber ? (poAmountRequestsMap[record.poNumber] || 0) : 0;
    const manualPoAmountRequest = record.poNumber ? (manualSelectedReqs[record.poNumber]) : undefined;
    const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
    const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
    const calculatedBalancePo = globalAmount - (cumReqs[record.poNumber] || 0) - displayPoAmountRequest;
    return calculatedBalancePo < displayPoAmountRequest && displayPoAmountRequest > 0;
  });

  const uniqueRequestPOs: string[] = Array.from(new Set(poRequests.map(r => r.poNumber).filter(Boolean) as string[]));
  const requestsCount = uniqueRequestPOs.length;

  const filteredRecords = currentRecords.filter((record) => {
    const globalAmount = poAcceptances
      .filter(r => r.poNumber === record.poNumber)
      .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
    const calculatedCostPo = record.poNumber ? (poCosts[record.poNumber] || 0) : 0;
    const calculatedPoAmountRequest = record.poNumber ? (poAmountRequestsMap[record.poNumber] || 0) : 0;
    const manualPoAmountRequest = record.poNumber ? (manualSelectedReqs[record.poNumber]) : undefined;
    const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
    const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
    const calculatedBalancePo = globalAmount - (cumReqs[record.poNumber] || 0) - displayPoAmountRequest;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    return (
      (record.poNumber || "").toLowerCase().includes(term) ||
      (record.grnNumber || "").toLowerCase().includes(term) ||
      (record.grnDate || "").toLowerCase().includes(term) ||
      (record.invoiceNo || "").toLowerCase().includes(term) ||
      (record.invoiceDate || "").toLowerCase().includes(term) ||
      (record.collectDate || "").toLowerCase().includes(term) ||
      (record.collectState || "").toLowerCase().includes(term) ||
      globalAmount.toString().includes(term) ||
      calculatedCostPo.toString().includes(term) ||
      calculatedBalancePo.toString().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">PO Acceptances</h2>
          <p className="text-muted-fg">
            Manage PO Acceptances for each month.
          </p>
        </div>
      </div>

      {hasIssues && (
        <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-3 rounded-lg flex flex-col gap-2 shadow-sm text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Unallocated Costs Alert</span>
          </div>
          <div className="pl-7 space-y-1">
            {unregisteredPos.length > 0 && (
              <p>
                <strong>Unregistered POs:</strong> PO Numbers <span className="font-mono">{unregisteredPos.join(", ")}</span> have a total of <span className="font-bold">{unregisteredPoTotalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> cost allocated to them but are not yet added to the tracking table below.
              </p>
            )}
            {unallocatedEmployeeCost > 0 && (
              <p>
                <strong>Unallocated Employees:</strong> A total cost of <span className="font-bold">{unallocatedEmployeeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> belongs to employees who have <span className="underline font-medium">no PO Numbers selected</span>.
              </p>
            )}
          </div>
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

            <div className="flex items-center gap-3 shrink-0">
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
              <Button onClick={() => setShowCollectStateModal(true)} size="sm" variant="outline" className="gap-2 h-8 ml-2">
                <List className="w-4 h-4" /> Collect State
              </Button>
              {canExport && (
                <Button onClick={handleExportYear} size="sm" variant="outline" className="gap-2 h-8">
                  <Download className="w-4 h-4" /> Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <div className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg/80" />
              <Input
                placeholder="Search across all fields and amounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-input-bg"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={() => setShowAddNewPo(true)} size="sm" variant="outline" className="gap-2 relative">
                <Plus className="w-4 h-4" /> Add New PO
                {unusedPosCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-fg text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {unusedPosCount}
                  </span>
                )}
              </Button>
              <Button onClick={() => setShowViewUnusedPo(true)} size="sm" variant="outline" className="gap-2" disabled={unusedPosCount === 0}>
                <Eye className="w-4 h-4" /> View Unused PO
              </Button>

              <Button onClick={() => {
                setAllocationModalAmounts({});
                setShowAddPo(true);
              }} size="sm" variant="outline" className="gap-2 relative">
                <Plus className="w-4 h-4" /> Add Total PO Amount
                {posNeedingAmount.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-danger text-danger-fg text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {posNeedingAmount.length}
                  </span>
                )}
              </Button>
              <Button onClick={() => setShowEditPoAmount(true)} size="sm" variant="outline" className="gap-2">
                <Edit2 className="w-4 h-4" /> Edit Total PO Amount
              </Button>
              <Button onClick={() => {
                if (posNeedingAmountRequest.length > 0) {
                  setEditPoAmountRequestSearch(posNeedingAmountRequest[0].poNumber || "");
                } else {
                  setEditPoAmountRequestSearch("");
                }
                setShowEditPoAmountRequest(true);
              }} size="sm" variant="outline" className="gap-2 relative">
                <Edit2 className="w-4 h-4" /> PO Amount Request
                {posNeedingAmountRequest.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-warning text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {posNeedingAmountRequest.length}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRequestsModal(true)}
                className={`gap-2 relative border-red-300 hover:bg-red-50 hover:text-red-700`}
              >
                <AlertCircle className={`w-4 h-4 text-red-500`} />
                Request
                {requestsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                    {requestsCount}
                  </span>
                )}
              </Button>
              {canManage && (
                <>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <Button onClick={() => importInputRef.current?.click()} size="sm" variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" /> Import
                  </Button>
                </>
              )}
              {canExport && (
                <Button onClick={handleExport} size="sm" variant="outline" className="gap-2" disabled={filteredRecords.length === 0}>
                  <Download className="w-4 h-4" /> Export
                </Button>
              )}
              {canManage && (
                <Button onClick={handleAddRow} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Row
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table min-w-[1300px]">
              <thead>
                <tr className="bg-muted text-muted-fg uppercase text-[10px] tracking-wider text-left border-b">
                  <th className="px-4 py-3 font-semibold w-40">PO Number</th>
                  <th className="px-4 py-3 font-semibold w-32">Total PO Amount</th>
                  <th className="px-4 py-3 font-semibold w-32">PO Amount Request</th>
                  <th className="px-4 py-3 font-semibold w-32">Cost Month</th>
                  <th className="px-4 py-3 font-semibold w-32">Total Cost</th>
                  <th className="px-4 py-3 font-semibold w-32">Balance PO</th>
                  <th className="px-4 py-3 font-semibold w-40">GRN Number</th>
                  <th className="px-4 py-3 font-semibold w-40">GRN Date</th>
                  <th className="px-4 py-3 font-semibold w-40">Invoice NO</th>
                  <th className="px-4 py-3 font-semibold w-40">Invoice Date</th>
                  <th className="px-4 py-3 font-semibold w-40">Collect Date</th>
                  <th className="px-4 py-3 font-semibold w-32">Collect State</th>
                  <th className="px-4 py-3 font-semibold w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-muted-fg">
                      {currentRecords.length === 0 
                        ? `No acceptances recorded for ${selectedMonth} ${selectedYear}. Click "Add Row" to start.` 
                        : "No matching records found for your search."}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const mappedEmployees = record.poNumber ? (poEmployees[record.poNumber] || []) : [];
                    const calculatedCostPo = record.poNumber ? (poCosts[record.poNumber] || 0) : 0;
                    const calculatedPoAmountRequest = record.poNumber ? (poAmountRequestsMap[record.poNumber] || 0) : 0;
                    const manualPoAmountRequest = record.poNumber ? (manualSelectedReqs[record.poNumber]) : undefined;
                    const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
                    const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
                    
                    const globalAmount = poAcceptances
                      .filter(r => r.poNumber === record.poNumber)
                      .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
                    const globalCost = record.poNumber ? (globalPoCosts[record.poNumber] || 0) : 0;

                    const calculatedBalancePo = globalAmount - (cumReqs[record.poNumber] || 0) - displayPoAmountRequest;

                    const isExpanded = expandedRows[record.id] || false;
                    const toggleExpanded = () => setExpandedRows((prev) => ({ ...prev, [record.id]: !prev[record.id] }));

                    return (
                    <React.Fragment key={record.id}>
                    <tr className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {mappedEmployees.length > 0 ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 shrink-0 p-0 hover:bg-muted" 
                              onClick={toggleExpanded}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}
                          <div className="h-8 text-xs flex-1 flex items-center justify-center px-3 rounded-md border border-border bg-muted/10 font-medium">
                            {record.poNumber || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="h-8 text-xs w-full flex items-center justify-center px-3 rounded-md border border-border bg-muted/10 font-medium">
                          {globalAmount > 0 ? globalAmount.toLocaleString() : "0"}
                        </div>
                      </td>
                      <td className="p-2 px-4 text-right font-medium text-ink bg-muted/10">
                        {displayPoAmountRequest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 px-4 text-right font-medium text-ink bg-muted/10 border-l border-border/50">
                        {calculatedCostPo.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 px-4 text-right font-medium text-ink bg-muted/10 border-l border-border/50">
                        {globalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`p-2 px-4 text-right font-bold ${calculatedBalancePo >= 0 ? 'text-success' : 'text-danger'} bg-muted/30`}>
                        {calculatedBalancePo.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <Input
                          value={record.grnNumber}
                          onChange={(e) => handleUpdate(record.id, "grnNumber", e.target.value)}
                          placeholder="GRN Num"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={record.grnDate}
                          onChange={(e) => handleUpdate(record.id, "grnDate", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={record.invoiceNo}
                          onChange={(e) => handleUpdate(record.id, "invoiceNo", e.target.value)}
                          placeholder="Invoice No"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={record.invoiceDate}
                          onChange={(e) => handleUpdate(record.id, "invoiceDate", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={record.collectDate}
                          onChange={(e) => handleUpdate(record.id, "collectDate", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={record.collectState || ""}
                          onChange={(e) => handleUpdate(record.id, "collectState", e.target.value)}
                          className="w-full h-8 px-2 text-xs border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">- State -</option>
                          <option value="Pending">Pending</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Partial">Partial</option>
                          <option value="Collected">Collected</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record.id)}
                          className="h-8 w-8 text-danger hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && mappedEmployees.length > 0 && (
                      <tr className="bg-muted/10 border-b border-border/50">
                        <td colSpan={12} className="p-4 pl-14">
                          <div className="text-xs font-semibold text-muted-fg mb-3 uppercase tracking-wider">
                            Employees Allocated to PO {record.poNumber}
                          </div>
                          <div className="rounded-md border border-border bg-card-bg overflow-hidden inline-block min-w-[500px] shadow-sm">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr className="text-left text-[10px] text-muted-fg uppercase tracking-wide border-b border-border">
                                  <th className="px-3 py-2 font-semibold border-r border-border">HR Code</th>
                                  <th className="px-3 py-2 font-semibold border-r border-border">Employee Name</th>
                                  <th className="px-3 py-2 font-semibold border-r border-border">Account</th>
                                  <th className="px-3 py-2 font-semibold border-r border-border">Project</th>
                                  <th className="px-3 py-2 font-semibold text-right">Apportioned Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mappedEmployees.map(emp => (
                                  <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                    <td className="px-3 py-2 font-mono text-xs border-r border-border">{emp.hrCode}</td>
                                    <td className="px-3 py-2 border-r border-border">{emp.name}</td>
                                    <td className="px-3 py-2 border-r border-border">{emp.account || "-"}</td>
                                    <td className="px-3 py-2 border-r border-border">{emp.project || "-"}</td>
                                    <td className="px-3 py-2 text-right font-medium">
                                      {emp.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-muted border-t border-border">
                                  <td colSpan={4} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-fg border-r border-border">Total Cost Apportioned</td>
                                  <td className="px-3 py-2 text-right font-bold text-accent">
                                    {calculatedCostPo.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Add New PO Modal */}
      {showAddNewPo && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink">Add New PO</h3>
              <button
                onClick={() => setShowAddNewPo(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-fg">PO Number</label>
                <Input 
                  placeholder="Enter PO Number" 
                  value={newPoData.poNumber} 
                  onChange={e => setNewPoData({ ...newPoData, poNumber: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-fg">Total PO Amount</label>
                <Input 
                  type="number"
                  placeholder="0.00" 
                  value={newPoData.amountPo} 
                  onChange={e => setNewPoData({ ...newPoData, amountPo: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border bg-muted flex justify-end gap-3 rounded-b-xl border-b-0 space-x-0">
              <Button onClick={() => setShowAddNewPo(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleAddNewPoSubmit} disabled={!newPoData.poNumber}>
                Save PO
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Total PO Amount Modal */}
      {showAddPo && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink">Add Total PO Amounts</h3>
              <button
                onClick={() => setShowAddPo(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto min-h-[150px]">
              {posNeedingAmount.length === 0 ? (
                <div className="text-center text-muted-fg py-8">
                  No POs currently need amounts for {selectedMonth} {selectedYear}.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-fg mb-4">
                    Enter the Total PO Amount for the following POs. 
                    Leave blank to skip.
                  </div>
                  
                  {posNeedingAmount.map(po => (
                    <div key={po.id} className="flex items-center gap-4 p-3 bg-muted/20 border border-border rounded-lg">
                      <div className="flex-1 font-mono font-medium">
                        PO: {po.poNumber}
                      </div>
                      <Input
                        type="number"
                        placeholder="Total PO Amount"
                        value={allocationModalAmounts[po.poNumber] ?? ""}
                        onChange={(e) => setAllocationModalAmounts(prev => ({ ...prev, [po.poNumber]: e.target.value === "" ? "" : Number(e.target.value) }))}
                        className="w-40 font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-muted shrink-0 flex justify-end gap-3 rounded-b-xl border-b-0 space-x-0">
              <Button onClick={() => setShowAddPo(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleSavePoAllocations} disabled={posNeedingAmount.length === 0}>
                Save Amounts
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Edit PO Amount Modal */}
      {showEditPoAmount && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink">Edit PO Amount</h3>
              <button
                onClick={() => setShowEditPoAmount(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-border bg-card shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
                <Input
                  placeholder="Search PO Number..."
                  value={editPoSearch}
                  onChange={(e) => setEditPoSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto min-h-[150px]">
              {posForEditing.length === 0 ? (
                <div className="text-center text-muted-fg py-8">
                  {editPoSearch ? "No POs found matching your search." : "No POs available to edit."}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-fg flex justify-between items-center px-3 mb-2">
                    <div className="flex-1">PO Number</div>
                    <div className="w-40 mr-14">Total PO Amount</div>
                  </div>
                  
                  {posForEditing.map(po => (
                    <div key={po.poNumber} className="flex items-center gap-4 p-3 bg-muted/20 border border-border rounded-lg">
                      <div className="flex-1 font-mono font-medium truncate">
                        {po.poNumber}
                      </div>
                      <Input
                        type="number"
                        placeholder="Current: "
                        value={editPoAmounts[po.poNumber] ?? po.amountPo}
                        onChange={(e) => setEditPoAmounts(prev => ({ ...prev, [po.poNumber]: e.target.value === "" ? "" : Number(e.target.value) }))}
                        className="w-40 font-bold bg-card"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePoNumber(po.poNumber)}
                        className="h-10 w-10 text-danger hover:bg-red-50 shrink-0"
                        title="Delete PO"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-muted shrink-0 flex justify-end gap-3 rounded-b-xl border-b-0 space-x-0">
              <Button onClick={() => setShowEditPoAmount(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleSaveEditPoAmounts} disabled={Object.keys(editPoAmounts).length === 0}>
                Save Changes
              </Button>
            </div>
          </Card>

          {/* Delete PO confirmation overlay */}
          {poToDelete !== null && (
            <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6 text-danger" />
                  </div>
                  <h3 className="font-bold text-lg text-ink">Delete PO Number</h3>
                  <p className="text-sm text-muted-fg leading-relaxed">
                    Are you sure you want to delete PO <strong className="font-mono text-ink">"{poToDelete}"</strong>? This will delete all associated PO acceptance records. This action cannot be undone.
                  </p>
                  <div className="pt-4 flex gap-3 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPoToDelete(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => confirmDeletePo(poToDelete)}
                    >
                      Delete PO
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Edit PO Amount Request Modal */}
      {showEditPoAmountRequest && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink">Edit PO Amount Request</h3>
              <button
                onClick={() => setShowEditPoAmountRequest(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-border bg-card shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
                <Input
                  placeholder="Search PO Number..."
                  value={editPoAmountRequestSearch}
                  onChange={(e) => setEditPoAmountRequestSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto min-h-[150px]">
              {posForEditingRequest.length === 0 ? (
                <div className="text-center text-muted-fg py-8">
                  {editPoAmountRequestSearch ? "No POs found matching your search." : "No POs available to edit."}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-fg grid grid-cols-2 gap-4 px-3 mb-2">
                    <div>PO Number</div>
                    <div>PO Amount Request</div>
                  </div>
                  
                  {posForEditingRequest.map(po => (
                    <div key={po.poNumber} className="flex items-center gap-4 p-3 bg-muted/20 border border-border rounded-lg">
                      <div className="flex-1 font-mono font-medium">
                        {po.poNumber}
                      </div>
                      <Input
                        type="number"
                        placeholder="Current: "
                        value={editPoAmountRequests[po.poNumber] ?? po.poAmountRequest ?? ""}
                        onChange={(e) => setEditPoAmountRequests(prev => ({ ...prev, [po.poNumber]: e.target.value === "" ? "" : Number(e.target.value) }))}
                        className="w-40 font-bold bg-card"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-muted shrink-0 flex justify-end gap-3 rounded-b-xl border-b-0 space-x-0">
              <Button onClick={() => setShowEditPoAmountRequest(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleSaveEditPoAmountRequests} disabled={Object.keys(editPoAmountRequests).length === 0}>
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* View Unused POs Modal */}
      {showViewUnusedPo && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink">View Unused POs</h3>
              <button
                onClick={() => setShowViewUnusedPo(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto min-h-[150px]">
              {unusedPos.length === 0 ? (
                <div className="text-center text-muted-fg py-8">
                  No unused POs found.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-fg grid grid-cols-2 gap-4 px-3 mb-2">
                    <div>PO Number</div>
                    <div>Total PO Amount</div>
                  </div>
                  
                  {unusedPos.map(po => (
                    <div key={po.id} className="flex items-center gap-4 p-3 bg-muted/20 border border-border rounded-lg">
                      <div className="flex-1 font-mono font-medium">
                        {po.poNumber}
                      </div>
                      <div className="w-40 font-bold bg-muted/10 p-2 rounded text-right">
                        {po.amountPo?.toLocaleString() || "0"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      {/* Collect State Modal */}
      {showCollectStateModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink">Collect State Report</h3>
              <button
                onClick={() => {
                  setShowCollectStateModal(false);
                  setCollectStateSearchClicked(false);
                }}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 shrink-0 bg-card border-b border-border space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Date From</label>
                  <Input type="date" value={collectDateFrom} onChange={(e) => setCollectDateFrom(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Date To</label>
                  <Input type="date" value={collectDateTo} onChange={(e) => setCollectDateTo(e.target.value)} />
                </div>
                <Button onClick={() => setCollectStateSearchClicked(true)} className="gap-2 shrink-0">
                  <Search className="w-4 h-4" /> Search
                </Button>
                {canExport && (
                  <Button onClick={handleExportCollectState} variant="outline" className="gap-2 shrink-0" disabled={collectStateRecords.length === 0}>
                    <Download className="w-4 h-4" /> Export
                  </Button>
                )}
              </div>
            </div>

            <div className="p-0 overflow-y-auto min-h-[300px]">
              {!collectStateSearchClicked ? (
                <div className="text-center text-muted-fg py-12">
                  Select a date range and click Search.
                </div>
              ) : collectStateRecords.length === 0 ? (
                <div className="text-center text-muted-fg py-12">
                  No records found for this date range.
                </div>
              ) : (
                <table className="w-full text-sm data-table">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr className="text-left text-[10px] text-muted-fg uppercase tracking-wide border-b border-border">
                      <th className="px-4 py-3 font-semibold w-40">PO Number</th>
                      <th className="px-4 py-3 font-semibold w-32">Total PO Amount</th>
                      <th className="px-4 py-3 font-semibold w-32">PO Amount Request</th>
                      <th className="px-4 py-3 font-semibold w-32">Cost Month</th>
                      <th className="px-4 py-3 font-semibold w-32">Total Cost</th>
                      <th className="px-4 py-3 font-semibold w-32">Collect State</th>
                      <th className="px-4 py-3 font-semibold w-32">Collect Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectStateRecords.map(record => {
                      const globalAmount = poAcceptances
                        .filter(r => r.poNumber === record.poNumber)
                        .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
                      const calculatedCostPo = record.poNumber ? (poCosts[record.poNumber] || 0) : 0;
                      const calculatedPoAmountRequest = record.poNumber ? (poAmountRequestsMap[record.poNumber] || 0) : 0;
                      const manualPoAmountRequest = record.poNumber ? (manualSelectedReqs[record.poNumber]) : undefined;
                      const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
                      const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
                      
                      const globalCost = record.poNumber ? (globalPoCosts[record.poNumber] || 0) : 0;
                      
                      return (
                        <tr key={record.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-medium">{record.poNumber}</td>
                          <td className="px-4 py-3 font-bold">{globalAmount.toLocaleString()}</td>
                          <td className="px-4 py-3">{displayPoAmountRequest.toLocaleString()}</td>
                          <td className="px-4 py-3">{calculatedCostPo.toLocaleString()}</td>
                          <td className="px-4 py-3">{globalCost.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              record.collectState === 'Collected' ? 'bg-success/10 text-success' :
                              record.collectState === 'Pending' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-muted-fg'
                            }`}>
                              {record.collectState || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-fg">{record.collectDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}
      {/* Requests Modal */}
      {showRequestsModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted shrink-0">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                PO Requests
              </h3>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto min-h-[150px]">
              {uniqueRequestPOs.length === 0 ? (
                <div className="text-center text-muted-fg py-8">
                  No PO requests needed for {selectedMonth} {selectedYear}.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-fg grid grid-cols-2 gap-4 px-3 mb-2">
                    <div>PO Number</div>
                    <div className="text-right">Deficit Amount</div>
                  </div>
                  
                  {uniqueRequestPOs.map((poNum, i) => {
                    const globalAmount = poAcceptances
                      .filter(r => r.poNumber === poNum)
                      .reduce((sum, r) => sum + (Number(r.amountPo) || 0), 0);
                    const calculatedCostPo = poNum ? (poCosts[poNum] || 0) : 0;
                    const calculatedPoAmountRequest = poNum ? (poAmountRequestsMap[poNum] || 0) : 0;
                    const manualPoAmountRequest = poNum ? (manualSelectedReqs[poNum]) : undefined;
                    const targetPoAmountRequest = manualPoAmountRequest !== undefined ? manualPoAmountRequest : calculatedPoAmountRequest;
                    const displayPoAmountRequest = targetPoAmountRequest > 0 ? targetPoAmountRequest : calculatedCostPo;
                    const calculatedBalancePo = globalAmount - (cumReqs[poNum] || 0) - displayPoAmountRequest;
                    const deficit = displayPoAmountRequest - calculatedBalancePo;
                    
                    return (
                      <div key={i} className="bg-card-bg border border-red-200 rounded-lg p-3 grid grid-cols-2 gap-4 items-center pl-4 shadow-[inset_3px_0_0_0_#ef4444]">
                        <span className="font-mono font-bold text-ink">{poNum}</span>
                        <span className="text-red-500 text-sm font-semibold text-right">
                          {deficit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
