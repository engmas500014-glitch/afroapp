import React, { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from "../components/ui";
import { useAppContext, Employee } from "../store/AppContext";
import {
  Search,
  Plus,
  Download,
  Upload,
  X,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Trash2,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

export function EmployeesPage() {
  const { 
    employees, 
    setEmployees, 
    user, 
    positions, 
    visibleAccounts: accounts, 
    permissions,
    setSafetyRecords,
    setSalaryOverrides
  } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null,
  );
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newEmp, setNewEmp] = useState({
    id: "",
    hrCode: "",
    name: "",
    position: "",
    account: "",
    project: "",
    email: "",
    phone1: "",
    phone2: "",
    dateHiring: "",
    netSalary: 0,
    bankAccount: "",
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    // Prevent expanding if clicking on a button or inside it
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    setExpandedEmpId((prev) => (prev === id ? null : id));
  };

  const handleDeleteClick = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      setEmployees(employees.filter((e) => e.id !== employeeToDelete.id));
      
      // Clean up local state for safety records and salary overrides
      setSafetyRecords((prev) => {
        const copy = { ...prev };
        delete copy[employeeToDelete.id];
        return copy;
      });
      setSalaryOverrides((prev) => {
        const copy = { ...prev };
        Object.keys(copy).forEach((key) => {
          if (key.startsWith(`${employeeToDelete.id}_`)) {
            delete copy[key];
          }
        });
        return copy;
      });

      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const confirmDeleteAll = () => {
    setEmployees([]);
    setSafetyRecords({});
    setSalaryOverrides({});
    setIsDeleteAllModalOpen(false);
  };

  const getNextIdNumber = () => {
    let maxId = 0;
    employees.forEach(e => {
        const match = e.id.match(/(\d+)$/);
        if (match) {
            maxId = Math.max(maxId, parseInt(match[1], 10));
        }
    });
    return maxId + 1;
  };

  const handleNewEmployeeClick = () => {
    const nextIdNum = getNextIdNumber();
    const generatedId = `EMP-${nextIdNum.toString().padStart(3, "0")}`;
    const generatedHrCode = `HR-${(nextIdNum + 1000).toString()}`;
    setNewEmp({
      id: generatedId,
      hrCode: generatedHrCode,
      name: "",
      position: "",
      account: "",
      project: "",
      email: "",
      phone1: "",
      phone2: "",
      dateHiring: "",
      netSalary: 0,
      bankAccount: "",
    });
    setIsAddModalOpen(true);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const nextIdNum = getNextIdNumber();
    const id = newEmp.id || `EMP-${nextIdNum.toString().padStart(3, "0")}`;
    const hrCode = newEmp.hrCode || `HR-${(nextIdNum + 1000).toString()}`;
    const employee: Employee = {
      id,
      hrCode,
      name: newEmp.name,
      position: newEmp.position,
      account: newEmp.account,
      project: newEmp.project,
      email: newEmp.email,
      phone1: newEmp.phone1,
      phone2: newEmp.phone2,
      dateHiring: newEmp.dateHiring,
      dateResign: "",
      status: "Active" as const,
      netSalary: Number(newEmp.netSalary),
      bankAccount: newEmp.bankAccount,
    };
    
    // Check if ID already exists, if so update it, else add it
    setEmployees(prev => {
        const existingIndex = prev.findIndex(emp => emp.id === id);
        if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = employee;
            return updated;
        }
        return [...prev, employee];
    });

    setIsAddModalOpen(false);
    setNewEmp({
      id: "",
      hrCode: "",
      name: "",
      position: "",
      account: "",
      project: "",
      email: "",
      phone1: "",
      phone2: "",
      dateHiring: "",
      netSalary: 0,
      bankAccount: "",
    });
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleEditClick = (emp: Employee, index: number) => {
    setEditingEmp({
      ...emp,
      id: emp.id || "",
      hrCode: emp.hrCode || "",
      name: emp.name || "",
      position: emp.position || "",
      account: emp.account || "",
      project: emp.project || "",
      email: emp.email || "",
      phone1: emp.phone1 || "",
      phone2: emp.phone2 || "",
      dateHiring: emp.dateHiring || "",
      netSalary: emp.netSalary || 0,
      bankAccount: emp.bankAccount || "",
      status: emp.status || "Active",
      dateResign: emp.dateResign || "",
    });
    setEditingIndex(index);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || editingIndex === null) return;

    setEmployees((prev) => {
      const updated = [...prev];
      updated[editingIndex] = editingEmp;
      return updated;
    });
    setIsEditModalOpen(false);
    setEditingEmp(null);
    setEditingIndex(null);
  };

  const filteredEmployees = employees.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.name.toLowerCase().includes(term) ||
      e.id.toLowerCase().includes(term) ||
      (e.hrCode && e.hrCode.toLowerCase().includes(term)) ||
      e.position.toLowerCase().includes(term) ||
      (e.account && e.account.toLowerCase().includes(term)) ||
      (e.project && e.project.toLowerCase().includes(term)) ||
      e.dateHiring.includes(term) ||
      (e.dateResign && e.dateResign.includes(term)) ||
      e.status.toLowerCase().includes(term) ||
      e.netSalary.toString().includes(term) ||
      (e.bankAccount && e.bankAccount.includes(term))
    );
  });

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("Employees", "Add / Edit / Delete Employees") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canImport = hasPermission("Employees", "Import Employees") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const canExport = hasPermission("Employees", "Export Employees") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let maxIdNum = 0;
        employees.forEach(e => {
            const match = e.id.match(/(\d+)$/);
            if (match) {
                maxIdNum = Math.max(maxIdNum, parseInt(match[1], 10));
            }
        });
        
        let empCount = maxIdNum;
        const newOrUpdatedEmployees = [...employees];

        results.data.forEach((row: any) => {
          const rowHrCode = row["HR Code"] || row["hrCode"] || "";
          const rowId = row["National ID"] || row["ID"] || row["id"] || "";
          
          let existingIndex = -1;
          if (rowHrCode) {
            existingIndex = newOrUpdatedEmployees.findIndex(e => e.hrCode === rowHrCode);
          }
          if (existingIndex === -1 && rowId) {
            existingIndex = newOrUpdatedEmployees.findIndex(e => e.id === rowId);
          }

          const existingEmp = existingIndex >= 0 ? newOrUpdatedEmployees[existingIndex] : null;

          let id = rowId;
          if (!id) {
            if (existingEmp) {
              id = existingEmp.id;
            } else {
              empCount++;
              id = `EMP-${empCount.toString().padStart(3, "0")}`;
            }
          } else {
             const match = id.match(/(\d+)$/);
             if (match) {
                 empCount = Math.max(empCount, parseInt(match[1], 10));
             }
          }
          
          const generatedHrCode = `HR-${(1000 + empCount).toString()}`;
          const hrCode = rowHrCode || (existingEmp ? existingEmp.hrCode : generatedHrCode);

          const parseImportedDate = (dateVal: any): string => {
            if (!dateVal) return "";
            const str = String(dateVal).trim();
            if (!str) return "";

            // If it's a serial number from Excel (usually a number between 10000 and 60000)
            if (/^\d+(\.\d+)?$/.test(str)) {
              const num = parseFloat(str);
              if (num > 30000 && num < 60000) {
                const excelEpoch = new Date(1899, 11, 30);
                const millisecondsInDay = 24 * 60 * 60 * 1000;
                const d = new Date(excelEpoch.getTime() + num * millisecondsInDay);
                if (!isNaN(d.getTime())) {
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  return `${yyyy}-${mm}-${dd}`;
                }
              }
            }

            // Try parsing YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
              return str;
            }

            // Try parsing YYYY/MM/DD
            if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
              return str.replace(/\//g, '-');
            }

            // Try DD/MM/YYYY or DD-MM-YYYY
            let match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (match) {
              const day = match[1].padStart(2, '0');
              const month = match[2].padStart(2, '0');
              const year = match[3];
              return `${year}-${month}-${day}`;
            }

            // Generic JS Date parsing
            try {
              const d = new Date(str);
              if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
              }
            } catch (e) {
              // Ignore and fallback
            }

            return str;
          };

          const getValue = (keys: string[], fallback: any) => {
            for (const key of keys) {
              if (row[key] !== undefined && row[key] !== null) {
                return row[key];
              }
            }
            return fallback;
          };

          const newEmpData: Employee = {
            id,
            hrCode,
            name: getValue(["Name", "name"], existingEmp ? existingEmp.name : "Unknown"),
            position: getValue(["Position", "position"], existingEmp ? existingEmp.position : "-"),
            account: getValue(["Account", "account"], existingEmp ? existingEmp.account : "-"),
            project: getValue(["Project", "project"], existingEmp ? existingEmp.project : "-"),
            email: getValue(["Email", "email"], existingEmp ? existingEmp.email : ""),
            phone1: getValue(["Phone 1", "phone1"], existingEmp ? existingEmp.phone1 : ""),
            phone2: getValue(["Phone 2 (Optional)", "Phone 2", "phone2"], existingEmp ? existingEmp.phone2 : ""),
            dateHiring: parseImportedDate(getValue(["Date Hiring", "dateHiring"], existingEmp ? existingEmp.dateHiring : new Date().toISOString().split('T')[0])),
            dateResign: parseImportedDate(getValue(["Date Resign", "dateResign"], existingEmp ? existingEmp.dateResign : "")),
            status: row["Status"] !== undefined ? (row["Status"] === "Resigned" ? "Resigned" : "Active") : (existingEmp ? existingEmp.status : "Active"),
            bankAccount: getValue(["Bank Account", "bankAccount"], existingEmp ? existingEmp.bankAccount : ""),
            netSalary: Number(getValue(["Net Salary (EGP)", "Net Salary", "netSalary"], existingEmp ? existingEmp.netSalary : 0)),
            socialInsuranceEmployee: Number(getValue(["Social Ins. (Emp)", "socialInsuranceEmployee"], existingEmp ? existingEmp.socialInsuranceEmployee : 0)),
            socialInsuranceCompany: Number(getValue(["Social Ins. (Comp)", "socialInsuranceCompany"], existingEmp ? existingEmp.socialInsuranceCompany : 0)),
            taxes: Number(getValue(["Taxes", "taxes"], existingEmp ? existingEmp.taxes : 0)),
            medical: Number(getValue(["Medical Support", "Medical", "medical"], existingEmp ? existingEmp.medical : 0)),
            notes: getValue(["Notes", "notes"], existingEmp ? existingEmp.notes : ""),
          };

          if (existingIndex >= 0) {
            newOrUpdatedEmployees[existingIndex] = newEmpData;
          } else {
            newOrUpdatedEmployees.push(newEmpData);
          }
        });

        setEmployees(newOrUpdatedEmployees);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleExport = () => {
    if (filteredEmployees.length === 0) return;

    const headers = [
      "National ID",
      "HR Code",
      "Name",
      "Position",
      "Account",
      "Project",
      "Email",
      "Phone 1",
      "Phone 2 (Optional)",
      "Date Hiring",
      "Date Resign",
      "Status",
      "Bank Account",
      "Net Salary (EGP)",
      "Social Ins. (Emp)",
      "Social Ins. (Comp)",
      "Taxes",
      "Medical Support",
      "Notes"
    ];

    const csvRows = [headers.join(",")];

    filteredEmployees.forEach(emp => {
      const row = [
        emp.id || "",
        emp.hrCode || "",
        emp.name || "",
        emp.position || "",
        emp.account || "",
        emp.project || "",
        emp.email || "",
        emp.phone1 || "",
        emp.phone2 || "",
        emp.dateHiring || "",
        emp.dateResign || "",
        emp.status || "",
        emp.bankAccount || "",
        emp.netSalary || 0,
        emp.socialInsuranceEmployee || 0,
        emp.socialInsuranceCompany || 0,
        emp.taxes || 0,
        emp.medical || 0,
        emp.notes || ""
      ].map(val => `"${val}"`).join(",");
      
      csvRows.push(row);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employees_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.status === "Active").length;
  const resignedCount = employees.filter(e => e.status === "Resigned").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Employees
            <span className="text-sm font-medium bg-accent/10 text-accent px-2.5 py-0.5 rounded-full">
              {filteredEmployees.length} {filteredEmployees.length !== totalCount ? `of ${totalCount}` : ""}
            </span>
          </h2>
          <p className="text-muted-fg">Manage employee records and statuses.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {canImport && (
            <>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </>
          )}
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleNewEmployeeClick}>
              <Plus className="w-4 h-4 mr-2" /> New Employee
            </Button>
          )}
          {canEdit && employees.length > 0 && (
            <Button variant="destructive" onClick={() => setIsDeleteAllModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-fg uppercase">
              Total Employees / إجمالي الموظفين
            </CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">{totalCount}</div>
            <p className="text-xs text-muted-fg mt-1">Total registered in system</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-fg uppercase">
              Active Employees / الموظفين النشطين
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <p className="text-xs text-muted-fg mt-1">Currently active members</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-fg uppercase">
              Resigned Employees / الموظفين المستقيلين
            </CardTitle>
            <UserX className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{resignedCount}</div>
            <p className="text-xs text-muted-fg mt-1">Formerly employed members</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg/80" />
            <Input
              placeholder="Search across all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>National ID</th>
                <th>HR Code</th>
                <th>Name</th>
                <th>Position</th>
                <th>Account</th>
                <th>Project</th>
                <th>Date Hiring</th>
                <th>Date Resign</th>
                <th>Status</th>
                <th>Bank Account</th>
                <th className="text-right">Net Salary (EGP)</th>
                {canEdit && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, index) => {
                // Find the original index in `employees` since we are iterating over filtered list
                const originalIndex = employees.findIndex(
                  (e) => e.id === emp.id,
                );
                const isExpanded = expandedEmpId === emp.id;

                return (
                  <React.Fragment key={emp.id}>
                    <tr
                      className={`hover:bg-muted transition-colors cursor-pointer ${isExpanded ? "bg-muted border-b-0" : ""}`}
                      onClick={(e) => toggleExpand(emp.id, e)}
                    >
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-fg/80" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-fg/80" />
                          )}
                          {emp.id}
                        </div>
                      </td>
                      <td className="font-medium text-muted-fg">
                        {emp.hrCode}
                      </td>
                      <td>{emp.name}</td>
                      <td className="text-muted-fg">{emp.position}</td>
                      <td className="text-muted-fg">{emp.account || "-"}</td>
                      <td className="text-muted-fg">{emp.project || "-"}</td>
                      <td>{emp.dateHiring}</td>
                      <td className="text-muted-fg">
                        {emp.dateResign || "-"}
                      </td>
                      <td>
                        <Badge
                          variant={
                            emp.status === "Active" ? "success" : "destructive"
                          }
                        >
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="text-muted-fg font-mono text-xs">
                        {emp.bankAccount || "-"}
                      </td>
                      <td className="text-right font-medium text-ink">
                        {emp.netSalary.toLocaleString()}
                      </td>
                      {canEdit && (
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(emp, originalIndex);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-fg/80 hover:text-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(emp);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/50 border-b border-border">
                        <td colSpan={canEdit ? 12 : 11} className="py-4 px-6">
                          <div className="flex flex-wrap sm:flex-nowrap gap-6 text-sm text-ink">
                            {emp.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-fg/80" />
                                <span>{emp.email}</span>
                              </div>
                            )}
                            {emp.phone1 && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-fg/80" />
                                <span>{emp.phone1}</span>
                              </div>
                            )}
                            {emp.phone2 && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-fg/80" />
                                <span>{emp.phone2}</span>
                              </div>
                            )}
                            {!emp.email && !emp.phone1 && !emp.phone2 && (
                              <span className="text-muted-fg/80 italic">
                                No contact information available.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-muted-fg">
                    No employees found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Employee Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted">
              <h3 className="font-bold text-lg text-ink">Add New Employee</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    National ID
                  </label>
                  <Input
                    required
                    placeholder="e.g. 2900101..."
                    value={newEmp.id}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, id: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    HR Code
                  </label>
                  <Input
                    required
                    placeholder="e.g. HR-1001"
                    value={newEmp.hrCode}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, hrCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="e.g. John Doe"
                  value={newEmp.name}
                  onChange={(e) =>
                    setNewEmp({ ...newEmp, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={newEmp.email}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Phone 1
                  </label>
                  <Input
                    placeholder="e.g. 01001234567"
                    value={newEmp.phone1}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, phone1: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink whitespace-nowrap">
                    Phone 2 (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 01112345678"
                    value={newEmp.phone2}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, phone2: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Position
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-border bg-card-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newEmp.position}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, position: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select a position...
                    </option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Account
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newEmp.account}
                    onChange={(e) =>
                      setNewEmp({
                        ...newEmp,
                        account: e.target.value,
                        project: "",
                      })
                    }
                  >
                    <option value="">Select an account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Project
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newEmp.project}
                    onChange={(e) =>
                      setNewEmp({ ...newEmp, project: e.target.value })
                    }
                  >
                    <option value="">Select a project...</option>
                    {(
                      accounts.find((a) => a.name === newEmp.account)
                        ?.projects || []
                    ).map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Hiring Date
                  </label>
                  <Input type="date" value={newEmp.dateHiring || ""} onChange={(e) => setNewEmp({ ...newEmp, dateHiring: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Net Salary (EGP)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    required
                    min="0"
                    placeholder="e.g. 15000"
                    value={newEmp.netSalary || ""}
                    onChange={(e) =>
                      setNewEmp({
                        ...newEmp,
                        netSalary: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink">
                  Bank Account Number (Optional)
                </label>
                <Input
                  placeholder="e.g. 123456789012"
                  value={newEmp.bankAccount || ""}
                  onChange={(e) =>
                    setNewEmp({ ...newEmp, bankAccount: e.target.value })
                  }
                />
              </div>
              <div className="pt-4 flex gap-3 justify-end border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Employee</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Employee Modal Overlay */}
      {isEditModalOpen && editingEmp && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted">
              <h3 className="font-bold text-lg text-ink">Edit Employee</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-fg/80 hover:text-danger transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    National ID
                  </label>
                  <Input
                    required
                    value={editingEmp.id}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, id: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    HR Code
                  </label>
                  <Input
                    required
                    value={editingEmp.hrCode}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, hrCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink">
                  Full Name
                </label>
                <Input
                  required
                  value={editingEmp.name}
                  onChange={(e) =>
                    setEditingEmp({ ...editingEmp, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editingEmp.email || ""}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Phone 1
                  </label>
                  <Input
                    value={editingEmp.phone1 || ""}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, phone1: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink whitespace-nowrap">
                    Phone 2 (Optional)
                  </label>
                  <Input
                    value={editingEmp.phone2 || ""}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, phone2: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Position
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingEmp.position}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, position: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select a position...
                    </option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                    {/* Add current pos if it was removed from lookups */}
                    {!positions.includes(editingEmp.position) &&
                      editingEmp.position && (
                        <option value={editingEmp.position}>
                          {editingEmp.position}
                        </option>
                      )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Account
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingEmp.account || ""}
                    onChange={(e) =>
                      setEditingEmp({
                        ...editingEmp,
                        account: e.target.value,
                        project: "",
                      })
                    }
                  >
                    <option value="">Select an account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                    {editingEmp.account &&
                      !accounts.find((a) => a.name === editingEmp.account) && (
                        <option value={editingEmp.account}>
                          {editingEmp.account}
                        </option>
                      )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Project
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingEmp.project || ""}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, project: e.target.value })
                    }
                  >
                    <option value="">Select a project...</option>
                    {(
                      accounts.find((a) => a.name === editingEmp.account)
                        ?.projects || []
                    ).map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
                    ))}
                    {editingEmp.project &&
                      !(
                        accounts.find((a) => a.name === editingEmp.account)
                          ?.projects || []
                      ).includes(editingEmp.project) && (
                        <option value={editingEmp.project}>
                          {editingEmp.project}
                        </option>
                      )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Hiring Date
                  </label>
                  <Input type="date" value={editingEmp.dateHiring || ""} onChange={(e) => setEditingEmp({ ...editingEmp, dateHiring: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">
                    Net Salary (EGP)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={editingEmp.netSalary || ""}
                    onChange={(e) =>
                      setEditingEmp({
                        ...editingEmp,
                        netSalary: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink">
                  Bank Account Number (Optional)
                </label>
                <Input
                  placeholder="e.g. 123456789012"
                  value={editingEmp.bankAccount || ""}
                  onChange={(e) =>
                    setEditingEmp({
                      ...editingEmp,
                      bankAccount: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-semibold text-ink">
                    Status
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingEmp.status}
                    onChange={(e) =>
                      setEditingEmp({
                        ...editingEmp,
                        status: e.target.value as "Active" | "Resigned",
                      })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
                {editingEmp.status === "Resigned" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink">
                      Resignation Date
                    </label>
                    <Input type="date" value={editingEmp.dateResign || ""} onChange={(e) => setEditingEmp({ ...editingEmp, dateResign: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="pt-4 flex gap-3 justify-end border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Employee Modal Overlay */}
      {isDeleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-danger" />
              </div>
              <h3 className="font-bold text-lg text-ink">Delete Employee</h3>
              <p className="text-sm text-muted-fg">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-ink">
                  {employeeToDelete.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="pt-4 flex gap-3 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDelete}
                >
                  Delete Employee
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete All Employees Modal Overlay */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-danger" />
              </div>
              <h3 className="font-bold text-lg text-ink">Delete All Employees</h3>
              <p className="text-sm text-muted-fg">
                Are you sure you want to delete all employees? This action cannot be undone.
              </p>
              <div className="pt-4 flex gap-3 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                >
                  إلغاء (Cancel)
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeleteAll}
                >
                  تأكيد الحذف (Delete All)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
