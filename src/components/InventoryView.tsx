import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Shield,
  Layers,
  Sparkles,
  Edit2,
  X,
  Coffee,
  Check,
  Tag,
  DollarSign,
  Palette,
  PackagePlus,
  Droplet,
  Candy,
  Trash,
} from 'lucide-react';
import { InventoryItem, UserRole, GranizadoSize } from '../types';
import { formatCOP } from '../utils/billing';
import { NEON_COLOR_PALETTE, SUGGESTED_INVENTORY_TEMPLATES } from '../utils/constants';
import { sounds } from '../utils/audio';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onUpdateInventory: (updated: InventoryItem[]) => void;
  currentRole: UserRole;
  onRequestAdminAuth: () => void;
  onNavigateTab?: (tab: 'pos' | 'inventario' | 'reporte' | 'admin') => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onUpdateInventory,
  currentRole,
  onRequestAdminAuth,
  onNavigateTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState<number>(50);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Add Item Form State
  const [addType, setAddType] = useState<'sabor' | 'topic' | 'vaso' | 'otro'>('sabor');
  const [formName, setFormName] = useState('');
  const [formStock, setFormStock] = useState<number>(1000);
  const [formMinStock, setFormMinStock] = useState<number>(200);
  const [formCost, setFormCost] = useState<number>(20);
  const [formPrice, setFormPrice] = useState<number>(1500); // for toppings
  const [formPortion, setFormPortion] = useState<number>(30); // for toppings
  const [formUnit, setFormUnit] = useState<'uds' | 'ml' | 'kg' | 'porciones' | 'g'>('ml');
  const [formColor, setFormColor] = useState<string>('#00F2FE');
  const [formGlow, setFormGlow] = useState<string>('rgba(0, 242, 254, 0.6)');
  const [formSizeId, setFormSizeId] = useState<GranizadoSize>('12oz');
  const [formOtherCategory, setFormOtherCategory] = useState<'tapas' | 'pitillos' | 'hielo'>('tapas');
  const [formDescription, setFormDescription] = useState('');

  const isAdmin = currentRole === 'administrador';

  // Stats
  const saborCount = inventory.filter((i) => i.category === 'pulpas').length;
  const topicCount = inventory.filter((i) => i.category === 'toppings').length;
  const vasoCount = inventory.filter((i) => i.category === 'vasos').length;
  const lowStockCount = inventory.filter((i) => i.stock <= i.minStock).length;

  // Categories Filter Pills
  const categories = [
    { id: 'todos', label: 'Todos', count: inventory.length },
    { id: 'pulpas', label: '🍧 Sabores', count: saborCount },
    { id: 'toppings', label: '🍬 Topics', count: topicCount },
    { id: 'vasos', label: '🥤 Vasos', count: vasoCount },
    { id: 'otros', label: '🧊 Otros Insumos', count: inventory.filter((i) => ['tapas', 'pitillos', 'hielo'].includes(i.category)).length },
  ];

  // Filtered List
  const filteredItems = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === 'todos'
        ? true
        : selectedCategory === 'otros'
        ? ['tapas', 'pitillos', 'hielo'].includes(item.category)
        : item.category === selectedCategory;

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Open Add Modal
  const handleOpenAddModal = (presetType?: 'sabor' | 'topic' | 'vaso' | 'otro') => {
    sounds.playClick();
    if (!isAdmin) {
      onRequestAdminAuth();
      return;
    }
    const type = presetType || 'sabor';
    setAddType(type);
    if (type === 'sabor') {
      setFormName('');
      setFormUnit('ml');
      setFormStock(2500);
      setFormMinStock(500);
      setFormCost(18);
      setFormColor('#00F2FE');
      setFormGlow('rgba(0, 242, 254, 0.6)');
      setFormDescription('');
    } else if (type === 'topic') {
      setFormName('');
      setFormUnit('ml');
      setFormStock(1200);
      setFormMinStock(300);
      setFormCost(15);
      setFormPrice(1500);
      setFormPortion(30);
    } else if (type === 'vaso') {
      setFormName('Vaso 12 Onzas (Pequeño)');
      setFormSizeId('12oz');
      setFormUnit('uds');
      setFormStock(100);
      setFormMinStock(25);
      setFormCost(600);
    } else {
      setFormName('Tapa Domo 12 Onzas');
      setFormOtherCategory('tapas');
      setFormUnit('uds');
      setFormStock(100);
      setFormMinStock(25);
      setFormCost(350);
    }
    setIsAddModalOpen(true);
  };

  // Handle Form Submission for New Insumo
  const handleSaveNewInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      sounds.playWarning();
      return;
    }

    const timestamp = Date.now();
    let newItem: InventoryItem;

    if (addType === 'sabor') {
      const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      newItem = {
        id: `sabor-${slug}-${timestamp.toString().slice(-4)}`,
        name: cleanName,
        category: 'pulpas',
        stock: Number(formStock) || 0,
        minStock: Number(formMinStock) || 0,
        unit: formUnit || 'ml',
        costPerUnit: Number(formCost) || 0,
        color: formColor,
        glowColor: formGlow,
        description: formDescription,
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    } else if (addType === 'topic') {
      const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      newItem = {
        id: `topic-${slug}-${timestamp.toString().slice(-4)}`,
        name: cleanName,
        category: 'toppings',
        stock: Number(formStock) || 0,
        minStock: Number(formMinStock) || 0,
        unit: formUnit || 'ml',
        costPerUnit: Number(formCost) || 0,
        price: Number(formPrice) || 0,
        portionUsed: Number(formPortion) || 1,
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    } else if (addType === 'vaso') {
      // For official sizes, ensure mapping to vaso-12oz, vaso-14oz, or vaso-16oz
      const standardId = `vaso-${formSizeId}`;
      const existingSameId = inventory.some((i) => i.id === standardId);
      newItem = {
        id: existingSameId ? `vaso-${formSizeId}-${timestamp.toString().slice(-4)}` : standardId,
        name: cleanName,
        category: 'vasos',
        sizeId: formSizeId,
        stock: Number(formStock) || 0,
        minStock: Number(formMinStock) || 0,
        unit: 'uds',
        costPerUnit: Number(formCost) || 0,
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    } else {
      newItem = {
        id: `insumo-${formOtherCategory}-${timestamp.toString().slice(-4)}`,
        name: cleanName,
        category: formOtherCategory,
        stock: Number(formStock) || 0,
        minStock: Number(formMinStock) || 0,
        unit: formUnit,
        costPerUnit: Number(formCost) || 0,
        lastRestocked: new Date().toISOString().slice(0, 10),
      };
    }

    sounds.playSuccess();
    onUpdateInventory([...inventory, newItem]);
    setIsAddModalOpen(false);
    showToast(`Insumo "${newItem.name}" creado con éxito.`);
  };

  // Handle Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    sounds.playSuccess();
    const updated = inventory.map((item) => (item.id === editingItem.id ? editingItem : item));
    onUpdateInventory(updated);
    setEditingItem(null);
    showToast(`Insumo "${editingItem.name}" actualizado.`);
  };

  // Handle Restock Submit
  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    const added = Number(addQty) || 0;
    const updated = inventory.map((item) => {
      if (item.id === restockItem.id) {
        return {
          ...item,
          stock: Math.round((item.stock + added) * 100) / 100,
          lastRestocked: new Date().toISOString().slice(0, 10),
        };
      }
      return item;
    });

    sounds.playSuccess();
    onUpdateInventory(updated);
    showToast(`Se sumaron +${added} ${restockItem.unit} a "${restockItem.name}".`);
    setRestockItem(null);
    setAddQty(50);
  };

  // Handle Delete
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    sounds.playClick();
    const updated = inventory.filter((item) => item.id !== deleteConfirmItem.id);
    onUpdateInventory(updated);
    showToast(`"${deleteConfirmItem.name}" fue eliminado del inventario.`);
    setDeleteConfirmItem(null);
  };

  // Load Suggested Templates
  const handleLoadSuggested = () => {
    sounds.playSuccess();
    onUpdateInventory(SUGGESTED_INVENTORY_TEMPLATES);
    showToast('Insumos sugeridos cargados con éxito (Vasos, Sabores y Topics).');
  };

  // Clear All
  const handleClearAll = () => {
    sounds.playWarning();
    onUpdateInventory([]);
    setIsClearAllConfirmOpen(false);
    showToast('El inventario ha quedado completamente vacío.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950 to-slate-900 text-cyan-400 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Inventario de Insumos
              </h2>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                Panel Administrador
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Administra tus propios <strong>Sabores</strong>, <strong>Topics (Toppings)</strong> y <strong>Vasos</strong>. Se descuentan automáticamente en cada venta.
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Insumo Primary Button */}
          <button
            onClick={() => handleOpenAddModal('sabor')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(0,242,254,0.4)] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>AGREGAR INSUMO</span>
          </button>

          {/* Quick template loader if inventory has few or no items */}
          <button
            onClick={handleLoadSuggested}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-all"
            title="Cargar plantilla oficial de Vasos, Sabores y Topics"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Cargar Sugeridos</span>
          </button>

          {/* Clear all inventory */}
          {inventory.length > 0 && (
            <button
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
              title="Vaciar todo el inventario"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vaciar Todo</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedCategory('pulpas')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'pulpas'
              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>🍧 Sabores Registrados</span>
            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-cyan-300 font-mono">
            {saborCount}
          </div>
          <span className="text-[10px] text-slate-500">Pulpas y concentrados</span>
        </div>

        <div
          onClick={() => setSelectedCategory('toppings')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'toppings'
              ? 'bg-fuchsia-950/40 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>🍬 Topics / Toppings</span>
            <Candy className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-fuchsia-300 font-mono">
            {topicCount}
          </div>
          <span className="text-[10px] text-slate-500">Adicionales con precio</span>
        </div>

        <div
          onClick={() => setSelectedCategory('vasos')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'vasos'
              ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>🥤 Tipos de Vasos</span>
            <Coffee className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-300 font-mono">
            {vasoCount}
          </div>
          <span className="text-[10px] text-slate-500">12oz, 14oz, 16oz</span>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            lowStockCount > 0
              ? 'bg-rose-950/30 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>⚠️ Stock Bajo Alerta</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${lowStockCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {lowStockCount}
          </div>
          <span className="text-[10px] text-slate-500">{lowStockCount > 0 ? 'Requieren recarga' : 'Inventario óptimo'}</span>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-900/80 rounded-2xl border border-slate-800">
        {/* Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sounds.playClick();
                setSelectedCategory(cat.id);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === cat.id ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Inventory Content: Empty State vs Grid Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-10 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 mb-2">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">
            {inventory.length === 0
              ? 'No hay insumos registrados en el inventario'
              : 'No se encontraron insumos con ese filtro'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {inventory.length === 0
              ? 'Los insumos anteriores fueron retirados. Agrega tus Sabores personalizados, Topics (toppings con precio) y Vasos desde aquí.'
              : 'Prueba cambiando la categoría o el término de búsqueda.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleOpenAddModal('sabor')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ AGREGAR SABOR</span>
            </button>
            <button
              onClick={() => handleOpenAddModal('topic')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black text-xs shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ AGREGAR TOPIC</span>
            </button>
            <button
              onClick={() => handleOpenAddModal('vaso')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ AGREGAR VASO</span>
            </button>
            <button
              onClick={handleLoadSuggested}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Cargar Plantilla Sugerida (1 Clic)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isLow = item.stock <= item.minStock;
            const isOutOfStock = item.stock <= 0;
            const isFlavor = item.category === 'pulpas';
            const isTopic = item.category === 'toppings';
            const isVaso = item.category === 'vasos';

            return (
              <div
                key={item.id}
                className={`relative p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  isOutOfStock
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isLow
                    ? 'bg-slate-900/90 border-amber-500/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div>
                  {/* Category Header & Tags */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {isFlavor ? (
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-sm"
                          style={{
                            backgroundColor: item.color || '#00F2FE',
                            boxShadow: `0 0 8px ${item.color || '#00F2FE'}`,
                          }}
                        />
                      ) : isTopic ? (
                        <Candy className="w-4 h-4 text-fuchsia-400" />
                      ) : isVaso ? (
                        <Coffee className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Boxes className="w-4 h-4 text-slate-400" />
                      )}

                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                        {isFlavor ? 'Sabor' : isTopic ? 'Topic' : isVaso ? `Vaso ${item.sizeId || ''}` : item.category}
                      </span>
                    </div>

                    {/* Stock Alert Badge */}
                    {isOutOfStock ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                        AGOTADO
                      </span>
                    ) : isLow ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
                        STOCK BAJO
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        DISPONIBLE
                      </span>
                    )}
                  </div>

                  {/* Item Name */}
                  <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                    {item.name}
                  </h4>

                  {/* Topic Price tag if applicable */}
                  {isTopic && item.price !== undefined && (
                    <div className="mt-1 flex items-center space-x-1.5 text-xs text-fuchsia-300 font-semibold">
                      <Tag className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>Precio venta al cliente: <strong>{formatCOP(item.price)}</strong></span>
                    </div>
                  )}

                  {/* Stock Display Number */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Stock Actual
                      </span>
                      <div className="text-xl font-black text-cyan-300 font-mono tracking-tight">
                        {item.stock} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Alerta Mínima
                      </span>
                      <div className="text-xs font-mono font-bold text-slate-400">
                        {item.minStock} {item.unit}
                      </div>
                    </div>
                  </div>

                  {/* Cost Details */}
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between px-1">
                    <span>Costo unidad / porción:</span>
                    <span className="font-mono font-bold text-slate-300">{formatCOP(item.costPerUnit)}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  {/* Restock Button */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setRestockItem(item);
                      setAddQty(isFlavor || isTopic ? 500 : 50);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center space-x-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Recargar</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setEditingItem({ ...item });
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                    title="Editar detalles del insumo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      sounds.playWarning();
                      setDeleteConfirmItem(item);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-all"
                    title="Eliminar insumo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL AGREGAR INSUMO ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,254,0.3)] text-slate-100 my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 mb-2">
                <PackagePlus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">
                Agregar Nuevo Insumo
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecciona si deseas agregar un Sabor, Topic (Topping) o Vaso.
              </p>
            </div>

            {/* Type Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => handleOpenAddModal('sabor')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  addType === 'sabor'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.5)] font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🍧 Sabor
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('topic')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  addType === 'topic'
                    ? 'bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)] font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🍬 Topic
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('vaso')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  addType === 'vaso'
                    ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)] font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🥤 Vaso
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('otro')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  addType === 'otro'
                    ? 'bg-slate-700 text-white font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🧊 Otro
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNewInsumo} className="space-y-4">
              {/* Type specific fields */}
              {addType === 'vaso' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tamaño del Vaso Oficial:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['12oz', '14oz', '16oz'] as GranizadoSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setFormSizeId(sz);
                          setFormName(
                            sz === '12oz'
                              ? 'Vaso 12 Onzas (Pequeño)'
                              : sz === '14oz'
                              ? 'Vaso 14 Onzas (Mediano)'
                              : 'Vaso 16 Onzas (Grande)'
                          );
                          setFormCost(sz === '12oz' ? 600 : sz === '14oz' ? 750 : 900);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          formSizeId === sz
                            ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sz} ({sz === '12oz' ? '$12.000' : sz === '14oz' ? '$14.000' : '$16.000'})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {addType === 'otro' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Categoría de Insumo:
                  </label>
                  <select
                    value={formOtherCategory}
                    onChange={(e) => setFormOtherCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="tapas">Tapas Domo</option>
                    <option value="pitillos">Pitillos Neón</option>
                    <option value="hielo">Hielo Purificado</option>
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nombre del Insumo:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={
                    addType === 'sabor'
                      ? 'Ej: Mora Azul Neón, Fresa Ice, Lulo...'
                      : addType === 'topic'
                      ? 'Ej: Lechera, Gomitas Ácidas, Chamoy...'
                      : 'Ej: Vaso 12 Onzas...'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Flavor Neon Color Selection */}
              {addType === 'sabor' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Color Neón para la interfaz:</span>
                    <span className="flex items-center space-x-1.5 text-[11px] font-mono text-cyan-400">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: formColor }} />
                      <span>{formColor}</span>
                    </span>
                  </label>
                  <div className="grid grid-cols-5 gap-2 p-2 bg-slate-900 rounded-2xl border border-slate-800">
                    {NEON_COLOR_PALETTE.map((pal) => (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => {
                          setFormColor(pal.hex);
                          setFormGlow(pal.glow);
                        }}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                          formColor === pal.hex
                            ? 'ring-2 ring-white scale-105 shadow-lg'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: pal.hex }}
                        title={pal.name}
                      >
                        {formColor === pal.hex && <Check className="w-4 h-4 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Sale Price & Portion */}
              {addType === 'topic' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/30">
                  <div>
                    <label className="text-[11px] font-bold text-fuchsia-300 block mb-1">
                      Precio de Venta (COP):
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-fuchsia-300 block mb-1">
                      Porción por Vaso:
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formPortion}
                      onChange={(e) => setFormPortion(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Stock and Unit */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Stock Inicial:
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Alerta Mínima:
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Unidad:
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="ml">ml (Líquido)</option>
                    <option value="g">g (Gramos)</option>
                    <option value="uds">uds (Unidades)</option>
                    <option value="porciones">porciones</option>
                    <option value="kg">kg (Kilos)</option>
                  </select>
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Costo de Compra por Unidad / Porción (COP):
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formCost}
                  onChange={(e) => setFormCost(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                >
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR INSUMO ================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_40px_rgba(0,242,254,0.25)] text-slate-100">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4">
              Editar Insumo
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nombre:
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {editingItem.category === 'toppings' && (
                <div>
                  <label className="text-xs font-semibold text-fuchsia-300 block mb-1">
                    Precio de Venta al Cliente (COP):
                  </label>
                  <input
                    type="number"
                    value={editingItem.price ?? 1500}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Stock Actual ({editingItem.unit}):
                  </label>
                  <input
                    type="number"
                    value={editingItem.stock}
                    onChange={(e) => setEditingItem({ ...editingItem, stock: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Alerta Mínima:
                  </label>
                  <input
                    type="number"
                    value={editingItem.minStock}
                    onChange={(e) => setEditingItem({ ...editingItem, minStock: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Costo Unitario (COP):
                </label>
                <input
                  type="number"
                  value={editingItem.costPerUnit}
                  onChange={(e) => setEditingItem({ ...editingItem, costPerUnit: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL REABASTECER STOCK ================= */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setRestockItem(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white mb-1">
              Recargar Stock
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {restockItem.name} (Stock actual: {restockItem.stock} {restockItem.unit})
            </p>

            <form onSubmit={handleSaveRestock} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Cantidad a añadir ({restockItem.unit}):
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2.5 text-lg font-mono font-black text-cyan-300 text-center"
                />
              </div>

              {/* Quick Stepper Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 500, 1000].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setAddQty(step)}
                    className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300"
                  >
                    +{step}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs shadow-lg"
                >
                  Sumar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CONFIRMAR ELIMINAR ================= */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-950 border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-950 text-rose-400 border border-rose-500/40">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">
              ¿Eliminar "{deleteConfirmItem.name}"?
            </h3>
            <p className="text-xs text-slate-400">
              Este insumo dejará de estar disponible en el inventario y no podrá ser seleccionado en las facturas.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg"
              >
                Eliminar Insumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL VACIAR INVENTARIO COMPLETO ================= */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-950 border border-rose-500/60 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-950 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">
              ¿Vaciar Todo el Inventario?
            </h3>
            <p className="text-xs text-slate-400">
              Se eliminarán todos los insumos ({inventory.length} elementos) para comenzar completamente desde cero.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg"
              >
                Sí, Vaciar Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
