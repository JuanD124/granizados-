import React, { useState } from 'react';
import {
  Shield,
  TrendingUp,
  DollarSign,
  Boxes,
  KeyRound,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  CheckCircle2,
  Lock,
  Layers,
  Settings,
  Sparkles,
  Plus,
  Trash2,
  Coffee,
  Candy,
  Droplet,
  PackagePlus,
  X,
  Check,
} from 'lucide-react';
import { AuthState, InventoryItem, Sale, GranizadoSize } from '../types';
import { calculateAccumulatedMetrics, formatCOP } from '../utils/billing';
import { SIZE_CONFIGS, SUGGESTED_INVENTORY_TEMPLATES, NEON_COLOR_PALETTE } from '../utils/constants';
import { sounds } from '../utils/audio';

interface AdminPanelProps {
  auth: AuthState;
  onUpdateAuth: (updated: Partial<AuthState>) => void;
  inventory: InventoryItem[];
  onUpdateInventory: (updated: InventoryItem[]) => void;
  sales: Sale[];
  onResetData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  auth,
  onUpdateAuth,
  inventory,
  onUpdateInventory,
  sales,
  onResetData,
}) => {
  // Tabs inside admin
  const [activeAdminTab, setActiveAdminTab] = useState<'metrics' | 'insumos' | 'security' | 'backup'>('metrics');

  // Insumos creation modal state
  const [isAddInsumoModalOpen, setIsAddInsumoModalOpen] = useState(false);
  const [insumoType, setInsumoType] = useState<'sabor' | 'topic' | 'vaso'>('sabor');
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState<number>(2000);
  const [newMinStock, setNewMinStock] = useState<number>(500);
  const [newCost, setNewCost] = useState<number>(18);
  const [newPrice, setNewPrice] = useState<number>(1500);
  const [newPortion, setNewPortion] = useState<number>(30);
  const [newUnit, setNewUnit] = useState<'uds' | 'ml' | 'kg' | 'porciones' | 'g'>('ml');
  const [newColor, setNewColor] = useState<string>('#00F2FE');
  const [newSizeId, setNewSizeId] = useState<GranizadoSize>('12oz');
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Security credentials state
  const [newEmployeePin, setNewEmployeePin] = useState(auth.employeePin);
  const [newAdminPin, setNewAdminPin] = useState(auth.adminPin);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(null);
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string | null>(null);

  // Reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Financial Accumulated Metrics
  const metrics = calculateAccumulatedMetrics(sales);

  const handleOpenAddModal = (type: 'sabor' | 'topic' | 'vaso') => {
    sounds.playClick();
    setInsumoType(type);
    if (type === 'sabor') {
      setNewName('');
      setNewUnit('ml');
      setNewStock(2500);
      setNewMinStock(500);
      setNewCost(18);
      setNewColor('#00F2FE');
    } else if (type === 'topic') {
      setNewName('');
      setNewUnit('ml');
      setNewStock(1200);
      setNewMinStock(300);
      setNewCost(15);
      setNewPrice(1500);
      setNewPortion(30);
    } else {
      setNewName('Vaso 12 Onzas (Pequeño)');
      setNewSizeId('12oz');
      setNewUnit('uds');
      setNewStock(100);
      setNewMinStock(25);
      setNewCost(600);
    }
    setIsAddInsumoModalOpen(true);
  };

  const handleCreateInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;

    const timestamp = Date.now();
    let item: InventoryItem;

    if (insumoType === 'sabor') {
      const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '-');
      item = {
        id: `sabor-${slug}-${timestamp.toString().slice(-4)}`,
        name: clean,
        category: 'pulpas',
        stock: Number(newStock) || 0,
        minStock: Number(newMinStock) || 0,
        unit: newUnit,
        costPerUnit: Number(newCost) || 0,
        color: newColor,
        glowColor: 'rgba(0, 242, 254, 0.6)',
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    } else if (insumoType === 'topic') {
      const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '-');
      item = {
        id: `topic-${slug}-${timestamp.toString().slice(-4)}`,
        name: clean,
        category: 'toppings',
        stock: Number(newStock) || 0,
        minStock: Number(newMinStock) || 0,
        unit: newUnit,
        costPerUnit: Number(newCost) || 0,
        price: Number(newPrice) || 0,
        portionUsed: Number(newPortion) || 1,
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    } else {
      const standardId = `vaso-${newSizeId}`;
      const existingSameId = inventory.some((i) => i.id === standardId);
      item = {
        id: existingSameId ? `vaso-${newSizeId}-${timestamp.toString().slice(-4)}` : standardId,
        name: clean,
        category: 'vasos',
        sizeId: newSizeId,
        stock: Number(newStock) || 0,
        minStock: Number(newMinStock) || 0,
        unit: 'uds',
        costPerUnit: Number(newCost) || 0,
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    }

    sounds.playSuccess();
    onUpdateInventory([...inventory, item]);
    setIsAddInsumoModalOpen(false);
    setAdminToast(`Insumo "${item.name}" agregado con éxito.`);
    setTimeout(() => setAdminToast(null), 3000);
  };

  const handleDeleteInsumo = (id: string, name: string) => {
    sounds.playClick();
    onUpdateInventory(inventory.filter((i) => i.id !== id));
    setAdminToast(`"${name}" eliminado.`);
    setTimeout(() => setAdminToast(null), 3000);
  };

  const handleSavePins = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployeePin.length < 4 || newAdminPin.length < 4) {
      setSecurityErrorMsg('Las claves deben tener al menos 4 dígitos.');
      setTimeout(() => setSecurityErrorMsg(null), 3500);
      return;
    }

    sounds.playSuccess();
    onUpdateAuth({
      employeePin: newEmployeePin,
      adminPin: newAdminPin,
    });
    setSecurityErrorMsg(null);
    setSecuritySuccessMsg('Claves de seguridad actualizadas con éxito.');
    setTimeout(() => setSecuritySuccessMsg(null), 3000);
  };

  const handleExportFullBackup = () => {
    sounds.playClick();
    const backupData = {
      exportDate: new Date().toISOString(),
      appName: 'ICE GRANIZADOS',
      inventory,
      sales,
      auth: {
        employeeName: auth.employeeName,
        adminName: auth.adminName,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ICE_GRANIZADOS_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmInput.trim() === 'RESETEAR') {
      sounds.playWarning();
      onResetData();
      setShowResetModal(false);
      setResetConfirmInput('');
      setResetSuccessMsg('Datos restablecidos a la configuración inicial con éxito.');
      setTimeout(() => setResetSuccessMsg(null), 3500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Admin Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-fuchsia-950/40 to-slate-900 border border-fuchsia-500/40 shadow-[0_0_25px_rgba(217,70,239,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-fuchsia-950/80 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.4)]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                Panel Administrativo Master
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40 uppercase">
                Acceso Total
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Supervisión de ganancias acumuladas, auditoría de stock y configuración crítica.
            </p>
          </div>
        </div>

        {/* Admin Navigation Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveAdminTab('metrics');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'metrics'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ganancias Acumuladas
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveAdminTab('insumos');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'insumos'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🍧 Insumos (Sabores, Topics, Vasos)
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveAdminTab('security');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'security'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Claves & Seguridad
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveAdminTab('backup');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'backup'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Respaldos
          </button>
        </div>
      </div>

      {/* TAB 1: ACCUMULATED PROFITS & METRICS */}
      {activeAdminTab === 'metrics' && (
        <div className="space-y-6">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Accumulated Net Profit */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.2)] bg-gradient-to-b from-fuchsia-950/20 to-slate-900">
              <div className="flex items-center justify-between text-fuchsia-300 text-xs font-semibold">
                <span>Ganancia Neta Acumulada</span>
                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-fuchsia-950 border border-fuchsia-500/40 text-fuchsia-300">
                  {metrics.margin}% margen
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-pink-200 font-mono">
                {formatCOP(metrics.totalNetProfit)}
              </div>
              <div className="mt-1 text-[11px] text-fuchsia-300">
                Utilidad líquida total histórica
              </div>
            </div>

            {/* Total Gross Revenue */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Ventas Brutas Totales</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono">
                {formatCOP(metrics.totalGrossSales)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Total facturado en el sistema
              </div>
            </div>

            {/* Total Raw Materials Cost */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Costo Total de Insumos</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
                {formatCOP(metrics.totalCost)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Gasto consolidado en insumos
              </div>
            </div>

            {/* Total Units & Average Ticket */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Ticket Promedio</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {metrics.totalGranizadosSold} granizados
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-cyan-300 font-mono">
                {formatCOP(metrics.averageTicket)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {metrics.totalInvoices} órdenes despachadas
              </div>
            </div>
          </div>

          {/* Unit Profit Analysis by Size */}
          <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  Estructura de Rentabilidad por Tamaño Oficial
                </h3>
                <p className="text-xs text-slate-400">
                  Precios oficiales y margen bruto estimado por presentación
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  size: '12oz',
                  name: 'Granizado 12 Onzas',
                  price: 12000,
                  cost: 3200,
                  profit: 8800,
                  margin: '73%',
                  border: 'border-cyan-500/30',
                },
                {
                  size: '14oz',
                  name: 'Granizado 14 Onzas',
                  price: 14000,
                  cost: 3900,
                  profit: 10100,
                  margin: '72%',
                  border: 'border-blue-500/30',
                },
                {
                  size: '16oz',
                  name: 'Granizado 16 Onzas',
                  price: 16000,
                  cost: 4600,
                  profit: 11400,
                  margin: '71%',
                  border: 'border-fuchsia-500/30',
                },
              ].map((item) => (
                <div
                  key={item.size}
                  className={`p-5 rounded-2xl bg-slate-950 border ${item.border} space-y-3`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-white">{item.size}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      {item.margin} Margen
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 pt-1 border-t border-slate-900">
                    <div className="flex justify-between">
                      <span>Precio Venta:</span>
                      <span className="font-mono font-bold text-white">{formatCOP(item.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Costo Insumos Est.:</span>
                      <span className="font-mono text-amber-400">-{formatCOP(item.cost)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-cyan-300 pt-1 border-t border-slate-800">
                      <span>Ganancia Unitaria:</span>
                      <span className="font-mono">{formatCOP(item.profit)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: INSUMOS (SABORES, TOPICS, VASOS) DIRECT MANAGEMENT */}
      {activeAdminTab === 'insumos' && (
        <div className="space-y-6">
          {adminToast && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>{adminToast}</span>
            </div>
          )}

          {/* Header Card with Quick Add Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-fuchsia-500/30 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-fuchsia-400" />
                Configuración de Insumos del Sistema
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Agrega y configura los <strong>Sabores</strong>, <strong>Topics (Adicionales)</strong> y <strong>Vasos</strong> que estarán activos en el POS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenAddModal('sabor')}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Sabor</span>
              </button>
              <button
                onClick={() => handleOpenAddModal('topic')}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black shadow-[0_0_12px_rgba(217,70,239,0.3)] transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Topic</span>
              </button>
              <button
                onClick={() => handleOpenAddModal('vaso')}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Vaso</span>
              </button>
              <button
                onClick={() => {
                  sounds.playSuccess();
                  onUpdateInventory(SUGGESTED_INVENTORY_TEMPLATES);
                  setAdminToast('Plantilla oficial sugerida cargada con éxito.');
                  setTimeout(() => setAdminToast(null), 3000);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Cargar Sugeridos</span>
              </button>
              {inventory.length > 0 && (
                <button
                  onClick={() => {
                    sounds.playWarning();
                    onUpdateInventory([]);
                    setAdminToast('Inventario vaciado por completo.');
                    setTimeout(() => setAdminToast(null), 3000);
                  }}
                  className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all"
                  title="Vaciar todos los insumos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Counter Chips */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Sabores Activos</span>
                <span className="text-xl font-black text-cyan-400 font-mono">
                  {inventory.filter((i) => i.category === 'pulpas').length}
                </span>
              </div>
              <Droplet className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Topics con Precio</span>
                <span className="text-xl font-black text-fuchsia-400 font-mono">
                  {inventory.filter((i) => i.category === 'toppings').length}
                </span>
              </div>
              <Candy className="w-5 h-5 text-fuchsia-400" />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Tipos de Vasos</span>
                <span className="text-xl font-black text-sky-400 font-mono">
                  {inventory.filter((i) => i.category === 'vasos').length}
                </span>
              </div>
              <Coffee className="w-5 h-5 text-sky-400" />
            </div>
          </div>

          {/* Current Insumos Table */}
          {inventory.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Boxes className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No hay insumos registrados en este momento.</p>
              <p className="text-xs text-slate-500">Usa los botones superiores para agregar tus Sabores, Topics o Vasos.</p>
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300 flex items-center justify-between">
                <span>Insumos Configurados ({inventory.length})</span>
                <span className="text-[11px] text-slate-500">Se sincronizan automáticamente con el POS</span>
              </div>
              <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                {inventory.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      {item.category === 'pulpas' ? (
                        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: item.color || '#00F2FE' }} />
                      ) : item.category === 'toppings' ? (
                        <Candy className="w-4 h-4 text-fuchsia-400" />
                      ) : (
                        <Coffee className="w-4 h-4 text-sky-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-950 text-slate-400 uppercase">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Stock: {item.stock} {item.unit} {item.price ? `• Precio POS: ${formatCOP(item.price)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteInsumo(item.id, item.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Eliminar insumo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL AGREGAR INSUMO DESDE PANEL ADMIN ================= */}
      {isAddInsumoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-950 border border-fuchsia-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(217,70,239,0.3)] text-slate-100">
            <button
              onClick={() => setIsAddInsumoModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white mb-1">
              Agregar {insumoType === 'sabor' ? 'Sabor (Pulpa / Jarabe)' : insumoType === 'topic' ? 'Topic / Topping (Adicional)' : 'Vaso Desechable'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configura el nuevo elemento para que esté disponible de inmediato en la facturación.
            </p>

            <form onSubmit={handleCreateInsumo} className="space-y-3.5">
              {insumoType === 'vaso' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tamaño:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['12oz', '14oz', '16oz'] as GranizadoSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setNewSizeId(sz);
                          setNewName(sz === '12oz' ? 'Vaso 12 Onzas (Pequeño)' : sz === '14oz' ? 'Vaso 14 Onzas (Mediano)' : 'Vaso 16 Onzas (Grande)');
                          setNewCost(sz === '12oz' ? 600 : sz === '14oz' ? 750 : 900);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold border ${newSizeId === sz ? 'bg-sky-500 text-slate-950 border-sky-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={insumoType === 'sabor' ? 'Ej: Mora Azul Neón, Maracuyá...' : insumoType === 'topic' ? 'Ej: Lechera, Gomitas...' : 'Ej: Vaso 12 Onzas...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {insumoType === 'sabor' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Color Neón:</label>
                  <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                    {NEON_COLOR_PALETTE.map((pal) => (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => setNewColor(pal.hex)}
                        className={`h-7 rounded-lg flex items-center justify-center ${newColor === pal.hex ? 'ring-2 ring-white scale-105' : 'opacity-80'}`}
                        style={{ backgroundColor: pal.hex }}
                      >
                        {newColor === pal.hex && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {insumoType === 'topic' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-fuchsia-300 block mb-1">Precio Venta (COP):</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-fuchsia-300 block mb-1">Porción:</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newPortion}
                      onChange={(e) => setNewPortion(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Stock:</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Mínimo:</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unidad:</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="uds">uds</option>
                    <option value="porciones">porciones</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Costo Unitario (COP):</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddInsumoModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-black text-xs shadow-lg"
                >
                  Guardar en Insumos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PIN MANAGEMENT */}
      {activeAdminTab === 'security' && (
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Administración de Claves de Acceso (PINs)
              </h3>
              <p className="text-xs text-slate-400">
                Configura claves independientes para restringir el acceso a configuraciones críticas.
              </p>
            </div>
          </div>

          {securitySuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{securitySuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSavePins} className="space-y-5">
            {/* Employee PIN */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-cyan-400 block uppercase tracking-wider">
                Clave de Empleado / Cajero:
              </label>
              <p className="text-[11px] text-slate-400">
                Permite facturar, consultar el catálogo y ver el total básico del turno sin acceder a configuración sensible.
              </p>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={8}
                value={newEmployeePin}
                onChange={(e) => setNewEmployeePin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 tracking-widest"
              />
              <span className="text-[10px] text-slate-500">
                Predeterminado: 1234
              </span>
            </div>

            {/* Admin PIN */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-fuchsia-400 block uppercase tracking-wider">
                Clave de Administrador Master:
              </label>
              <p className="text-[11px] text-slate-400">
                Permite acceder al panel de ganancias acumuladas, anular facturas y modificar insumos.
              </p>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={8}
                value={newAdminPin}
                onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-fuchsia-300 focus:outline-none focus:border-fuchsia-400 tracking-widest"
              />
              <span className="text-[10px] text-slate-500">
                Predeterminado: 4321 (del 4 al 1)
              </span>
            </div>

            {securityErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{securityErrorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all"
            >
              Guardar Nuevas Claves de Seguridad
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: BACKUP & DATA MANAGEMENT */}
      {activeAdminTab === 'backup' && (
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Copia de Respaldo y Mantenimiento
              </h3>
              <p className="text-xs text-slate-400">
                Descarga una copia completa en formato JSON o restablece el sistema.
              </p>
            </div>
          </div>

          {resetSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-slate-200">Exportar Copia de Seguridad</h4>
            <p className="text-xs text-slate-400">
              Guarda un archivo descargable con todo el historial de facturas, stock de insumos y configuraciones del negocio.
            </p>
            <button
              onClick={handleExportFullBackup}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo JSON de Respaldo</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 text-sm font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Zona de Riesgo: Restablecer Sistema</span>
            </div>
            <p className="text-xs text-slate-400">
              Elimina las facturas de prueba y recarga el inventario a los valores originales de fábrica.
            </p>
            <button
              onClick={() => {
                sounds.playClick();
                setResetConfirmInput('');
                setShowResetModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-bold transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restablecer Datos de Demostración</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Reseteo */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="flex items-center space-x-3 text-rose-400 pb-3 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Restablecer Todo el Sistema
              </h3>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              ADVERTENCIA: Esto borrará todas las ventas registradas y regresará el inventario a sus valores por defecto. Para continuar escribe exactamente: <strong className="text-rose-400 font-mono">RESETEAR</strong>
            </p>

            <form onSubmit={handleConfirmReset} className="mt-4 space-y-3">
              <input
                type="text"
                autoFocus
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="Escribe RESETEAR..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-center font-mono font-bold text-white focus:outline-none focus:border-rose-400 tracking-wider"
              />

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetConfirmInput.trim() !== 'RESETEAR'}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-black transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                >
                  Restablecer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
