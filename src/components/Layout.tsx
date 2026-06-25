import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calculator, FileSpreadsheet, LogOut, Menu, Shield, Settings, Sun, Moon, X, MessageSquareWarning, Banknote, HardHat } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { cn } from '../lib/utils';
import { Button, Input } from './ui';

export function Layout() {
  const { user, setUser, theme, toggleTheme, permissions, systemUsers, setSystemUsers, isSupabaseConnected } = useAppContext();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = React.useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const checkAccess = (path: string) => {
    if (!user) return false;
    
    const hasPermission = (module: string, action: string) => {
      const p = permissions.find(x => x.module === module && x.action === action);
      return p ? p.roles[user.role] : false;
    };

    switch (path) {
      case '/':
        return hasPermission('Dashboard', 'View Metrics & Charts');
      case '/employees':
        return hasPermission('Employees', 'View Employee List');
      case '/salaries':
        return hasPermission('Salaries', 'View Monthly Salaries');
      case '/gross-salaries':
        return hasPermission('Gross Salaries', 'View Gross Salaries');
      case '/cost':
        return hasPermission('Cost', 'View Cost Page');
      case '/safety':
        return hasPermission('Safety', 'View Safety Page');
      case '/po-budget':
        return hasPermission('PO & Budget', 'View Financial Dashboard');
      case '/po-entry':
        return hasPermission('PO Entry', 'View PO Entry');
      case '/po-acceptances':
        return hasPermission('PO Acceptances', 'View PO Acceptances');
      case '/escalations':
        return hasPermission('Escalations', 'View & Manage Escalations');
      case '/permissions':
        return hasPermission('System', 'Manage Roles & Permissions');
      case '/settings':
        return hasPermission('System', 'Manage Settings');
      default:
        return false;
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Monthly Salaries', path: '/salaries', icon: Calculator },
    { name: 'Gross Salaries', path: '/gross-salaries', icon: Banknote },
    { name: 'Total Cost', path: '/cost', icon: Calculator },
    { name: 'Safety', path: '/safety', icon: HardHat },
    { name: 'PO & Budget', path: '/po-budget', icon: FileSpreadsheet },
    { name: 'PO Acceptances', path: '/po-acceptances', icon: FileSpreadsheet },
    { name: 'Escalations', path: '/escalations', icon: MessageSquareWarning },
    { name: 'Permissions', path: '/permissions', icon: Shield },
    { name: 'System Settings', path: '/settings', icon: Settings },
  ].filter(item => checkAccess(item.path));

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSystemUsers(systemUsers.map(u => u.id === user.id ? { ...u, password: newPassword } : u));
    setSuccessMsg('Password changed successfully');
    setTimeout(() => {
      setSuccessMsg('');
      setIsPasswordModalOpen(false);
      setNewPassword('');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-ink font-sans">
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-card-bg border-r border-border text-muted-fg w-[240px] flex flex-col transition-all duration-300 ease-in-out px-4 py-6 z-20",
        !isSidebarOpen && "-ml-[240px]"
      )}>
        <div className="text-[1.3rem] font-[800] pb-4 flex items-center justify-center gap-2 text-ink border-b border-border">
          <img src="/logo.png" alt="AFRO APP Logo" className="h-8 object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const nextSibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
            if (nextSibling) nextSibling.style.display = 'flex';
          }} />
          <div style={{ display: 'none' }} className="items-center justify-center gap-2">
            <span style={{ color: '#fcc115' }}>AFRO</span><span className="text-accent opacity-90">APP</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto mt-6 flex flex-col px-2 space-y-1 no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                isActive 
                  ? "bg-accent text-white shadow-md shadow-accent/20" 
                  : "hover:bg-muted hover:text-ink text-muted-fg"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-border px-2 flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl border border-border">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex flex-shrink-0 items-center justify-center text-accent ring-1 ring-accent/20 font-bold text-xs uppercase shadow-sm">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex flex-col text-xs overflow-hidden">
              <span className="font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">{user?.name || 'Administrator'}</span>
              <span className="text-muted-fg">{user?.role || 'Admin'}</span>
            </div>
          </div>
          {user?.role === 'Employee' && (
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-2 text-ink hover:text-accent transition-colors text-sm px-2 font-medium py-1"
            >
              <Settings className="w-4 h-4" />
              Change Password
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-danger hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm px-2 font-medium py-1"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {!isSupabaseConnected && (
          <div className="bg-red-500/10 text-red-500 px-4 py-2 text-sm font-medium flex items-center justify-between border-b border-red-500/20">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4" />
              <span>Offline Mode: Database connection failed. Changes will only be saved to your browser's local storage.</span>
            </div>
            <NavLink to="/settings" className="underline hover:text-red-400">
              Check Connection
            </NavLink>
          </div>
        )}
        <div className="p-6 flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 h-auto text-muted-fg hover:bg-muted/50">
               <Menu className="w-5 h-5 text-ink" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[0.85rem] font-medium text-muted-fg">System Date: {new Date().toLocaleDateString()}</span>
            <Button variant="ghost" className="p-2 h-auto rounded-full hover:bg-muted/50" onClick={toggleTheme}>
              {theme === 'dark' ? <Moon className="w-5 h-5 text-ink" /> : <Sun className="w-5 h-5 text-ink" />}
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto rounded-[8px]">
          <Outlet />
        </div>
        </div>
      </main>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-accent" /> Change Password
              </h3>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-muted-fg/80 hover:text-ink transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {successMsg && (
                <div className="mb-4 p-3 bg-green-50/10 text-success border border-success/20 rounded-lg text-sm text-center font-medium">
                  {successMsg}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">New Password</label>
                  <Input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
