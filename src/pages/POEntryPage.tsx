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
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Trash2,
  Pencil,
  X,
  Info,
  BadgeDollarSign,
  FileText,
} from "lucide-react";
import { cn } from "../lib/utils";

export function POEntryPage() {
  const {
    visiblePoBudgets: poBudgets,
    setPoBudgets,
    projects,
    setProjects,
    visibleAccounts: accounts,
    setAccounts,
    finConfig,
    user,
    permissions,
  } = useAppContext();

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canManage = hasPermission("PO Entry", "Edit PO Entry") || user?.role === "Admin" || user?.role === "HR" || user?.role === "Manager";
  const navigate = useNavigate();
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false);
  const [isAddingNewProject, setIsAddingNewProject] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<POBudget, "id">>({
    account: "",
    project: "",
    month: "Jan",
    year: new Date().getFullYear(),
    poAmount: 0,
    noOfStaff: 0,
    poSalaries: 0,
    poOT: 0,
    poRetro: 0,
    poGifts: 0,
    poTopHero: 0,
    poBreakfast: 0,
    poAnnual: 0,
    poMobile: 0,
    poMedical: 0,
    poLaptop: 0,
    customAllocations: {},
    actualBreakfast: 0,
    actualAnnual: 0,
    actualMedical: 0,
    actualLaptop: 0,
    actualTopHero: 0,
  });

  const totalPOCost =
    formData.poSalaries +
    formData.poOT +
    formData.poRetro +
    formData.poGifts +
    formData.poTopHero +
    formData.poBreakfast +
    formData.poAnnual +
    formData.poMobile +
    formData.poMedical +
    formData.poLaptop;

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

  const activeConfig = (formData.project
    ? finConfig[formData.project]
    : null) ||
    finConfig["default"] || {
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
      customCategories: [],
      disabledCores: [],
    };

  const handleProjectChange = (projectName: string) => {
    setFormData((prev) => ({ ...prev, project: projectName }));

    if (!projectName || editingId) return;

    // Find the latest budget entry for this project
    const lastEntry = [...poBudgets]
      .reverse()
      .find((b) => b.account === formData.account && b.project === projectName);

    if (lastEntry) {
      setFormData({
        account: lastEntry.account,
        project: projectName,
        month: lastEntry.month,
        year: lastEntry.year,
        poAmount: lastEntry.poAmount,
        noOfStaff: lastEntry.noOfStaff,
        poSalaries: lastEntry.poSalaries,
        poOT: lastEntry.poOT,
        poRetro: lastEntry.poRetro,
        poGifts: lastEntry.poGifts,
        poTopHero: lastEntry.poTopHero,
        poBreakfast: lastEntry.poBreakfast,
        poAnnual: lastEntry.poAnnual,
        poMobile: lastEntry.poMobile,
        poMedical: lastEntry.poMedical,
        poLaptop: lastEntry.poLaptop,
        customAllocations: lastEntry.customAllocations || {},
        actualBreakfast: lastEntry.actualBreakfast,
        actualAnnual: lastEntry.actualAnnual,
        actualMedical: lastEntry.actualMedical,
        actualLaptop: lastEntry.actualLaptop,
        actualTopHero: lastEntry.actualTopHero,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const accountToSave = isAddingNewAccount
      ? newAccountName
      : formData.account;
    const projectToSave = isAddingNewProject
      ? newProjectName
      : formData.project;

    if (!accountToSave || !projectToSave) {
      alert("Please select or enter an account and project name.");
      return;
    }

    if (isAddingNewAccount && !accounts.find((a) => a.name === accountToSave)) {
      setAccounts((prev) => [
        ...prev,
        {
          id: `acc-${Date.now()}`,
          name: accountToSave,
          projects: [projectToSave],
        },
      ]);
    } else if (isAddingNewProject) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.name === accountToSave && !a.projects.includes(projectToSave)
            ? { ...a, projects: [...a.projects, projectToSave] }
            : a,
        ),
      );
    }

    if (editingId) {
      setPoBudgets((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
                ...formData,
                account: accountToSave,
                project: projectToSave,
                id: editingId,
              }
            : b,
        ),
      );
      setEditingId(null);
    } else {
      const newEntry: POBudget = {
        ...formData,
        account: accountToSave,
        project: projectToSave,
        id: `PO-${Date.now()}`,
      };
      setPoBudgets([...poBudgets, newEntry]);
    }

    setFormData({
      account: "",
      project: "",
      month: "Jan",
      year: new Date().getFullYear(),
      poAmount: 0,
      noOfStaff: 0,
      poSalaries: 0,
      poOT: 0,
      poRetro: 0,
      poGifts: 0,
      poTopHero: 0,
      poBreakfast: 0,
      poAnnual: 0,
      poMobile: 0,
      poMedical: 0,
      poLaptop: 0,
      customAllocations: {},
      actualBreakfast: 0,
      actualAnnual: 0,
      actualMedical: 0,
      actualLaptop: 0,
      actualTopHero: 0,
    });
    setIsAddingNewAccount(false);
    setIsAddingNewProject(false);
    setNewAccountName("");
    setNewProjectName("");
  };

  const handleEdit = (budget: POBudget) => {
    setEditingId(budget.id);
    setFormData({
      account: budget.account,
      project: budget.project,
      month: budget.month,
      year: budget.year,
      poAmount: budget.poAmount,
      noOfStaff: budget.noOfStaff,
      poSalaries: budget.poSalaries,
      poOT: budget.poOT,
      poRetro: budget.poRetro,
      poGifts: budget.poGifts,
      poTopHero: budget.poTopHero,
      poBreakfast: budget.poBreakfast,
      poAnnual: budget.poAnnual,
      poMobile: budget.poMobile,
      poMedical: budget.poMedical,
      poLaptop: budget.poLaptop,
      customAllocations: budget.customAllocations || {},
      actualBreakfast: budget.actualBreakfast,
      actualAnnual: budget.actualAnnual,
      actualMedical: budget.actualMedical,
      actualLaptop: budget.actualLaptop,
      actualTopHero: budget.actualTopHero,
    });

    const acc = accounts.find((a) => a.name === budget.account);
    if (!acc) {
      setIsAddingNewAccount(true);
      setNewAccountName(budget.account);
      setIsAddingNewProject(true);
      setNewProjectName(budget.project);
    } else {
      setIsAddingNewAccount(false);
      if (!acc.projects.includes(budget.project)) {
        setIsAddingNewProject(true);
        setNewProjectName(budget.project);
      } else {
        setIsAddingNewProject(false);
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      account: "",
      project: "",
      month: "Jan",
      year: new Date().getFullYear(),
      poAmount: 0,
      noOfStaff: 0,
      poSalaries: 0,
      poOT: 0,
      poRetro: 0,
      poGifts: 0,
      poTopHero: 0,
      poBreakfast: 0,
      poAnnual: 0,
      poMobile: 0,
      poMedical: 0,
      poLaptop: 0,
      customAllocations: {},
      actualBreakfast: 0,
      actualAnnual: 0,
      actualMedical: 0,
      actualLaptop: 0,
      actualTopHero: 0,
    });
    setIsAddingNewAccount(false);
    setIsAddingNewProject(false);
    setNewAccountName("");
    setNewProjectName("");
  };

  const handleDelete = (id: string) => {
    setPoBudgets(poBudgets.filter((b) => b.id !== id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/po-budget")}
            className="p-2 h-[42px] w-[42px] rounded-full text-muted-fg hover:text-ink hover:bg-card-bg shadow-sm border border-border bg-input-bg"
          >
            <ArrowLeft className="w-5 h-5 mx-auto" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ink">PO Budget Entry</h1>
            <p className="text-muted-fg text-sm">
              Create and manage project budget allocations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Entry Form */}
        {canManage && (
          <Card className="lg:col-span-1 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="border-b bg-muted/50 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                {editingId ? "Edit Entry" : "New Entry"}
              </CardTitle>
              {editingId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-7 text-muted-fg/80 hover:text-danger px-2"
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <Info className="w-4 h-4 text-muted-fg/80" />
                  <h3 className="text-sm font-semibold text-ink">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted-fg uppercase">
                        Account
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setIsAddingNewAccount(!isAddingNewAccount)
                        }
                        className="text-xs text-accent font-medium hover:underline"
                      >
                        {isAddingNewAccount
                          ? "Select existing"
                          : "New account?"}
                      </button>
                    </div>
                    {isAddingNewAccount ? (
                      <Input
                        required
                        placeholder="Enter new account name..."
                        value={newAccountName}
                        onChange={(e) => {
                          setNewAccountName(e.target.value);
                          setFormData({ ...formData, account: e.target.value });
                        }}
                      />
                    ) : (
                      <select
                        required
                        className="flex h-10 w-full rounded-xl border border-border bg-input-bg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent"
                        value={formData.account}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            account: e.target.value,
                            project: "",
                          })
                        }
                      >
                        <option value="" disabled>
                          Select Account...
                        </option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted-fg uppercase">
                        Project Name
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setIsAddingNewProject(!isAddingNewProject)
                        }
                        className="text-xs text-accent font-medium hover:underline"
                      >
                        {isAddingNewProject
                          ? "Select existing"
                          : "New project?"}
                      </button>
                    </div>
                    {isAddingNewProject ? (
                      <Input
                        required
                        placeholder="Enter new project name..."
                        value={newProjectName}
                        onChange={(e) => {
                          setNewProjectName(e.target.value);
                          handleProjectChange(e.target.value);
                        }}
                      />
                    ) : (
                      <select
                        required
                        className="flex h-10 w-full rounded-xl border border-border bg-input-bg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent"
                        value={formData.project}
                        onChange={(e) => handleProjectChange(e.target.value)}
                        disabled={!isAddingNewAccount && !formData.account}
                      >
                        <option value="" disabled>
                          Select Project...
                        </option>
                        {(
                          accounts.find((a) => a.name === formData.account)
                            ?.projects || []
                        ).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ink/80 uppercase">
                      Month
                    </label>
                    <select
                      className="flex h-10 w-full rounded-xl border border-border bg-input-bg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent"
                      value={formData.month}
                      onChange={(e) =>
                        setFormData({ ...formData, month: e.target.value })
                      }
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ink/80 uppercase">
                      Year
                    </label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          year: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ink/80 uppercase">
                      PO amount
                    </label>
                    <Input
                      type="number"
                      step="any"
                      required
                      value={formData.poAmount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          poAmount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ink/80 uppercase">
                      PO of Staff
                    </label>
                    <Input
                      type="number"
                      required
                      value={formData.noOfStaff || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          noOfStaff: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <BadgeDollarSign className="w-4 h-4 text-muted-fg/80" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Financial Allocation
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
                  {!activeConfig.disabledCores.includes("poSalaries") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poSalaries}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poSalaries || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poSalaries: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poOT") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poOT}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poOT || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poOT: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poRetro") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poRetro}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poRetro || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poRetro: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poGifts") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poGifts}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poGifts || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poGifts: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poTopHero") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poTopHero}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poTopHero || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poTopHero: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poBreakfast") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poBreakfast}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poBreakfast || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poBreakfast: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poAnnual") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poAnnual}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poAnnual || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poAnnual: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poMobile") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider whitespace-nowrap">
                        {activeConfig.labels.poMobile}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poMobile || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poMobile: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poMedical") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poMedical}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poMedical || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poMedical: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {!activeConfig.disabledCores.includes("poLaptop") && (
                    <div className="space-y-1.5 focus-within:text-accent transition-colors">
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {activeConfig.labels.poLaptop}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.poLaptop || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            poLaptop: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {activeConfig.customCategories.map((c) => (
                    <div
                      key={c.id}
                      className="space-y-1.5 focus-within:text-accent transition-colors"
                    >
                      <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">
                        {c.name}
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.customAllocations?.[c.id] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customAllocations: {
                              ...(formData.customAllocations || {}),
                              [c.id]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" />{" "}
                  {editingId ? "Update Entry" : "Save Entry"}
                </Button>
                {formData.poAmount > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg border border-border flex justify-between items-center text-sm">
                    <span className="text-muted-fg font-medium tracking-tight">
                      Allocated Cost
                    </span>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        totalPOCost > formData.poAmount
                          ? "text-danger"
                          : "text-success",
                      )}
                    >
                      {totalPOCost.toLocaleString()}{" "}
                      <span className="text-muted-fg/80 font-sans font-normal text-xs">
                        / {formData.poAmount.toLocaleString()}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        )}

        {/* Existing Entries List */}
        <Card className={cn(canManage ? "lg:col-span-3" : "lg:col-span-4", "shadow-sm hover:shadow-md transition-shadow")}>
          <CardHeader className="border-b bg-muted/50 py-4">
            <CardTitle className="text-base">Recent Entries</CardTitle>
          </CardHeader>
          <div className="table-container border-0 rounded-none h-[calc(100vh-140px)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Project</th>
                  <th>Period</th>
                  <th className="text-right">PO Amount (Manual)</th>
                  <th className="text-right">Total PO (Calculated)</th>
                  {canManage && <th className="text-center w-24">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {poBudgets.length > 0 ? (
                  [...poBudgets].reverse().map((budget) => {
                    const totalCost =
                      (budget.poSalaries || 0) +
                      (budget.poOT || 0) +
                      (budget.poRetro || 0) +
                      (budget.poGifts || 0) +
                      (budget.poTopHero || 0) +
                      (budget.poBreakfast || 0) +
                      (budget.poAnnual || 0) +
                      (budget.poMobile || 0) +
                      (budget.poMedical || 0) +
                      (budget.poLaptop || 0);
                    const isOverBudget = totalCost > budget.poAmount;

                    return (
                      <tr
                        key={budget.id}
                        className={cn(
                          "hover:bg-muted transition-colors",
                          editingId === budget.id &&
                            "bg-blue-50/50 border-l-2 border-l-accent",
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {budget.account || "-"}
                        </td>
                        <td className="px-4 py-3 text-ink/80">
                          {budget.project}
                        </td>
                        <td className="px-4 py-3 text-muted-fg font-medium">
                          <Badge
                            variant="default"
                            className="font-mono px-2 py-0.5"
                          >
                            {budget.month} {budget.year}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-ink">
                          {budget.poAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-bold",
                              isOverBudget ? "text-danger" : "text-success",
                            )}
                          >
                            {totalCost.toLocaleString()}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-fg/80 hover:text-accent hover:bg-blue-50"
                                onClick={() => handleEdit(budget)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-fg/80 hover:text-danger hover:bg-red-50"
                                onClick={() => handleDelete(budget.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="px-4 py-16 text-center text-muted-fg/80"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FileText className="w-10 h-10 text-slate-200" />
                        <span className="font-medium text-muted-fg">
                          No budget entries yet
                        </span>
                        <p className="text-xs text-muted-fg/80 max-w-[250px]">
                          Select an account and project on the left to add a new
                          budget entry.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
