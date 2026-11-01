import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { POSBilling } from './components/POSBilling';
import { InventoryView } from './components/InventoryView';
import { DailyReportView } from './components/DailyReportView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { InvoiceModal } from './components/InvoiceModal';
import { AuthState, InventoryItem, Sale, TableSession, UserRole } from './types';
import { DEFAULT_AUTH, INITIAL_INVENTORY, INITIAL_TABLES } from './utils/constants';
import { SEED_SALES } from './utils/seedData';
import {
  applyInventoryDeduction,
  calculateInsumosDeduction,
  getLowStockItems,
  revertInventoryDeduction,
} from './utils/billing';
import { sounds } from './utils/audio';

const STORAGE_KEYS = {
  INVENTORY: 'ice_granizados_inventory_v2',
  SALES: 'ice_granizados_sales_v1',
  AUTH: 'ice_granizados_auth_v1',
  SOUND: 'ice_granizados_sound_v1',
  TABLES: 'ice_granizados_tables_v1',
};

export default function App() {
  // Check for ?autostart=1 in URL for automated testing
  const isAutostart = typeof window !== 'undefined' && window.location.search.includes('autostart=1');

  // 1. Inventory State with LocalStorage (empty initial inventory as requested)
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ice_granizados_inventory_v1');
      }
      const stored = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return INITIAL_INVENTORY;
  });

  // 2. Sales History State with LocalStorage
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return SEED_SALES;
  });

  // 3. Tables Session State (5 default tables + dynamic tables)
  const [tables, setTables] = useState<TableSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TABLES);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return INITIAL_TABLES;
  });

  // 4. Auth State with LocalStorage (initial page is Login unless stored or autostart)
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sanitize legacy or invalid pins so 4321 (admin) and 1234 (empleado) always work
        const cleanAdminPin =
          parsed.adminPin === '882200' || parsed.adminPin === '123456' || !parsed.adminPin
            ? '4321'
            : parsed.adminPin;
        const cleanEmployeePin =
          parsed.employeePin === '123456' || !parsed.employeePin
            ? '1234'
            : parsed.employeePin;

        return {
          ...DEFAULT_AUTH,
          ...parsed,
          adminPin: cleanAdminPin,
          employeePin: cleanEmployeePin,
          adminUser: parsed.adminUser || 'administrador',
          employeeUser: parsed.employeeUser || 'empleado',
          isAuthenticated: isAutostart ? true : (parsed.isAuthenticated ?? false),
        };
      }
    } catch {
      // fallback
    }
    return {
      ...DEFAULT_AUTH,
      isAuthenticated: isAutostart ? true : false,
    };
  });

  // 4. Sound effects state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SOUND);
      if (stored !== null) return stored === 'true';
    } catch {
      // fallback
    }
    return true;
  });

  // 5. Active Tab ('pos' | 'inventario' | 'reporte' | 'admin')
  const [activeTab, setActiveTab] = useState<'pos' | 'inventario' | 'reporte' | 'admin'>('pos');

  // 6. Modals & Notifications
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authTargetRole, setAuthTargetRole] = useState<UserRole | undefined>(undefined);
  const [viewingInvoice, setViewingInvoice] = useState<Sale | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Enforce role access control: employee cannot access inventario or admin
  useEffect(() => {
    if (auth.currentRole === 'empleado' && (activeTab === 'inventario' || activeTab === 'admin')) {
      setActiveTab('pos');
    }
  }, [auth.currentRole, activeTab]);

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    } catch {
      // storage failed
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch {
      // storage failed
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    } catch {
      // storage failed
    }
  }, [tables]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
    } catch {
      // storage failed
    }
  }, [auth]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, soundEnabled.toString());
      sounds.setEnabled(soundEnabled);
    } catch {
      // storage failed
    }
  }, [soundEnabled]);

  // Low stock counter
  const lowStockItems = getLowStockItems(inventory);
  const lowStockCount = lowStockItems.length;

  // Complete Sale & Deduct Insumos automatically
  const handleCompleteSale = (newSale: Sale, deductions: Record<string, number>) => {
    // 1. Add to sales history
    setSales((prev) => [newSale, ...prev]);

    // 2. Automatically apply inventory deduction
    const { updatedInventory, depletedItems } = applyInventoryDeduction(
      inventory,
      deductions
    );
    setInventory(updatedInventory);

    if (depletedItems.length > 0) {
      setTimeout(() => {
        sounds.playWarning();
      }, 800);
    }
  };

  // Annul Sale (Admin action that automatically returns insumos to inventory)
  const handleAnnulSale = (saleId: string) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale || targetSale.status === 'anulada') return;

    sounds.playWarning();

    // 1. Revert deductions
    const deductionsToRevert = calculateInsumosDeduction(targetSale.items);
    const revertedInventory = revertInventoryDeduction(inventory, deductionsToRevert);
    setInventory(revertedInventory);

    // 2. Mark sale as annulled
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? { ...s, status: 'anulada' as const, cancellationReason: 'Anulada por Administrador' }
          : s
      )
    );

    showToast(`Factura ${targetSale.invoiceNumber} anulada. Insumos devueltos al inventario.`);
  };

  // Open Auth Modal for switching roles while logged in
  const handleOpenAuthModal = (targetRole?: UserRole) => {
    sounds.playClick();
    setAuthTargetRole(targetRole);
    setIsAuthModalOpen(true);
  };

  // Handle successful role switch via AuthModal
  const handleAuthenticate = (role: UserRole) => {
    setAuth((prev) => ({
      ...prev,
      currentRole: role,
    }));
    if (role === 'administrador') {
      setActiveTab('admin');
    }
  };

  // Handle Login Screen submission
  const handleLoginSuccess = (role: UserRole) => {
    setAuth((prev) => ({
      ...prev,
      isAuthenticated: true,
      currentRole: role,
    }));
    setActiveTab(role === 'administrador' ? 'admin' : 'pos');
  };

  // Handle Logout (returns to initial login screen)
  const handleLogout = () => {
    sounds.playClick();
    setAuth((prev) => ({
      ...prev,
      isAuthenticated: false,
    }));
  };

  // Reset demo data
  const handleResetData = () => {
    setInventory(INITIAL_INVENTORY);
    setSales(SEED_SALES);
    setTables(INITIAL_TABLES);
    setAuth(DEFAULT_AUTH);
  };

  // If user is NOT authenticated, display initial Login Screen!
  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        auth={auth}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Once authenticated, render main POS & Management Application
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Background ambient lighting neon glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Navigation & Header */}
        <Header
          auth={auth}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          lowStockCount={lowStockCount}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />

        {/* Main Content Area */}
        <main className="flex-1 pb-16">
          {activeTab === 'pos' && (
            <POSBilling
              inventory={inventory}
              tables={tables}
              onUpdateTables={setTables}
              onCompleteSale={handleCompleteSale}
              currentRole={auth.currentRole}
              cashierName={auth.currentRole === 'administrador' ? auth.adminName : auth.employeeName}
              existingSales={sales}
              onViewInvoice={(sale) => setViewingInvoice(sale)}
            />
          )}

          {activeTab === 'inventario' && (
            <InventoryView
              inventory={inventory}
              onUpdateInventory={setInventory}
              currentRole={auth.currentRole}
              onRequestAdminAuth={() => handleOpenAuthModal('administrador')}
            />
          )}

          {activeTab === 'reporte' && (
            <DailyReportView
              sales={sales}
              currentRole={auth.currentRole}
              onViewInvoice={(sale) => setViewingInvoice(sale)}
              onAnnulSale={handleAnnulSale}
              onRequestAdminAuth={() => handleOpenAuthModal('administrador')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              auth={auth}
              onUpdateAuth={(updated) => setAuth((prev) => ({ ...prev, ...updated }))}
              inventory={inventory}
              onUpdateInventory={setInventory}
              sales={sales}
              onResetData={handleResetData}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F2FE]" />
              ICE GRANIZADOS - Sistema de Facturación & Control Automático de Insumos
            </span>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span>
                Sesión activa:{' '}
                <strong className={auth.currentRole === 'administrador' ? 'text-fuchsia-400' : 'text-cyan-400'}>
                  {auth.currentRole === 'administrador' ? 'Administrador' : 'Empleado'}
                </strong>
              </span>
              <button
                onClick={handleLogout}
                className="hover:text-rose-400 underline transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Security Auth Modal for switching roles inside app */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        auth={auth}
        onAuthenticate={handleAuthenticate}
        targetRole={authTargetRole}
      />

      {/* Thermal POS Receipt Modal */}
      <InvoiceModal
        sale={viewingInvoice}
        onClose={() => setViewingInvoice(null)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 border border-cyan-400 text-white shadow-[0_0_25px_rgba(0,242,254,0.4)] backdrop-blur-md flex items-center space-x-3 animate-in slide-in-from-top duration-200">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
