import React, { useState } from "react";
import { cn } from "../lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
} from "../components/ui";
import {
  useAppContext,
  AccountItem,
  DEFAULT_ALLOCATION_LABELS,
} from "../store/AppContext";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Folder,
  Save,
  Check,
} from "lucide-react";
import { getEmailServerUrl, setEmailServerUrl, checkEmailServerHealth } from "../lib/emailServer";

export function SettingsPage() {
  const {
    positions,
    setPositions,
    accounts,
    setAccounts,
    projectManagers,
    setProjectManagers,
    finConfig,
    setFinConfig,
    user,
    permissions,
    employees,
    poBudgets,
    poAcceptances,
    salaryOverrides,
    safetyRecords,
    systemUsers,
    escalations,
    syncState,
    syncError,
    triggerManualSync,
    supabaseEnabled,
    setSupabaseEnabled,
  } = useAppContext();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  
  // Local states for custom Supabase connection settings
  const [localUrl, setLocalUrl] = useState(() => localStorage.getItem("custom_supabase_url") || "");
  const [localKey, setLocalKey] = useState(() => localStorage.getItem("custom_supabase_anon_key") || "");
  const [isSavedCreds, setIsSavedCreds] = useState(false);

  // Local states for the payslip email server settings
  const [emailServerInput, setEmailServerInput] = useState(() => getEmailServerUrl());
  const [emailServerSaved, setEmailServerSaved] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const allProjects = Array.from(new Set(accounts.flatMap(acc => acc.projects)));
  const [newPosition, setNewPosition] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [newProjectNames, setNewProjectNames] = useState<
    Record<string, string>
  >({});
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [selectedFinProject, setSelectedFinProject] = useState("default");

  React.useEffect(() => {
    if (!selectedFinProject && allProjects.length > 0) {
      setSelectedFinProject("default");
    }
  }, [allProjects, selectedFinProject]);

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = permissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("System", "Manage Settings") || user?.role === "Admin";

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPosition.trim() && !positions.includes(newPosition.trim())) {
      setPositions([...positions, newPosition.trim()]);
      setNewPosition("");
    }
  };

  const handleRemovePosition = (pos: string) => {
    setPositions(positions.filter((p) => p !== pos));
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newAccount.trim() &&
      !accounts.find(
        (a) => a.name.toLowerCase() === newAccount.trim().toLowerCase(),
      )
    ) {
      setAccounts([
        ...accounts,
        { id: `acc-${Date.now()}`, name: newAccount.trim(), projects: [] },
      ]);
      setNewAccount("");
    }
  };

  const handleRemoveAccount = (accountId: string) => {
    setAccounts(accounts.filter((a) => a.id !== accountId));
  };

  const handleAddProject = (accountId: string, e: React.FormEvent) => {
    e.preventDefault();
    const projectName = newProjectNames[accountId];
    if (projectName && projectName.trim()) {
      setAccounts(
        accounts.map((acc) => {
          if (
            acc.id === accountId &&
            !acc.projects.includes(projectName.trim())
          ) {
            return { ...acc, projects: [...acc.projects, projectName.trim()] };
          }
          return acc;
        }),
      );
      setNewProjectNames({ ...newProjectNames, [accountId]: "" });
    }
  };

  const handleRemoveProject = (accountId: string, projectName: string) => {
    setAccounts(
      accounts.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            projects: acc.projects.filter((p) => p !== projectName),
          };
        }
        return acc;
      }),
    );
  };

  const defaultConfTemplate = {
    labels: DEFAULT_ALLOCATION_LABELS,
    customCategories: [],
    disabledCores: [],
    grossPercentage: 22,
    grossPercentages: {
      poSalaries: 22,
      poOT: 22,
      poRetro: 22,
      poGifts: 0,
      poTopHero: 22,
      poBreakfast: 0,
      poAnnual: 0,
      poMobile: 0,
      poMedical: 0,
      poLaptop: 0,
    },
  };

  const [localConf, setLocalConf] = useState(defaultConfTemplate);
  const [isFinSaved, setIsFinSaved] = useState(false);

  React.useEffect(() => {
    const baseConf = selectedFinProject === "default" 
      ? defaultConfTemplate 
      : { ...defaultConfTemplate, ...finConfig["default"] };
    
    setLocalConf({ ...baseConf, ...finConfig[selectedFinProject] });
    setIsFinSaved(false);
  }, [selectedFinProject, finConfig]);

  const updateActiveConf = (updates: Partial<typeof localConf>) => {
    setLocalConf((prev) => ({
      ...prev,
      ...updates,
    }));
    setIsFinSaved(false);
  };

  const handleSaveConfig = () => {
    setFinConfig((prev) => ({
      ...prev,
      [selectedFinProject]: localConf,
    }));
    setIsFinSaved(true);
    setTimeout(() => setIsFinSaved(false), 2000);
  };

  const handleLabelChange = (
    id: keyof typeof localConf.labels,
    value: string,
  ) => {
    updateActiveConf({
      labels: {
        ...localConf.labels,
        [id]: value,
      },
    });
  };

  const handleActualLabelChange = (
    id: keyof typeof localConf.labels,
    value: string,
  ) => {
    const defaultActuals = {
      poSalaries: "Actual Salaries",
      poOT: "Actual OT",
      poRetro: "Actual Retro",
      poGifts: "Actual Gifts",
      poTopHero: "Actual Top Hero Bonus",
      poBreakfast: "Actual Breakfast",
      poAnnual: "Actual Annual",
      poMobile: "Actual Mobile Allowance",
      poMedical: "Actual Medical",
      poLaptop: "Actual Laptop",
    };
    const currentActuals = localConf.actualLabels || defaultActuals;
    updateActiveConf({
      actualLabels: {
        ...currentActuals,
        [id]: value,
      },
    });
  };

  const handleGrossPercentageChange = (id: string, value: number) => {
    const currentGrossPercentages = localConf.grossPercentages || defaultConfTemplate.grossPercentages;
    updateActiveConf({
      grossPercentages: {
        ...currentGrossPercentages,
        [id]: value,
      },
    });
  };

  const toggleCoreVisibility = (id: string) => {
    const isHidden = localConf.disabledCores?.includes(id);
    updateActiveConf({
      disabledCores: isHidden
        ? (localConf.disabledCores || []).filter((c) => c !== id)
        : [...(localConf.disabledCores || []), id],
    });
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomCategory.trim()) {
      updateActiveConf({
        customCategories: [
          ...(localConf.customCategories || []),
          { id: `custom_${Date.now()}`, name: newCustomCategory.trim() },
        ],
      });
      setNewCustomCategory("");
    }
  };

  const handleRemoveCustomCategory = (id: string) => {
    updateActiveConf({
      customCategories: (localConf.customCategories || []).filter(
        (c) => c.id !== id,
      ),
    });
  };

  if (!canEdit) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">System Settings</h1>
        <p className="text-muted-fg">
          You do not have permission to view or edit this page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">System Settings</h1>
        <p className="text-muted-fg text-sm mt-1">
          Manage system-wide lookups and configurations.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-border bg-muted/50">
          <CardTitle>Database Connection & Synchronization (Supabase)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-fg mb-6">
            Configure, toggle, or test your connection to the Supabase database. Synchronization allows you to back up all your current local state (employees, financial configurations, safety records, and more) into the Supabase database.
          </p>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 mb-6 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
            <div className="mr-4">
              <h3 className="font-semibold text-sm text-ink">Supabase Synchronization</h3>
              <p className="text-xs text-muted-fg mt-0.5">When disabled, the application runs entirely in offline-first Local Storage mode without any external database calls.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded", supabaseEnabled ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-slate-500/10 text-slate-500")}>
                {supabaseEnabled ? "ENABLED" : "LOCAL MODE"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSupabaseEnabled(!supabaseEnabled);
                  setSyncStatus("");
                  setTestResult(null);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  supabaseEnabled ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    supabaseEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Connection Settings */}
          {supabaseEnabled && (
            <div className="space-y-4 mb-6 p-4 rounded-lg border border-border bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Supabase Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Supabase Project URL</label>
                  <Input
                    placeholder="https://your-project-id.supabase.co"
                    value={localUrl}
                    onChange={(e) => {
                      setLocalUrl(e.target.value);
                      setIsSavedCreds(false);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Supabase Anon Key</label>
                  <Input
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={localKey}
                    onChange={(e) => {
                      setLocalKey(e.target.value);
                      setIsSavedCreds(false);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                {(localStorage.getItem("custom_supabase_url") || localStorage.getItem("custom_supabase_anon_key")) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocalUrl("");
                      setLocalKey("");
                      localStorage.removeItem("custom_supabase_url");
                      localStorage.removeItem("custom_supabase_anon_key");
                      setIsSavedCreds(true);
                      setTimeout(() => {
                        window.location.reload();
                      }, 800);
                    }}
                  >
                    Reset to Default
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    if (localUrl) {
                      localStorage.setItem("custom_supabase_url", localUrl.trim());
                    } else {
                      localStorage.removeItem("custom_supabase_url");
                    }
                    if (localKey) {
                      localStorage.setItem("custom_supabase_anon_key", localKey.trim());
                    } else {
                      localStorage.removeItem("custom_supabase_anon_key");
                    }
                    setIsSavedCreds(true);
                    setTimeout(() => {
                      window.location.reload();
                    }, 800);
                  }}
                  disabled={isSavedCreds}
                >
                  {isSavedCreds ? "Credentials Saved! Reloading..." : "Save Credentials & Reload"}
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <Button 
              disabled={!supabaseEnabled}
              onClick={async () => {
                setTestResult(null);
                try {
                  const { supabase } = await import('../lib/supabase');
                  const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
                  if (error) throw error;
                  setTestResult({
                    success: true,
                    msg: "Successfully connected to Supabase! SELECT query verified successfully."
                  });
                } catch (err: any) {
                  setTestResult({
                    success: false,
                    msg: `Connection failed: ${err.message || err}. Please ensure Supabase credentials are valid and Row-Level Security (RLS) is disabled or properly configured.`
                  });
                }
              }}
              variant="outline"
            >
              Test Connection
            </Button>

            <Button 
              disabled={!supabaseEnabled || isSyncing || syncState === 'syncing'}
              onClick={async () => {
                setIsSyncing(true);
                setSyncStatus("Initiating full synchronization...");
                setTestResult(null);
                try {
                  await triggerManualSync();
                  setSyncStatus("All tables successfully synchronized with Supabase!");
                } catch (err: any) {
                  setSyncStatus(`Sync failed: ${err.message || err}`);
                } finally {
                  setIsSyncing(false);
                }
              }}
            >
              {isSyncing || syncState === 'syncing' ? "Syncing..." : "Sync All Local Data to Supabase"}
            </Button>
          </div>

          {testResult && (
            <div className={cn(
              "mt-4 p-3.5 rounded-lg text-xs font-mono border",
              testResult.success 
                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              <span className="font-bold uppercase tracking-wider">{testResult.success ? "Success:" : "Error:"}</span> {testResult.msg}
            </div>
          )}

          {(syncStatus || syncError) && (
            <div className={cn(
              "mt-4 p-3.5 border rounded-lg text-xs font-mono",
              syncError 
                ? "bg-red-500/10 text-red-500 border-red-500/20" 
                : "bg-slate-100 dark:bg-slate-800 border-border text-ink"
            )}>
              <strong>Sync Status:</strong> {syncError || syncStatus}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Server (Payslips) Settings */}
      <Card>
        <CardHeader className="border-b border-border bg-muted/50">
          <CardTitle>Email Server (Payslips)</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-muted-fg">
            Payslip emails are sent through the app's email server (server.ts with SMTP credentials).
            The hosted site has no backend, so enter the public URL where the email server is running
            (e.g. an ngrok tunnel to the machine running <code className="font-mono">npm run dev</code>).
            Leave empty to use the same origin (local development).
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink">Email Server URL</label>
            <Input
              placeholder="https://your-tunnel-url.ngrok-free.dev"
              value={emailServerInput}
              onChange={(e) => {
                setEmailServerInput(e.target.value);
                setEmailServerSaved(false);
              }}
              className="font-mono text-xs"
              disabled={!canEdit}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              disabled={isTestingEmail}
              onClick={async () => {
                setIsTestingEmail(true);
                setEmailTestResult(null);
                const previous = getEmailServerUrl();
                try {
                  // Test the URL currently in the input (without persisting yet)
                  setEmailServerUrl(emailServerInput);
                  const health = await checkEmailServerHealth();
                  setEmailTestResult({
                    success: true,
                    msg: health.smtpConfigured
                      ? "Email server reachable and SMTP is configured — real emails will be sent."
                      : "Email server reachable, but SMTP credentials are NOT configured on it (emails will be simulated). Set SMTP_* variables in its .env file.",
                  });
                } catch (err: any) {
                  setEmailTestResult({
                    success: false,
                    msg: `Could not reach the email server: ${err.message || err}`,
                  });
                } finally {
                  setEmailServerUrl(previous);
                  setIsTestingEmail(false);
                }
              }}
            >
              {isTestingEmail ? "Testing..." : "Test Email Server"}
            </Button>
            <Button
              size="sm"
              disabled={!canEdit || emailServerSaved}
              onClick={() => {
                setEmailServerUrl(emailServerInput);
                setEmailServerInput(getEmailServerUrl());
                setEmailServerSaved(true);
              }}
            >
              {emailServerSaved ? "Saved!" : "Save Email Server URL"}
            </Button>
          </div>
          {emailTestResult && (
            <div className={cn(
              "p-3.5 rounded-lg text-xs font-mono border",
              emailTestResult.success
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              <span className="font-bold uppercase tracking-wider">{emailTestResult.success ? "Success:" : "Error:"}</span> {emailTestResult.msg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Managers — CC on Payslips */}
      <Card>
        <CardHeader className="border-b border-border bg-muted/50">
          <CardTitle>Project Managers — CC on Payslips</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-muted-fg">
            إيميل مدير كل مشروع. لما تبعت قسيمة راتب لموظف، إيميل مدير مشروعه بيتحط تلقائياً في CC.
            سيب الخانة فاضية لو مفيش مدير للمشروع ده.
          </p>
          {allProjects.length > 0 ? (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
              {allProjects.map((proj: string) => (
                <div
                  key={proj}
                  className="p-3 bg-card-bg border border-border rounded-md space-y-2"
                >
                  <span className="font-medium text-ink text-sm block truncate" title={proj}>{proj}</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[0, 1, 2].map((idx) => (
                      <Input
                        key={idx}
                        type="email"
                        placeholder={`مدير ${idx + 1} (اختياري)`}
                        value={(projectManagers[proj] || [])[idx] || ""}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setProjectManagers((prev) => {
                            const arr = [...(prev[proj] || [])];
                            arr[idx] = e.target.value;
                            // Trim trailing empty slots so we don't store blanks.
                            while (arr.length && !arr[arr.length - 1]) arr.pop();
                            return { ...prev, [proj]: arr };
                          })
                        }
                        className="font-mono text-xs"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-fg text-center py-4">
              لا توجد مشاريع. أضف الحسابات والمشاريع أولاً من الأسفل.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positions Setttings */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/50">
            <CardTitle>Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleAddPosition} className="flex gap-2">
              <Input
                placeholder="New position name..."
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
              <Button type="submit" disabled={!newPosition.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {positions.length > 0 ? (
                positions.map((pos, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-card-bg border border-border rounded-md shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <span className="font-medium text-ink">{pos}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-fg/80 hover:text-danger hover:bg-danger/10"
                      onClick={() => handleRemovePosition(pos)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-fg text-center py-4">
                  No positions defined.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accounts & Projects Settings */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/50">
            <CardTitle>Accounts & Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleAddAccount} className="flex gap-2">
              <Input
                placeholder="New account name..."
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
              />
              <Button type="submit" disabled={!newAccount.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {accounts.length > 0 ? (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="border border-border rounded-md overflow-hidden shadow-sm bg-input-bg"
                  >
                    <div
                      className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedAccount(
                          expandedAccount === acc.id ? null : acc.id,
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        {expandedAccount === acc.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-fg/80" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-fg/80" />
                        )}
                        <Folder className="w-4 h-4 text-accent" />
                        <span className="font-medium text-ink">
                          {acc.name}
                        </span>
                        <span className="text-xs bg-muted text-ink/80 px-2 py-0.5 rounded-full">
                          {acc.projects.length}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-fg/80 hover:text-danger hover:bg-danger/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAccount(acc.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {expandedAccount === acc.id && (
                      <div className="p-4 bg-input-bg border-t border-border space-y-4">
                        <form
                          onSubmit={(e) => handleAddProject(acc.id, e)}
                          className="flex gap-2"
                        >
                          <Input
                            placeholder="New project name..."
                            value={newProjectNames[acc.id] || ""}
                            className="h-8 text-sm"
                            onChange={(e) =>
                              setNewProjectNames({
                                ...newProjectNames,
                                [acc.id]: e.target.value,
                              })
                            }
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-8"
                            disabled={!(newProjectNames[acc.id] || "").trim()}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Project
                          </Button>
                        </form>

                        {acc.projects.length > 0 ? (
                          <div className="space-y-1 pl-2 border-l-2 border-border ml-1">
                            {acc.projects.map((proj, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between py-1.5 pl-3 group"
                              >
                                <span className="text-sm text-ink/80 font-medium">
                                  {proj}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-fg/80 hover:text-danger hover:bg-danger/10 transition-all"
                                  onClick={() =>
                                    handleRemoveProject(acc.id, proj)
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-fg/80 italic pl-3">
                            No projects added yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-fg text-center py-4">
                  No accounts defined.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between space-x-4 mb-4 bg-muted p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-ink">
            Configure Finances for Project:
          </label>
          <select
            className="h-10 px-3 py-2 rounded-md border border-input bg-input-bg text-sm"
            value={selectedFinProject}
            onChange={(e) => setSelectedFinProject(e.target.value)}
          >
            <option value="default">Default Template (Base)</option>
            {allProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleSaveConfig}
          className="bg-accent hover:bg-accent/90"
        >
          {isFinSaved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isFinSaved ? "Saved!" : "Save Labels Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Allocation Labels */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/50">
            <CardTitle>Core Finances Labels</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(localConf.labels)
                .filter(([key]) => !localConf.disabledCores?.includes(key))
                .map(([key, value]) => {
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-fg uppercase tracking-widest">
                          {key.replace("po", "")}
                        </label>
                        <button
                          onClick={() => toggleCoreVisibility(key)}
                          className="p-1 rounded-md transition-colors text-muted-fg/80 hover:text-red-500"
                          title="Delete Label"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-[2] space-y-1">
                          <span className="text-[10px] text-muted-fg/80 whitespace-nowrap">PO Label</span>
                          <Input
                            value={value}
                            onChange={(e) =>
                              handleLabelChange(
                                key as keyof typeof localConf.labels,
                                e.target.value,
                              )
                            }
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="flex-[2] space-y-1">
                          {key !== 'poNetProfit' && <span className="text-[10px] text-muted-fg/80 whitespace-nowrap">Actual Cost Label</span>}
                          {key !== 'poNetProfit' && <Input
                            value={localConf.actualLabels?.[key as keyof typeof localConf.labels] || ""}
                            onChange={(e) =>
                              handleActualLabelChange(
                                key as keyof typeof localConf.labels,
                                e.target.value,
                              )
                            }
                            className="h-9 text-sm"
                          />
                          }
                        </div>
                        {key !== 'poNetProfit' && <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-muted-fg/80 whitespace-nowrap">Gross %</span>
                          <div className="relative">
                            <Input
                              type="number"
                              value={localConf.grossPercentages?.[key] ?? 0}
                              onChange={(e) =>
                                handleGrossPercentageChange(
                                  key,
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-sm pr-6"
                            />
                            <span className="absolute right-2 top-2.5 text-xs text-muted-fg/80 focus-within:hidden pointer-events-none">%</span>
                          </div>
                        </div>}
                      </div>
                    </div>
                  );
                })}
            </div>

            {localConf.disabledCores && localConf.disabledCores.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-fg font-medium mb-3 uppercase tracking-widest">
                  Restore Deleted Labels
                </p>
                <div className="flex flex-wrap gap-2">
                  {localConf.disabledCores.map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCoreVisibility(key)}
                    >
                      <Plus className="w-3 h-3 mr-1" />{" "}
                      {localConf.labels[key as keyof typeof localConf.labels] ||
                        key.replace("po", "")}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Allocations */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/50">
            <CardTitle>Custom Allocations</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
            <form onSubmit={handleAddCustomCategory} className="flex gap-2">
              <Input
                placeholder="New custom allocation name..."
                value={newCustomCategory}
                onChange={(e) => setNewCustomCategory(e.target.value)}
              />
              <Button type="submit" disabled={!newCustomCategory.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>

            <div className="space-y-2">
              {localConf.customCategories &&
              localConf.customCategories.length > 0 ? (
                localConf.customCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 bg-card-bg border border-border rounded-md shadow-sm"
                  >
                    <span className="font-medium text-ink">{c.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-fg/80 hover:text-danger hover:bg-danger/10"
                      onClick={() => handleRemoveCustomCategory(c.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-fg text-center py-4">
                  No custom allocations defined for this configuration.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
