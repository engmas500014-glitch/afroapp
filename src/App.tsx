import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './store/AppContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { POBudgetPage } from './pages/POBudgetPage';
import { SalariesPage } from './pages/SalariesPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { GrossSalariesPage } from './pages/GrossSalariesPage';
import { SafetyPage } from './pages/SafetyPage';

import { SettingsPage } from './pages/SettingsPage';
import { POEntryPage } from './pages/POEntryPage';
import { EscalationsPage } from './pages/EscalationsPage';
import { POAcceptancesPage } from './pages/POAcceptancesPage';

import { CostPage } from './pages/CostPage';
import { OtherCostPage } from './pages/OtherCostPage';

const ProtectedRoute = () => {
  const { user, permissions } = useAppContext();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission = (module: string, action: string) => {
    const p = permissions.find(x => x.module === module && x.action === action);
    return p ? p.roles[user.role] : false;
  };

  const path = location.pathname;
  let hasAccess = false;

  switch (path) {
    case '/':
      hasAccess = hasPermission('Dashboard', 'View Metrics & Charts');
      break;
    case '/employees':
      hasAccess = hasPermission('Employees', 'View Employee List');
      break;
    case '/salaries':
      hasAccess = hasPermission('Salaries', 'View Monthly Salaries');
      break;
    case '/other-cost':
      hasAccess = hasPermission('Other Cost', 'View Other Cost') || user?.role === 'Admin' || user?.role === 'HR';
      break;
    case '/gross-salaries':
      hasAccess = hasPermission('Gross Salaries', 'View Gross Salaries') || user?.role === 'Admin' || user?.role === 'HR';
      break;
    case '/cost':
      hasAccess = user?.role === 'Admin' || user?.role === 'HR';
      break;
    case '/safety':
      hasAccess = hasPermission('Safety', 'Manage Safety') || user?.role === 'Admin' || user?.role === 'HR';
      break;
    case '/po-budget':
    case '/po-acceptances':
      hasAccess = hasPermission('PO & Budget', 'View Financial Dashboard');
      break;
    case '/po-entry':
      hasAccess = hasPermission('PO & Budget', 'Edit Budget Rows'); // Assuming PO Entry requires edit permission
      break;
    case '/permissions':
    case '/settings':
      hasAccess = hasPermission('System', 'Manage Roles & Permissions');
      break;
    case '/escalations':
      hasAccess = hasPermission('Escalations', 'View & Manage Escalations');
      break;
    default:
      hasAccess = true;
  }

  if (!hasAccess) {
     if (path === '/') {
        // Find first accessible page
        const navItems = [
          { path: '/', module: 'Dashboard', action: 'View Metrics & Charts' },
          { path: '/employees', module: 'Employees', action: 'View Employee List' },
          { path: '/salaries', module: 'Salaries', action: 'View Monthly Salaries' },
          { path: '/other-cost', module: 'Other Cost', action: 'View Other Cost' },
          { path: '/gross-salaries', module: 'Gross Salaries', action: 'View Gross Salaries' },
          { path: '/cost', module: 'Cost', action: 'View Cost Page' },
          { path: '/safety', module: 'Safety', action: 'Manage Safety' },
          { path: '/po-budget', module: 'PO & Budget', action: 'View Financial Dashboard' },
          { path: '/escalations', module: 'Escalations', action: 'View & Manage Escalations' },
          { path: '/permissions', module: 'System', action: 'Manage Roles & Permissions' },
        ];
        const firstAllowed = navItems.find(item => hasPermission(item.module, item.action));
        if (firstAllowed && firstAllowed.path !== '/') {
           return <Navigate to={firstAllowed.path} replace />;
        }
        return (
          <div className="flex h-screen items-center justify-center bg-bg text-ink">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-fg mb-4">You do not have permission to view any modules.</p>
            </div>
          </div>
        );
     }
     return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/salaries" element={<SalariesPage />} />
          <Route path="/other-cost" element={<OtherCostPage />} />
          <Route path="/gross-salaries" element={<GrossSalariesPage />} />
          <Route path="/cost" element={<CostPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/po-budget" element={<POBudgetPage />} />
          <Route path="/po-acceptances" element={<POAcceptancesPage />} />
          <Route path="/po-entry" element={<POEntryPage />} />
          <Route path="/escalations" element={<EscalationsPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
