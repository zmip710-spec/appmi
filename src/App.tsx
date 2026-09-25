import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KPICard } from './components/KPICard';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { RecentTransactions } from './components/RecentTransactions';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { AnalyticsView } from './components/AnalyticsView';
import { MultiStoreInventoryView } from './components/MultiStoreInventoryView';
import { SalesView } from './components/SalesView';
import { LoginView } from './components/LoginView';
import { fetchDashboardStatsApi, fetchInventory, fetchInventoryMatrixApi, fetchTransactions, fetchBatches, fetchUsers, verifySessionApi, checkHealthApi, DashboardStats, User } from './services/api';
import { exportViewPdf } from './utils/pdfExport';
import { DollarSign, Boxes, Layers, PackageCheck, CheckCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('appmi_user') || localStorage.getItem('nexus_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('appmi_theme') || localStorage.getItem('appg_theme') || localStorage.getItem('nexus_theme');
      if (savedTheme) return savedTheme === 'dark';
      return true;
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const savedTab = localStorage.getItem('appmi_active_tab') || localStorage.getItem('appg_active_tab') || localStorage.getItem('nexus_active_tab');
      if (savedTab && ['inventory', 'sales', 'settings'].includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'inventory';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // Silent Background Health Check (No auto reloads, no overlays)
  useEffect(() => {
    const checkConnection = async () => {
      const healthy = await checkHealthApi();
      setIsOffline(!healthy);
    };

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => checkConnection();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const interval = setInterval(checkConnection, 10000);
    checkConnection();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  // Persist active tab changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('appmi_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Temporarily redirect dashboard, analytics to inventory, and users to settings
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'analytics') {
      setActiveTab('inventory');
    } else if (activeTab === 'users') {
      setActiveTab('settings');
    }
  }, [activeTab]);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_stats') || localStorage.getItem('appg_cache_stats');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      totalSales: 0,
      completedSalesCount: 0,
      totalSkus: 0,
      totalStock: 0,
      inventoryValue: 0,
      totalImportExpenses: 0,
      customsTaxPaid: 0,
      shippingPaid: 0,
      totalBatchesCount: 0
    };
  });

  // Strict Security Session Guard: Check if profile exists and is active in SQLite
  useEffect(() => {
    const checkSecuritySession = async () => {
      if (!currentUser) return;
      const res = await verifySessionApi(currentUser.id, currentUser.email || currentUser.name);
      if (!res.valid) {
        localStorage.removeItem('appmi_user');
        localStorage.removeItem('nexus_user');
        setCurrentUser(null);
        setShowToast(false);
      } else if (res.user) {
        if (JSON.stringify(res.user) !== JSON.stringify(currentUser)) {
          setCurrentUser(res.user);
          localStorage.setItem('appmi_user', JSON.stringify(res.user));
        }
      }
    };

    checkSecuritySession();
  }, [activeTab]);

  const loadDashboardStats = async () => {
    try {
      const stats = await fetchDashboardStatsApi();
      if (stats) {
        setDashboardStats(stats);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDashboardStats();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      try { localStorage.setItem('appmi_theme', 'dark'); } catch {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('appmi_theme', 'light'); } catch {}
    }
  }, [darkMode]);

  // Auto-switch Vendedor user to inventory if on an unauthorized tab
  useEffect(() => {
    if (currentUser?.role === 'Vendedor') {
      if (activeTab !== 'inventory' && activeTab !== 'sales') {
        setActiveTab('inventory');
      }
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: User) => {
    setShowToast(false);
    setToastMessage('');
    setCurrentUser(user);
    if (user.role === 'Vendedor') {
      setActiveTab('inventory');
    }
    try {
      localStorage.setItem('appmi_user', JSON.stringify(user));
    } catch {}
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('appmi_user', JSON.stringify(updatedUser));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('appmi_user');
      localStorage.removeItem('nexus_user');
    } catch {}
  };

  const handleExportPDF = async () => {
    try {
      const [invData, matrixData, trxsData, batchesData, usersData] = await Promise.all([
        fetchInventory().catch(() => []),
        fetchInventoryMatrixApi().catch(() => []),
        fetchTransactions().catch(() => []),
        fetchBatches().catch(() => []),
        fetchUsers().catch(() => [])
      ]);

      let finalInventory = Array.isArray(invData) && invData.length > 0 ? invData : [];
      if (finalInventory.length === 0 && Array.isArray(matrixData) && matrixData.length > 0) {
        finalInventory = matrixData.map(m => ({
          id: m.id,
          sku: m.sku,
          name: m.name,
          category: 'General',
          stock: m.stock_total || 0,
          unitCost: (m.cost_price || 0) / 7.80,
          lastUpdated: m.created_at || 'Reciente'
        }));
      }

      exportViewPdf({
        activeTab,
        user: currentUser,
        stats: dashboardStats,
        inventory: finalInventory,
        transactions: Array.isArray(trxsData) ? trxsData : [],
        batches: Array.isArray(batchesData) ? batchesData : [],
        users: Array.isArray(usersData) ? usersData : []
      });

      setToastMessage(`¡Reporte PDF de ${activeTab.toUpperCase()} listo para imprimir!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch {
      exportViewPdf({
        activeTab,
        user: currentUser,
        stats: dashboardStats,
        inventory: [],
        transactions: [],
        batches: [],
        users: []
      });
    }
  };

  // Render Login Screen if No User Logged In
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOffline={isOffline}
      />

      {/* Main Content Area */}
      <main className="w-full flex-1 flex flex-col overflow-y-auto">
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onExport={handleExportPDF}
          currentUser={currentUser}
          onLogout={handleLogout}
          activeTab={activeTab}
          isOffline={isOffline}
        />

        {/* Global Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-indigo-400/30 animate-bounce">
            <CheckCircle className="w-5 h-5 text-emerald-300" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="w-full flex-1 pb-24 md:pb-6 min-h-[calc(100vh-80px)]">
          
          {/* TAB 1: DASHBOARD DINÁMICO DESDE SQLITE */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
              {/* Dynamic Live KPI Metrics (Horizontal Scrollable Ribbon on Mobile) */}
              <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Ventas Totales (Ingresos)"
                    value={`Q ${dashboardStats.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
                    change={`${dashboardStats.completedSalesCount} Ventas`}
                    isPositive={true}
                    comparisonText="registradas en SQLite"
                    icon={DollarSign}
                    iconBgColor="bg-emerald-500/10"
                    iconTextColor="text-emerald-400"
                  />
                </div>
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Stock Total en Almacén"
                    value={`${dashboardStats.totalStock} Unidades`}
                    change="Disponible"
                    isPositive={true}
                    comparisonText="físico en inventario"
                    icon={PackageCheck}
                    iconBgColor="bg-indigo-500/10"
                    iconTextColor="text-indigo-400"
                  />
                </div>
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Gastos Importación (Aduana+Flete)"
                    value={`Q ${dashboardStats.totalImportExpenses.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
                    change={`${dashboardStats.totalBatchesCount} Lotes`}
                    isPositive={false}
                    comparisonText={`Aduana: Q ${dashboardStats.customsTaxPaid} | Flete: Q ${dashboardStats.shippingPaid}`}
                    icon={Layers}
                    iconBgColor="bg-blue-500/10"
                    iconTextColor="text-blue-400"
                  />
                </div>
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Productos / SKUs Únicos"
                    value={`${dashboardStats.totalSkus} SKUs`}
                    change="Catálogos"
                    isPositive={true}
                    comparisonText="sin duplicados en la BD"
                    icon={Boxes}
                    iconBgColor="bg-amber-500/10"
                    iconTextColor="text-amber-400"
                  />
                </div>
              </div>

              {/* Charts Section */}
              <AnalyticsCharts stats={dashboardStats} />

              {/* Recent Transactions Table */}
              <RecentTransactions searchTerm={searchTerm} />
            </div>
          )}

          {/* TAB: INVENTARIO MULTITIENDA */}
          {(activeTab === 'inventory' || activeTab === 'multistore') && <MultiStoreInventoryView currentUser={currentUser} />}

          {/* TAB: VENTAS RÁPIDAS (POS) */}
          {activeTab === 'sales' && (
            <div className="max-w-7xl mx-auto w-full px-6 py-6">
              <SalesView currentUser={currentUser} />
            </div>
          )}

          {/* TAB: CONFIGURACIÓN */}
          {activeTab === 'settings' && (
            <div className="max-w-7xl mx-auto w-full px-6 py-6">
              <SettingsView currentUser={currentUser} onUpdateUser={handleUpdateUser} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
