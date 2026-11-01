import React from 'react';
import {
  Sparkles,
  Shield,
  User,
  Volume2,
  VolumeX,
  AlertTriangle,
  Receipt,
  Boxes,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Lock,
} from 'lucide-react';
import { AuthState, UserRole } from '../types';
import { sounds } from '../utils/audio';
import { SlushCupIcon } from './SlushCupIcon';

interface HeaderProps {
  auth: AuthState;
  activeTab: 'pos' | 'inventario' | 'reporte' | 'admin';
  setActiveTab: (tab: 'pos' | 'inventario' | 'reporte' | 'admin') => void;
  onOpenAuthModal: (targetRole?: UserRole) => void;
  onLogout: () => void;
  lowStockCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  auth,
  activeTab,
  setActiveTab,
  onOpenAuthModal,
  onLogout,
  lowStockCount,
  soundEnabled,
  setSoundEnabled,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
    if (next) sounds.playClick();
  };

  const isAdmin = auth.currentRole === 'administrador';

  const handleTabChange = (tab: 'pos' | 'inventario' | 'reporte' | 'admin') => {
    sounds.playClick();
    if (tab === 'admin' && !isAdmin) {
      onOpenAuthModal('administrador');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTabChange('pos')}>
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-600 p-0.5 shadow-[0_0_15px_rgba(0,242,254,0.5)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <SlushCupIcon size={26} className="w-6 h-6" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-fuchsia-400 drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                  ICE GRANIZADOS
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 uppercase tracking-widest shadow-[0_0_8px_rgba(0,242,254,0.3)]">
                  POS v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Facturación & Control Inteligente de Insumos
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => handleTabChange('pos')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'pos'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_16px_rgba(0,242,254,0.5)] font-bold'
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Facturar (POS)</span>
            </button>

            {/* Insumos tab: Only visible to Administrator, hidden for Employee */}
            {isAdmin && (
              <button
                onClick={() => handleTabChange('inventario')}
                className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'inventario'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_16px_rgba(0,242,254,0.5)] font-bold'
                    : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Insumos</span>
                {lowStockCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-bounce shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                    {lowStockCount}
                  </span>
                )}
              </button>
            )}

            {/* Cierre / Reporte tab */}
            <button
              onClick={() => handleTabChange('reporte')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'reporte'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_16px_rgba(0,242,254,0.5)] font-bold'
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{isAdmin ? 'Reporte Diario' : 'Cierre de Caja (Dinero)'}</span>
            </button>

            {/* Admin Panel: Only for administrator */}
            {isAdmin && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-[0_0_18px_rgba(217,70,239,0.5)] font-bold'
                    : 'text-slate-300 hover:text-fuchsia-300 hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-4 h-4 text-fuchsia-400" />
                <span>Panel Admin</span>
              </button>
            )}
          </nav>

          {/* Right Action Bar: Sound + User Role Badge + Auth switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Low stock warning chip (only for admin) */}
            {isAdmin && lowStockCount > 0 && (
              <button
                onClick={() => handleTabChange('inventario')}
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium hover:bg-rose-900/60 transition-colors"
                title={`${lowStockCount} insumo(s) bajo el stock mínimo`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>{lowStockCount} Insumos bajos</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Silenciar sonidos de caja' : 'Activar sonidos de caja'}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all duration-150"
              title={soundEnabled ? 'Sonidos activados' : 'Sonidos desactivados'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Current Role Indicator & Switch Button */}
            <div className="flex items-center pl-2 border-l border-slate-800 space-x-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">
                  {isAdmin ? auth.adminName : auth.employeeName}
                </div>
                <div className="flex items-center justify-end space-x-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isAdmin ? 'bg-fuchsia-400 shadow-[0_0_6px_#D946EF]' : 'bg-cyan-400 shadow-[0_0_6px_#00F2FE]'
                    }`}
                  />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {isAdmin ? 'ADMINISTRADOR' : 'EMPLEADO'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onOpenAuthModal()}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  isAdmin
                    ? 'bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-500/40 hover:bg-fuchsia-900/80 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/80 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                }`}
                title="Cambiar rol o ingresar clave"
              >
                {isAdmin ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Admin</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Empleado</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onLogout();
                }}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all"
                title="Cerrar sesión e ir al inicio"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar: Highly optimized for smartphone screens */}
        <div className="flex md:hidden py-2 space-x-1.5 border-t border-slate-900 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('pos')}
            className={`flex-1 min-h-[40px] flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'pos'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Facturar</span>
          </button>

          {/* Insumos: Only show on mobile if admin */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('inventario')}
              className={`flex-1 min-h-[40px] flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'inventario'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Insumos</span>
              {lowStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 ml-0.5 animate-ping"></span>
              )}
            </button>
          )}

          {/* Cierre / Reporte */}
          <button
            onClick={() => handleTabChange('reporte')}
            className={`flex-1 min-h-[40px] flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'reporte'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Reporte' : 'Cierre Caja'}</span>
          </button>

          {/* Admin panel tab: Only for admin */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('admin')}
              className={`flex-1 min-h-[40px] flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
