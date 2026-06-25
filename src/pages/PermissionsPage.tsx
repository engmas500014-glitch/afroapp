import React, { useState, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
} from "../components/ui";
import {
  Shield,
  Save,
  Key,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Upload,
  Download,
} from "lucide-react";
import { useAppContext, Role } from "../store/AppContext";

export function PermissionsPage() {
  const {
    permissions: globalPermissions,
    setPermissions: setGlobalPermissions,
    systemUsers,
    setSystemUsers,
    user,
    accounts,
  } = useAppContext();

  const allProjects = Array.from(new Set(accounts.flatMap(acc => acc.projects)));

  const [permissions, setPermissions] = useState(globalPermissions);
  const [isSaving, setIsSaving] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    password: "",
    role: "Employee",
    projects: [] as string[],
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserData, setEditingUserData] = useState({
    name: "",
    password: "",
    role: "Employee",
    projects: [] as string[],
  });

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const p = globalPermissions.find((x) => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const canEdit = hasPermission("System", "Manage Roles & Permissions") || user?.role === "Admin";

  const handleToggle = (id: string, role: Role) => {
    // Prevent Admin from losing critical permissions (for demo safety)
    if (role === "Admin") return;

    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, roles: { ...p.roles, [role]: !p.roles[role] } };
        }
        return p;
      }),
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setGlobalPermissions(permissions);
      setIsSaving(false);
      alert("Permissions saved successfully!");
    }, 600);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name.trim() && newUser.password.trim()) {
      if (
        systemUsers.some(
          (u) => u.name.toLowerCase() === newUser.name.trim().toLowerCase(),
        )
      ) {
        alert("User with this name already exists.");
        return;
      }
      setSystemUsers([
        ...systemUsers,
        {
          id: `u${Date.now()}`,
          name: newUser.name.trim(),
          password: newUser.password.trim(),
          role: newUser.role as any,
          projects: newUser.projects,
        },
      ]);
      setNewUser({ name: "", password: "", role: "Employee", projects: [] });
    }
  };

  const handleRemoveUser = (id: string) => {
    setSystemUsers(systemUsers.filter((u) => u.id !== id));
  };

  const handleEditUserClick = (u: any) => {
    setEditingUserId(u.id);
    setEditingUserData({
      name: u.name,
      password: u.password || "",
      role: u.role,
      projects: u.projects || [],
    });
  };

  const handleSaveEditUser = (id: string) => {
    if (editingUserData.name.trim() && editingUserData.password.trim()) {
      if (
        systemUsers.some(
          (u) =>
            u.id !== id &&
            u.name.toLowerCase() === editingUserData.name.trim().toLowerCase(),
        )
      ) {
        alert("User with this name already exists.");
        return;
      }
      setSystemUsers(
        systemUsers.map((u) =>
          u.id === id
            ? {
                ...u,
                name: editingUserData.name.trim(),
                password: editingUserData.password.trim(),
                role: editingUserData.role as any,
                projects: editingUserData.projects,
              }
            : u,
        ),
      );
      setEditingUserId(null);
    }
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
  };

  const fileInputUsersRef = useRef<HTMLInputElement>(null);

  const handleExportUsers = () => {
    const headers = ["Username", "Password", "Role", "Projects"];
    const rows = systemUsers.map(u => [
      u.name, 
      u.password || "", 
      u.role,
      (u.projects || []).join(";")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "system_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUploadUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        if (lines.length < 2) return;
        
        const newUsers = [...systemUsers];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
          if (values.length < 3) continue;
          
          const name = values[0];
          const password = values[1];
          const role = values[2] as Role;
          const projectsStr = values[3] || "";
          const projects = projectsStr ? projectsStr.split(";").map(p => p.trim()).filter(Boolean) : [];
          
          if (!name || !password || !role) continue;

          const uIndex = newUsers.findIndex(u => u.name.toLowerCase() === name.toLowerCase());
          if (uIndex >= 0) {
            newUsers[uIndex] = {
              ...newUsers[uIndex],
              password,
              role,
              projects
            };
          } else {
            newUsers.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name,
              password,
              role,
              projects
            });
          }
        }
        setSystemUsers(newUsers);
        alert("Users imported successfully.");
      } catch (error) {
        console.error("Error parsing CSV", error);
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
    if (fileInputUsersRef.current) fileInputUsersRef.current.value = '';
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const headers = ["Module", "Action", "Admin", "HR", "Manager", "Employee", "Acceptances", "PM", "CM"];
    const rows = permissions.map(p => [
      p.module,
      p.action,
      p.roles.Admin ? "Yes" : "No",
      p.roles.HR ? "Yes" : "No",
      p.roles.Manager ? "Yes" : "No",
      p.roles.Employee ? "Yes" : "No",
      p.roles.Acceptances ? "Yes" : "No",
      p.roles.PM ? "Yes" : "No",
      p.roles.CM ? "Yes" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "permissions_matrix.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        if (lines.length < 2) return;
        
        const newPermissions = [...permissions];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
          if (values.length < 6) continue;
          
          const module = values[0];
          const action = values[1];
          const admin = values[2] === 'Yes';
          const hr = values[3] === 'Yes';
          const manager = values[4] === 'Yes';
          const employee = values[5] === 'Yes';
          const acceptances = values[6] === 'Yes';
          const pm = values[7] === 'Yes';
          const cm = values[8] === 'Yes';
          
          const pIndex = newPermissions.findIndex(p => p.module === module && p.action === action);
          if (pIndex >= 0) {
            newPermissions[pIndex] = {
              ...newPermissions[pIndex],
              roles: {
                Admin: admin,
                HR: hr,
                Manager: manager,
                Employee: employee,
                Acceptances: acceptances,
                PM: pm,
                CM: cm
              }
            };
          }
        }
        setPermissions(newPermissions);
        alert("Permissions imported successfully. Click 'Save Changes' to apply them.");
      } catch (error) {
        console.error("Error parsing CSV", error);
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Roles & Permissions
          </h2>
          <p className="text-muted-fg">
            Manage access control and privileges for Admin, HR, Manager, and
            Employee roles.
          </p>
        </div>
        <div className="flex gap-2 items-center">
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 text-amber-700 p-4 rounded-[8px] flex gap-3 items-start border border-amber-200">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Administrator Role Note</h4>
          <p className="text-[0.8rem] mt-1 opacity-90">
            The Admin role has full system access. Its permissions cannot be
            revoked here to prevent accidental lockouts.
          </p>
        </div>
      </div>

      <div className="table-container">
        <div className="border-b bg-card-bg p-4 flex justify-between items-center">
          <h3 className="text-[0.8rem] font-bold text-ink flex items-center gap-2 uppercase tracking-wide">
            <Key className="w-4 h-4 text-accent" /> Permissions Matrix (7 Roles)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead className="shadow-sm">
              <tr>
                <th className="w-[150px]">Module</th>
                <th>Action / Privilege</th>
                <th className="text-center w-[120px] bg-muted border-x">
                  Admin
                </th>
                <th className="text-center w-[120px]">HR</th>
                <th className="text-center w-[120px] border-l">Manager</th>
                <th className="text-center w-[120px] border-l">Employee</th>
                <th className="text-center w-[120px] border-l">Acceptances</th>
                <th className="text-center w-[120px] border-l">PM</th>
                <th className="text-center w-[120px] border-l">CM</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((node, index) => {
                const isDiffModule =
                  index === 0 || permissions[index - 1].module !== node.module;

                return (
                  <tr
                    key={node.id}
                    className="hover:bg-muted transition-colors"
                  >
                    <td className="font-bold text-muted-fg">
                      {isDiffModule ? node.module : ""}
                    </td>
                    <td className="text-slate-800">{node.action}</td>

                    {/* Admin Col */}
                    <td className="text-center border-x bg-muted/30">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-not-allowed opacity-60"
                        checked={node.roles.Admin}
                        readOnly
                      />
                    </td>

                    {/* HR Col */}
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-pointer"
                        checked={node.roles.HR}
                        onChange={() => handleToggle(node.id, "HR")}
                      />
                    </td>

                    {/* Manager Col */}
                    <td className="text-center border-l">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-pointer"
                        checked={node.roles.Manager}
                        onChange={() => handleToggle(node.id, "Manager")}
                      />
                    </td>

                    {/* Employee Col */}
                    <td className="text-center border-l">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-pointer"
                        checked={node.roles.Employee}
                        onChange={() => handleToggle(node.id, "Employee")}
                      />
                    </td>

                    {/* Acceptances Col */}
                    <td className="text-center border-l">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-pointer"
                        checked={node.roles.Acceptances}
                        onChange={() => handleToggle(node.id, "Acceptances")}
                      />
                    </td>

                    {/* PM Col */}
                    <td className="text-center border-l">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-pointer"
                        checked={node.roles.PM}
                        onChange={() => handleToggle(node.id, "PM")}
                      />
                    </td>

                    {/* CM Col */}
                    <td className="text-center border-l">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-accent cursor-pointer"
                        checked={node.roles.CM}
                        onChange={() => handleToggle(node.id, "CM")}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <Card className="mt-6">
          <CardHeader className="border-b border-border bg-muted/50 flex flex-row items-center justify-between">
            <CardTitle>System Users</CardTitle>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept=".csv"
                ref={fileInputUsersRef}
                onChange={handleFileUploadUsers}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputUsersRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportUsers}>
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form
              onSubmit={handleAddUser}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="e.g. jdoe"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="text"
                  placeholder="e.g. secret123"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card-bg px-3 py-2 text-sm max-w-full"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as any })
                  }
                >
                  <option value="Admin">Admin</option>
                  <option value="HR">HR</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                  <option value="Acceptances">Acceptances</option>
                  <option value="PM">PM</option>
                  <option value="CM">CM</option>
                </select>
              </div>
              <div className="space-y-2 col-span-1 md:col-span-4">
                <label className="text-sm font-medium">Projects (Optional)</label>
                <div className="flex flex-wrap gap-2 p-2 border border-border rounded-md max-h-[120px] overflow-y-auto bg-card-bg">
                  {allProjects.map((p) => (
                    <label key={p} className="flex items-center gap-1.5 text-sm whitespace-nowrap bg-muted px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        className="accent-accent"
                        checked={newUser.projects?.includes(p) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUser({ ...newUser, projects: [...(newUser.projects || []), p] });
                          } else {
                            setNewUser({ ...newUser, projects: (newUser.projects || []).filter(pr => pr !== p) });
                          }
                        }}
                      />
                      {p}
                    </label>
                  ))}
                  {allProjects.length === 0 && <span className="text-xs text-muted-fg">No projects available</span>}
                </div>
              </div>
              <Button
                type="submit"
                disabled={!newUser.name.trim() || !newUser.password.trim()}
                className="col-span-1 md:col-span-4"
              >
                <Plus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </form>

            <div className="overflow-x-auto border border-border rounded-md mt-6">
              <table className="w-full data-table min-w-[800px]">
                <thead className="bg-muted shadow-sm border-b">
                  <tr>
                    <th className="text-left w-1/4">Username</th>
                    <th className="text-left w-1/4">Role</th>
                    <th className="text-left w-1/4">Projects</th>
                    <th className="text-left w-1/4">Password</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {systemUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted transition-colors">
                      {editingUserId === u.id ? (
                        <>
                          <td className="p-2">
                            <Input
                              value={editingUserData.name}
                              onChange={(e) =>
                                setEditingUserData({
                                  ...editingUserData,
                                  name: e.target.value,
                                })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              className="flex h-8 w-full rounded-md border border-border bg-card-bg px-2 py-1 text-sm max-w-full"
                              value={editingUserData.role}
                              onChange={(e) =>
                                setEditingUserData({
                                  ...editingUserData,
                                  role: e.target.value as any,
                                })
                              }
                            >
                              <option value="Admin">Admin</option>
                              <option value="HR">HR</option>
                              <option value="Manager">Manager</option>
                              <option value="Employee">Employee</option>
                              <option value="Acceptances">Acceptances</option>
                              <option value="PM">PM</option>
                              <option value="CM">CM</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 p-1 border border-border rounded-md max-h-[80px] overflow-y-auto bg-card-bg">
                              {allProjects.map((p) => (
                                <label key={p} className="flex items-center gap-1 text-[10px] whitespace-nowrap bg-muted px-1 rounded">
                                  <input
                                    type="checkbox"
                                    className="accent-accent scale-75"
                                    checked={editingUserData.projects?.includes(p) || false}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditingUserData({ ...editingUserData, projects: [...(editingUserData.projects || []), p] });
                                      } else {
                                        setEditingUserData({ ...editingUserData, projects: (editingUserData.projects || []).filter(pr => pr !== p) });
                                      }
                                    }}
                                  />
                                  {p}
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="p-2">
                            <Input
                              type="text"
                              value={editingUserData.password}
                              onChange={(e) =>
                                setEditingUserData({
                                  ...editingUserData,
                                  password: e.target.value,
                                })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="text-right p-2 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleSaveEditUser(u.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-fg/80 hover:text-muted-fg hover:bg-muted/80 ml-1"
                              onClick={handleCancelEditUser}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="font-medium p-3">{u.name}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                              ${
                                u.role === "Admin"
                                  ? "bg-red-100 text-red-800"
                                  : u.role === "HR"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-muted/80 text-ink"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {u.projects && u.projects.length > 0 ? (
                                u.projects.map(p => (
                                  <Badge key={p} variant="secondary" className="text-[10px] px-1 py-0 bg-muted/60">{p}</Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-fg">-</span>
                              )}
                            </div>
                          </td>
                          <td className="text-muted-fg font-mono text-sm p-3">
                            {u.password}
                          </td>
                          <td className="text-right p-3 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-fg/80 hover:text-accent hover:bg-accent/10 mr-1"
                              onClick={() => handleEditUserClick(u)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-fg/80 hover:text-danger hover:bg-danger/10"
                              onClick={() => handleRemoveUser(u.id)}
                              disabled={u.name === "admin"} // Protect base admin
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
