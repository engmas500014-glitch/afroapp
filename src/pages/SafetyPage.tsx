import React, { useState } from "react";
import { Card, CardHeader, Input, Button } from "../components/ui";
import { useAppContext, SafetyRecord } from "../store/AppContext";
import { Search, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Download, Info, Mail, Phone } from "lucide-react";

export function SafetyPage() {
  const { visibleEmployees: employees, safetyRecords, setSafetyRecords, user, permissions } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Jan");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [filterExpired, setFilterExpired] = useState(false);
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);

  const toggleRow = (empId: string) => {
    setExpandedRows(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const years = [2024, 2025, 2026, 2027];

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("Safety", "Manage Safety") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("Safety", "Export Safety Records") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";

  const handleUpdate = (empId: string, field: keyof SafetyRecord, value: number | string) => {
    const isDateField = typeof field === 'string' && (field.endsWith('Start') || field.endsWith('End'));
    const key = isDateField ? `${empId}_dates` : `${empId}_${selectedMonth}_${selectedYear}`;

    setSafetyRecords((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const getRecord = (empId: string): SafetyRecord => {
    const dataKey = `${empId}_${selectedMonth}_${selectedYear}`;
    const datesKey = `${empId}_dates`;

    const data = safetyRecords[dataKey] || {
      medicalCheck: 0,
      workingAtHeight: 0,
      electricity: 0,
      riskAssessment: 0,
      fireFighting: 0,
      firstAid: 0,
      ppe: 0
    };
    const dates = safetyRecords[datesKey] || {};

    console.log("getRecord:", { empId, selectedMonth, datesKey, dates });

    return {
      ...data,
      medicalCheckStart: dates.medicalCheckStart !== undefined ? dates.medicalCheckStart : data.medicalCheckStart,
      medicalCheckEnd: dates.medicalCheckEnd !== undefined ? dates.medicalCheckEnd : data.medicalCheckEnd,
      workingAtHeightStart: dates.workingAtHeightStart !== undefined ? dates.workingAtHeightStart : data.workingAtHeightStart,
      workingAtHeightEnd: dates.workingAtHeightEnd !== undefined ? dates.workingAtHeightEnd : data.workingAtHeightEnd,
      electricityStart: dates.electricityStart !== undefined ? dates.electricityStart : data.electricityStart,
      electricityEnd: dates.electricityEnd !== undefined ? dates.electricityEnd : data.electricityEnd,
      riskAssessmentStart: dates.riskAssessmentStart !== undefined ? dates.riskAssessmentStart : data.riskAssessmentStart,
      riskAssessmentEnd: dates.riskAssessmentEnd !== undefined ? dates.riskAssessmentEnd : data.riskAssessmentEnd,
      fireFightingStart: dates.fireFightingStart !== undefined ? dates.fireFightingStart : data.fireFightingStart,
      fireFightingEnd: dates.fireFightingEnd !== undefined ? dates.fireFightingEnd : data.fireFightingEnd,
      firstAidStart: dates.firstAidStart !== undefined ? dates.firstAidStart : data.firstAidStart,
      firstAidEnd: dates.firstAidEnd !== undefined ? dates.firstAidEnd : data.firstAidEnd,
      ppeStart: dates.ppeStart !== undefined ? dates.ppeStart : data.ppeStart,
      ppeEnd: dates.ppeEnd !== undefined ? dates.ppeEnd : data.ppeEnd,
    };
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.hrCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterExpired || filterExpiringSoon) {
      const record = getRecord(emp.id);
      const courses = [
        { end: record.medicalCheckEnd },
        { end: record.workingAtHeightEnd },
        { end: record.electricityEnd },
        { end: record.riskAssessmentEnd },
        { end: record.fireFightingEnd },
        { end: record.firstAidEnd },
        { end: record.ppeEnd }
      ];
      
      const hasExpiredCourse = courses.some(course => course.end && new Date(course.end) < new Date());
      const hasExpiringSoonCourse = courses.some(course => {
        if (!course.end) return false;
        const end = new Date(course.end);
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(now.getMonth() + 1);
        return end >= now && end <= nextMonth;
      });

      if (filterExpired && filterExpiringSoon) return hasExpiredCourse || hasExpiringSoonCourse;
      if (filterExpired) return hasExpiredCourse;
      if (filterExpiringSoon) return hasExpiringSoonCourse;
    }

    return true;
  });

  const handleExport = () => {
    const headers = [
      "HR Code",
      "Employee",
      "Medical Check Amount",
      "Medical Check Start",
      "Medical Check End",
      "Working at Height Amount",
      "Working at Height Start",
      "Working at Height End",
      "Electricity Amount",
      "Electricity Start",
      "Electricity End",
      "Risk Assessment Amount",
      "Risk Assessment Start",
      "Risk Assessment End",
      "Fire Fighting Amount",
      "Fire Fighting Start",
      "Fire Fighting End",
      "First Aid Amount",
      "First Aid Start",
      "First Aid End",
      "PPE Amount",
      "PPE Start",
      "PPE End",
      "Total Amount"
    ];

    const rows = filteredEmployees.map(emp => {
      const record = getRecord(emp.id);
      const total = (record.medicalCheck || 0) + (record.workingAtHeight || 0) + (record.electricity || 0) + (record.riskAssessment || 0) + (record.fireFighting || 0) + (record.firstAid || 0) + (record.ppe || 0);

      return [
        emp.hrCode,
        emp.name,
        record.medicalCheck || 0,
        record.medicalCheckStart || "",
        record.medicalCheckEnd || "",
        record.workingAtHeight || 0,
        record.workingAtHeightStart || "",
        record.workingAtHeightEnd || "",
        record.electricity || 0,
        record.electricityStart || "",
        record.electricityEnd || "",
        record.riskAssessment || 0,
        record.riskAssessmentStart || "",
        record.riskAssessmentEnd || "",
        record.fireFighting || 0,
        record.fireFightingStart || "",
        record.fireFightingEnd || "",
        record.firstAid || 0,
        record.firstAidStart || "",
        record.firstAidEnd || "",
        record.ppe || 0,
        record.ppeStart || "",
        record.ppeEnd || "",
        total
      ].map(val => `"${val}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `safety_records_${selectedMonth}_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Safety Management</h2>
          <p className="text-muted-fg">
            Manage amounts for safety certifications, medical checks, and operations per employee.
          </p>
        </div>
        {canExport && (
          <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
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

          <div className="flex items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg/80" />
              <Input
                placeholder="Search across all fields and amounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-input-bg"
              />
            </div>
            <Button
              variant={filterExpired ? "default" : "outline"}
              onClick={() => setFilterExpired(!filterExpired)}
              className={`gap-2 ${filterExpired ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-300 hover:bg-red-50 hover:text-red-700'}`}
            >
              <AlertCircle className={`w-4 h-4 ${filterExpired ? '' : 'text-red-500'}`} />
              {filterExpired ? "Clear Expired" : "Show Expired"}
            </Button>
            <Button
              variant={filterExpiringSoon ? "default" : "outline"}
              onClick={() => setFilterExpiringSoon(!filterExpiringSoon)}
              className="gap-2 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700"
            >
              <AlertTriangle className={`w-4 h-4 ${filterExpiringSoon ? '' : 'text-yellow-500'}`} />
              {filterExpiringSoon ? "Clear Expiring Soon" : "Show Expiring Soon"}
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto max-h-[600px] no-scrollbar">
          <table className="data-table min-w-[1200px] whitespace-nowrap">
            <thead>
              <tr className="bg-muted text-muted-fg uppercase text-[10px] tracking-wider">
                <th className="w-10"></th>
                <th className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] bg-muted/80 z-50 text-left px-4 py-3 border-b">Employee</th>
                <th className="text-right py-3 px-4 border-b">Medical Check</th>
                <th className="text-right py-3 px-4 border-b">Working at Height</th>
                <th className="text-right py-3 px-4 border-b">Electricity</th>
                <th className="text-right py-3 px-4 border-b">Risk Assessment</th>
                <th className="text-right py-3 px-4 border-b">Fire Fighting</th>
                <th className="text-right py-3 px-4 border-b">First Aid</th>
                <th className="text-right py-3 px-4 border-b">PPE</th>
                <th className="text-right py-3 px-4 border-b text-accent font-bold">Total Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-fg">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const record = getRecord(emp.id);
                  const total = (record.medicalCheck || 0) + (record.workingAtHeight || 0) + (record.electricity || 0) + (record.riskAssessment || 0) + (record.fireFighting || 0) + (record.firstAid || 0) + (record.ppe || 0);
                  const isExpanded = expandedRows[emp.id];

                  const courses = [
                    { key: 'medicalCheck', label: 'Medical Check', val: record.medicalCheck, start: record.medicalCheckStart, end: record.medicalCheckEnd },
                    { key: 'workingAtHeight', label: 'Working at Height', val: record.workingAtHeight, start: record.workingAtHeightStart, end: record.workingAtHeightEnd },
                    { key: 'electricity', label: 'Electricity', val: record.electricity, start: record.electricityStart, end: record.electricityEnd },
                    { key: 'riskAssessment', label: 'Risk Assessment', val: record.riskAssessment, start: record.riskAssessmentStart, end: record.riskAssessmentEnd },
                    { key: 'fireFighting', label: 'Fire Fighting', val: record.fireFighting, start: record.fireFightingStart, end: record.fireFightingEnd },
                    { key: 'firstAid', label: 'First Aid', val: record.firstAid, start: record.firstAidStart, end: record.firstAidEnd },
                    { key: 'ppe', label: 'PPE', val: record.ppe, start: record.ppeStart, end: record.ppeEnd }
                  ];

                  const hasExpiredCourse = courses.some(course => course.end && new Date(course.end) < new Date());
                  const hasExpiringSoonCourse = courses.some(course => {
                    if (!course.end) return false;
                    const end = new Date(course.end);
                    const now = new Date();
                    const nextMonth = new Date();
                    nextMonth.setMonth(now.getMonth() + 1);
                    return end >= now && end <= nextMonth;
                  });

                  return (
                    <React.Fragment key={emp.id}>
                      <tr className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleRow(emp.id)} className="text-muted-fg hover:text-ink transition-colors">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="sticky left-0 shadow-[1px_0_0_0_var(--color-border)] bg-card-bg z-40 text-left px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-ink flex items-center gap-2">
                              {emp.name}
                              <div className="group relative flex items-center">
                                <Info className="w-4 h-4 text-accent hover:opacity-80 cursor-pointer transition-colors" />
                                <div 
                                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col gap-1.5 text-xs rounded-lg p-2.5 shadow-2xl w-max z-[100]"
                                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                                >
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 opacity-70" />
                                    <span>{emp.email || "No Email"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 opacity-70" />
                                    <span>{emp.phone1 || "No Phone"}</span>
                                  </div>
                                  <div 
                                    className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                                    style={{ borderTopColor: '#1e293b' }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            {hasExpiredCourse && (
                              <AlertCircle className="w-4 h-4 text-danger" />
                            )}
                            {!hasExpiredCourse && hasExpiringSoonCourse && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-fg mt-0.5">{emp.hrCode} • {emp.position}</div>
                        </td>
                        {courses.map(col => (
                          <td key={col.key} className="text-right px-2 py-2">
                            <input 
                              type="number"
                              step="any"
                              className="w-[100px] h-8 px-2 bg-muted/50 focus:bg-card-bg border border-transparent focus:border-accent text-right outline-none rounded-md transition-all text-sm placeholder:text-muted-fg/40"
                              value={!col.val ? "" : col.val}
                              placeholder="0"
                              disabled={!canEdit}
                              onChange={(e) => handleUpdate(emp.id, col.key as keyof SafetyRecord, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        ))}
                        <td className="text-right px-4 py-3 font-bold text-accent bg-muted/20">
                          {total.toLocaleString()}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={10} className="px-4 py-4 border-b border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {courses.map(course => {
                                const isExpired = course.end && new Date(course.end) < new Date();
                                const isExpiringSoon = !isExpired && course.end && (() => {
                                  const end = new Date(course.end);
                                  const now = new Date();
                                  const nextMonth = new Date();
                                  nextMonth.setMonth(now.getMonth() + 1);
                                  return end >= now && end <= nextMonth;
                                })();
                                return (
                                <div key={`dates-${course.key}`} className={`bg-white p-3 rounded-lg border ${isExpired ? 'border-red-300 bg-red-50' : isExpiringSoon ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200'} shadow-sm space-y-2`}>
                                  <div className="flex items-center justify-between">
                                    <div className={`text-xs font-bold uppercase tracking-wider ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-700' : 'text-slate-500'}`}>{course.label}</div>
                                    {isExpired && (
                                      <div className="flex items-center space-x-1 text-red-600">
                                        <AlertCircle className="w-3 h-3" />
                                        <span className="text-[10px] uppercase font-bold">Expired</span>
                                      </div>
                                    )}
                                    {isExpiringSoon && (
                                      <div className="flex items-center space-x-1 text-yellow-600">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span className="text-[10px] uppercase font-bold">Expiring Soon</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 w-8">From:</span>
                                      <Input 
                                        type="date"
                                        className={`h-8 text-xs flex-1 ${isExpired ? 'border-red-200 focus:border-red-400' : isExpiringSoon ? 'border-yellow-200 focus:border-yellow-400' : ''}`}
                                        value={course.start || ""}
                                        disabled={!canEdit}
                                        onChange={(e) => handleUpdate(emp.id, `${course.key}Start` as keyof SafetyRecord, e.target.value)}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 w-8">To:</span>
                                      <Input 
                                        type="date"
                                        className={`h-8 text-xs flex-1 ${isExpired ? 'border-red-200 focus:border-red-400' : isExpiringSoon ? 'border-yellow-200 focus:border-yellow-400' : ''}`}
                                        value={course.end || ""}
                                        disabled={!canEdit}
                                        onChange={(e) => handleUpdate(emp.id, `${course.key}End` as keyof SafetyRecord, e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )})}
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
      </Card>
    </div>
  );
}