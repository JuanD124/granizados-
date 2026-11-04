import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus,
  Minus,
  Trash2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  ShoppingBag,
  RotateCcw,
  Check,
  Tag,
  Receipt,
  User,
  Coffee,
  ArrowRight,
  ArrowLeft,
  UtensilsCrossed,
  PlusCircle,
  Clock,
  X,
  Droplet,
  Search,
  Edit3,
  ClipboardList,
  Users,
  DollarSign,
} from 'lucide-react';
import {
  CartItem,
  GranizadoSize,
  GranizadoSizeConfig,
  InventoryItem,
  PaymentMethod,
  Sale,
  TableSession,
  Topping,
  UserRole,
} from '../types';
import {
  FLAVORS,
  SIZE_CONFIGS,
  TOPPINGS,
} from '../utils/constants';
import {
  calculateCartSummary,
  calculateInsumosDeduction,
  calculateItemCostEstimate,
  calculateItemUnitPrice,
  calculateOpenAccountsSummary,
  formatCOP,
  generateNextInvoiceNumber,
} from '../utils/billing';
import { sounds } from '../utils/audio';
import { SlushCupIcon } from './SlushCupIcon';

interface POSBillingProps {
  inventory: InventoryItem[];
  tables: TableSession[];
  onUpdateTables: (tables: TableSession[]) => void;
  onDeleteTable?: (tableId: string) => void;
  onCompleteSale: (newSale: Sale, deductions: Record<string, number>) => void;
  currentRole: UserRole;
  cashierName: string;
  existingSales: Sale[];
  onViewInvoice: (sale: Sale) => void;
  sizeConfigs?: Record<string, GranizadoSizeConfig>;
}

export const POSBilling: React.FC<POSBillingProps> = ({
  inventory,
  tables,
  onUpdateTables,
  onDeleteTable,
  onCompleteSale,
  currentRole,
  cashierName,
  existingSales,
  onViewInvoice,
  sizeConfigs = SIZE_CONFIGS,
}) => {
  // Active selected table / account (defaults to first account)
  const [activeTableId, setActiveTableId] = useState<string>(tables[0]?.id || 'cuenta-mostrador');

  // Open Accounts Management Panel state
  const [isOpenAccountsModalOpen, setIsOpenAccountsModalOpen] = useState<boolean>(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');
  const [quickAccountNameInput, setQuickAccountNameInput] = useState<string>('');

  // Inline rename state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState<string>('');

  // Delete account confirmation state
  const [accountPendingDelete, setAccountPendingDelete] = useState<TableSession | null>(null);

  // Step-by-step breakdown: 1 = Tamaño, 2 = Sabor, 3 = Topping, 4 = Nombre del Cliente y Cobro
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [isTableOrderModalOpen, setIsTableOrderModalOpen] = useState<boolean>(false);

  // Open modal to add drinks / build granizado for a specific table
  const handleOpenTableOrder = (tableId?: string) => {
    sounds.playClick();
    const effectiveTableId = tableId || tables[0]?.id || `cuenta-${Date.now()}`;
    setActiveTableId(effectiveTableId);
    let target = tables.find((t) => t.id === effectiveTableId);
    if (!target) {
      const defaultName = `Cliente ${tables.length + 1}`;
      target = {
        id: effectiveTableId,
        name: defaultName,
        customerName: defaultName,
        cart: [],
        openedAt: new Date().toISOString(),
      };
      onUpdateTables([...tables, target]);
    }
    setCustomerNameInput(target?.customerName || target?.name || '');
    setCurrentStep(1);
    setCheckoutError(null);
    setIsTableOrderModalOpen(true);
  };

  // Open modal directly to checkout/cobrar for a specific table
  const handleOpenTableCheckout = (tableId: string) => {
    sounds.playClick();
    setActiveTableId(tableId);
    const target = tables.find((t) => t.id === tableId);
    setCustomerNameInput(target?.customerName || target?.name || '');
    setCurrentStep(4);
    setCheckoutError(null);
    setIsTableOrderModalOpen(true);
  };

  // Current builder selections
  const [selectedSize, setSelectedSize] = useState<GranizadoSize>('12oz');
  const [primaryFlavorId, setPrimaryFlavorId] = useState<string>('mora-azul');
  const [enableMix, setEnableMix] = useState<boolean>(false);
  const [secondaryFlavorId, setSecondaryFlavorId] = useState<string>('fresa-ice');
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Payment & Checkout State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [autoOpenReceipt, setAutoOpenReceipt] = useState<boolean>(true);

  // Find active table session (safe fallback so UI never crashes even if all tables were deleted or paid)
  const currentTable = tables.find((t) => t.id === activeTableId) || tables[0] || {
    id: activeTableId || 'mesa-1',
    name: 'Mesa / Cliente',
    cart: [],
  };
  const tableCart = currentTable?.cart || [];

  // Helper getters
  const selectedConfig = sizeConfigs[selectedSize] || SIZE_CONFIGS[selectedSize];

  // Dynamic flavors derived directly from inventory, with fallback to default FLAVORS
  const inventoryFlavors = inventory
    .filter((i) => i.category === 'pulpas')
    .map((i) => ({
      id: i.id,
      name: i.name,
      color: i.color || '#00F2FE',
      glowColor: i.glowColor || 'rgba(0, 242, 254, 0.6)',
      description: i.description || '',
      stock: i.stock,
      unit: i.unit,
    }));

  const availableFlavors =
    inventoryFlavors.length > 0
      ? inventoryFlavors
      : FLAVORS.map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
          glowColor: f.glowColor,
          description: f.description,
          stock: 5000,
          unit: 'ml' as const,
        }));

  // Dynamic toppings derived directly from inventory, with fallback to default TOPPINGS
  const inventoryToppings: Topping[] = inventory
    .filter((i) => i.category === 'toppings')
    .map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price ?? 1500,
      stockKey: i.id,
      portionUsed: i.portionUsed ?? (i.unit === 'g' ? 35 : 25),
      unit: i.unit || 'porciones',
    }));

  const availableToppings: Topping[] =
    inventoryToppings.length > 0 ? inventoryToppings : TOPPINGS;

  const activePrimaryFlavor =
    availableFlavors.find((f) => f.id === primaryFlavorId) || availableFlavors[0];
  const activeSecondaryFlavor =
    availableFlavors.find((f) => f.id === secondaryFlavorId) ||
    availableFlavors.find((f) => f.id !== activePrimaryFlavor?.id) ||
    activePrimaryFlavor;

  const primaryFlavor = activePrimaryFlavor || {
    id: 'sabor-estandar',
    name: 'Sabor Estándar',
    color: '#00F2FE',
    glowColor: 'rgba(0, 242, 254, 0.6)',
    description: '',
  };

  const secondaryFlavor = activeSecondaryFlavor || primaryFlavor;

  // Stock check for currently selected cup
  const currentCupItem = inventory.find(
    (i) =>
      i.category === 'vasos' &&
      (i.id === selectedConfig?.cupStockKey ||
        i.sizeId === selectedSize ||
        i.id === `vaso-${selectedSize}` ||
        i.name.toLowerCase().includes(selectedSize.toLowerCase()))
  );
  const currentCupStock = currentCupItem?.stock ?? 0;
  const isCupOutOfStock = currentCupItem ? currentCupStock <= 0 : false;

  // Single item unit price
  const currentItemUnitPrice = calculateItemUnitPrice(
    selectedSize,
    selectedToppings,
    sizeConfigs
  );

  // Cart calculations for active table
  const { subtotal, discountAmount, total } = calculateCartSummary(
    tableCart,
    discountPercent
  );

  // Quick cash calculations
  const cashAmountReceived =
    paymentMethod === 'Efectivo'
      ? parseFloat(amountPaidInput.replace(/\D/g, '')) || 0
      : total;
  const changeDue = Math.max(0, cashAmountReceived - total);

  // Step 1: Select Size and advance to Step 2 (Sabores)
  const handleSelectSize = (sizeKey: GranizadoSize) => {
    sounds.playClick();
    setSelectedSize(sizeKey);
    setCurrentStep(2); // Automatically advance to Sabores!
  };

  // Step 2: Select Flavor and advance to Step 3 (Toppings)
  const handleSelectFlavor = (flavorId: string) => {
    sounds.playClick();
    setPrimaryFlavorId(flavorId);
    if (!enableMix) {
      setCurrentStep(3); // Advance to Toppings & Finalizar!
    }
  };

  // Toggle topping
  const toggleTopping = (topping: Topping) => {
    sounds.playClick();
    if (selectedToppings.some((t) => t.id === topping.id)) {
      setSelectedToppings(selectedToppings.filter((t) => t.id !== topping.id));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  // Stock warning toast
  const [stockError, setStockError] = useState<string | null>(null);

  // Add table modal state
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableNameInput, setNewTableNameInput] = useState('');

  // Clear cart confirm modal
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Step 3: Add to Order Ticket and advance to Step 4 (Nombre del Cliente y Cobro)
  const handleAddCurrentItemToTableCart = (targetStep: 1 | 4 = 4) => {
    sounds.playClick();

    if (isCupOutOfStock) {
      sounds.playWarning();
      setStockError(`¡Atención! No hay vasos disponibles para el tamaño ${selectedSize}.`);
      setTimeout(() => setStockError(null), 3500);
      return;
    }

    const newItem: CartItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      size: selectedSize,
      flavorId: primaryFlavor.id,
      flavorName: primaryFlavor.name,
      secondaryFlavorId: enableMix && secondaryFlavor ? secondaryFlavor.id : undefined,
      secondaryFlavorName: enableMix && secondaryFlavor ? secondaryFlavor.name : undefined,
      toppings: [...selectedToppings],
      unitPrice: currentItemUnitPrice,
      quantity,
      notes: itemNotes.trim() || undefined,
    };

    // Update active table's cart (creates table if none exists)
    const targetTableId = activeTableId || `cuenta-${Date.now()}`;
    const targetExists = tables.some((t) => t.id === targetTableId);
    let updatedTables: TableSession[];

    if (!targetExists) {
      const fallbackName = customerNameInput.trim() || `Cliente ${tables.length + 1}`;
      const newTable: TableSession = {
        id: targetTableId,
        name: fallbackName,
        customerName: fallbackName,
        cart: [newItem],
        openedAt: new Date().toISOString(),
      };
      updatedTables = [...tables, newTable];
      setActiveTableId(targetTableId);
    } else {
      updatedTables = tables.map((t) => {
        if (t.id === targetTableId) {
          return {
            ...t,
            cart: [...t.cart, newItem],
            openedAt: t.openedAt || new Date().toISOString(),
          };
        }
        return t;
      });
    }

    onUpdateTables(updatedTables);

    // Reset item builder state
    setSelectedToppings([]);
    setItemNotes('');
    setQuantity(1);
    setEnableMix(false);
    setCurrentStep(targetStep);
    setStockError(null);
  };

  // Open accounts global metric summary
  const accountsSummary = calculateOpenAccountsSummary(tables);

  // 1-Click Create Account by Name
  const handleCreateAccountByName = (customName?: string) => {
    sounds.playClick();
    const raw = customName !== undefined ? customName : quickAccountNameInput;
    const trimmed = raw.trim();
    const finalName = trimmed || `Cliente ${tables.length + 1}`;

    const newAccount: TableSession = {
      id: `cuenta-${Date.now()}`,
      name: finalName,
      customerName: finalName,
      cart: [],
      openedAt: new Date().toISOString(),
    };

    const updated = [...tables, newAccount];
    onUpdateTables(updated);
    setActiveTableId(newAccount.id);
    setQuickAccountNameInput('');
    setNewTableNameInput('');
    setIsAddTableModalOpen(false);
    setCustomerNameInput(finalName);
    setCurrentStep(1);
    setIsTableOrderModalOpen(true);

    // Save to Cloud SQL
    fetch(`/api/tables/${newAccount.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount),
    }).catch((err) => console.error('Cloud SQL create table error:', err));
  };

  // Inline Rename Account
  const handleSaveRenameAccount = (tableId: string) => {
    sounds.playClick();
    const trimmed = editingAccountName.trim();
    if (!trimmed) {
      setEditingAccountId(null);
      return;
    }

    const updated = tables.map((t) =>
      t.id === tableId ? { ...t, name: trimmed, customerName: trimmed } : t
    );
    onUpdateTables(updated);

    const target = updated.find((t) => t.id === tableId);
    if (target) {
      fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      }).catch((err) => console.error('Cloud SQL update table error:', err));
    }

    setEditingAccountId(null);
    setEditingAccountName('');
  };

  // Delete Account
  const handleConfirmDeleteAccount = () => {
    if (!accountPendingDelete) return;
    sounds.playClick();
    const idToDelete = accountPendingDelete.id;

    if (onDeleteTable) {
      onDeleteTable(idToDelete);
    } else {
      const remaining = tables.filter((t) => t.id !== idToDelete);
      onUpdateTables(
        remaining.length > 0
          ? remaining
          : [{ id: 'cuenta-mostrador', name: 'Mostrador / General', cart: [] }]
      );
      fetch(`/api/tables/${idToDelete}`, { method: 'DELETE' }).catch((err) =>
        console.error('Delete table error:', err)
      );
    }

    if (activeTableId === idToDelete) {
      const remaining = tables.filter((t) => t.id !== idToDelete);
      setActiveTableId(remaining[0]?.id || 'cuenta-mostrador');
    }

    setAccountPendingDelete(null);
  };

  // Clear specific table/account comanda
  const handleClearSpecificTableCart = (tableId: string) => {
    sounds.playClick();
    const updated = tables.map((t) =>
      t.id === tableId ? { ...t, cart: [] } : t
    );
    onUpdateTables(updated);
    if (tableId === activeTableId) {
      setAmountPaidInput('');
      setDiscountPercent(0);
      setCheckoutError(null);
      setIsClearConfirmOpen(false);
    }
  };

  // Add more tables dynamically via in-app modal
  const handleOpenAddTableModal = () => {
    sounds.playClick();
    setNewTableNameInput(`Cliente ${tables.length + 1}`);
    setIsAddTableModalOpen(true);
  };

  const handleConfirmAddTable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleCreateAccountByName(newTableNameInput);
  };

  // Quitar vaso o modificar cantidad en cualquier mesa
  const handleUpdateItemQtyInTable = (tableId: string, itemId: string, delta: number) => {
    sounds.playClick();
    const updatedTables = tables.map((t) => {
      if (t.id === tableId) {
        const nextCart = t.cart
          .map((item) => {
            if (item.id === itemId) {
              const nextQty = item.quantity + delta;
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];
        return { ...t, cart: nextCart };
      }
      return t;
    });
    onUpdateTables(updatedTables);
    const target = updatedTables.find((t) => t.id === tableId);
    if (target) {
      fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      }).catch((err) => console.error('Cloud SQL update table error:', err));
    }
  };

  // Quitar vaso completo de cualquier mesa
  const handleRemoveItemFromTable = (tableId: string, itemId: string) => {
    sounds.playClick();
    const updatedTables = tables.map((t) => {
      if (t.id === tableId) {
        return { ...t, cart: t.cart.filter((item) => item.id !== itemId) };
      }
      return t;
    });
    onUpdateTables(updatedTables);
    const target = updatedTables.find((t) => t.id === tableId);
    if (target) {
      fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      }).catch((err) => console.error('Cloud SQL update table error:', err));
    }
  };

  // Eliminar tarjeta directamente (cuando está libre o por acción del cajero)
  const handleDirectDeleteTable = (tableId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playClick();
    if (onDeleteTable) {
      onDeleteTable(tableId);
    } else {
      const remaining = tables.filter((t) => t.id !== tableId);
      onUpdateTables(remaining);
      fetch(`/api/tables/${tableId}`, { method: 'DELETE' }).catch((err) =>
        console.error('Delete table error:', err)
      );
    }
    const remaining = tables.filter((t) => t.id !== tableId);
    if (activeTableId === tableId) {
      setActiveTableId(remaining[0]?.id || '');
    }
  };

  // Cart operations for active table
  const updateTableCartQty = (itemId: string, delta: number) => {
    handleUpdateItemQtyInTable(activeTableId, itemId, delta);
  };

  const removeTableCartItem = (itemId: string) => {
    handleRemoveItemFromTable(activeTableId, itemId);
  };

  const handleExecuteClearCurrentTable = () => {
    sounds.playClick();
    const updatedTables = tables.map((t) => {
      if (t.id === activeTableId) {
        return { ...t, cart: [], customerName: undefined, openedAt: undefined };
      }
      return t;
    });
    onUpdateTables(updatedTables);
    setAmountPaidInput('');
    setDiscountPercent(0);
    setCheckoutError(null);
    setIsClearConfirmOpen(false);
  };

  // Quick cash buttons
  const handleQuickCash = (amount: number) => {
    sounds.playClick();
    setAmountPaidInput(amount.toString());
  };

  // Process Checkout for active table
  const handleProcessCheckout = () => {
    if (tableCart.length === 0) {
      sounds.playWarning();
      setCheckoutError('No hay granizados en la comanda para facturar.');
      return;
    }

    const finalCustomerName = customerNameInput.trim() || currentTable.customerName?.trim() || '';
    if (!finalCustomerName) {
      sounds.playWarning();
      setCheckoutError('Por favor ingresa el nombre del cliente o pedido para facturar.');
      return;
    }

    if (paymentMethod === 'Efectivo' && cashAmountReceived < total) {
      sounds.playWarning();
      setCheckoutError(
        `El monto recibido (${formatCOP(cashAmountReceived)}) es menor al total a pagar (${formatCOP(total)}).`
      );
      return;
    }

    setCheckoutError(null);

    // 1. Calculate deductions
    const deductions = calculateInsumosDeduction(tableCart);

    // 2. Calculate costs & profit estimate
    const totalCostEstimate = tableCart.reduce((sum, item) => {
      const itemCost = calculateItemCostEstimate(item.size, item.toppings, sizeConfigs);
      return sum + itemCost * item.quantity;
    }, 0);
    const profitEstimate = Math.max(0, total - totalCostEstimate);

    // 3. Construct Sale object
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(existingSales),
      createdAt: new Date().toISOString(),
      cashierRole: currentRole,
      cashierName,
      tableId: currentTable.id,
      tableName: finalCustomerName,
      customerName: finalCustomerName,
      items: [...tableCart],
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod,
      amountPaid: paymentMethod === 'Efectivo' ? cashAmountReceived : total,
      change: paymentMethod === 'Efectivo' ? changeDue : 0,
      totalCostEstimate,
      profitEstimate,
      status: 'completada',
    };

    // 4. Trigger audio & confetti
    sounds.playSuccess();
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00F2FE', '#FF007F', '#39FF14', '#FFE600'],
      });
    } catch {
      // Confetti fallback
    }

    // 5. Commit sale & deduct inventory
    onCompleteSale(newSale, deductions);

    // 6. Eliminar automáticamente la tarjeta apenas se pague ("apenas se pague se elimine las tarjetas automaticamente")
    const tableIdToEliminate = activeTableId;
    if (onDeleteTable) {
      onDeleteTable(tableIdToEliminate);
    } else {
      const remaining = tables.filter((t) => t.id !== tableIdToEliminate);
      onUpdateTables(remaining);
      fetch(`/api/tables/${tableIdToEliminate}`, { method: 'DELETE' }).catch((err) =>
        console.error('Delete table error:', err)
      );
    }

    const nextTables = tables.filter((t) => t.id !== tableIdToEliminate);
    if (nextTables.length > 0) {
      setActiveTableId(nextTables[0].id);
    } else {
      setActiveTableId('');
    }

    // 7. Open receipt if enabled
    if (autoOpenReceipt) {
      onViewInvoice(newSale);
    }

    // Reset cashier controls and return to step 1 ready for next customer
    setAmountPaidInput('');
    setDiscountPercent(0);
    setCustomerNameInput('');
    setCurrentStep(1);
    setIsTableOrderModalOpen(false);
  };

  const totalGranizadosInCurrentTable = tableCart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. HEADER: GESTIÓN DE MESAS & FACTURACIÓN POS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(0,242,254,0.4)]">
              <SlushCupIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">
                  Gestión de Mesas & Facturación POS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase font-mono">
                  Mesas & Cuentas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Selecciona cualquier mesa para sumar granizados (vaso ➔ sabor ➔ toppings) o cobrar la cuenta
              </p>
            </div>
          </div>

          {/* KPI Metrics Badges */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 mr-1.5 font-semibold">Total Mesas:</span>
              <span className="font-mono font-black text-cyan-300">{accountsSummary.totalAccounts}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-fuchsia-500/30 text-xs">
              <span className="text-slate-400 mr-1.5 font-semibold">Con Pedido:</span>
              <span className="font-mono font-black text-fuchsia-300">{accountsSummary.activeAccountsWithOrders}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs">
              <span className="text-slate-400 mr-1.5 font-semibold">Por Cobrar:</span>
              <span className="font-mono font-black text-emerald-300">{formatCOP(accountsSummary.totalPendingAmount)}</span>
            </div>
          </div>
        </div>

        {/* 2. BARRA DE ACCIÓN: BUSCADOR & CREACIÓN RÁPIDA DE MESAS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={accountSearchQuery}
              onChange={(e) => setAccountSearchQuery(e.target.value)}
              placeholder="Buscar mesa o cliente por nombre..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          <div className="relative sm:w-80">
            <User className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickAccountNameInput}
              onChange={(e) => setQuickAccountNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateAccountByName();
                }
              }}
              placeholder="Nombre nueva mesa o cliente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => handleCreateAccountByName()}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all shadow-[0_0_18px_rgba(0,242,254,0.35)] active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Abrir Mesa</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenTableOrder(tables[0]?.id || 'cuenta-mostrador')}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-950 border border-fuchsia-500/40 hover:border-fuchsia-400 text-fuchsia-300 hover:text-white font-bold text-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Venta Rápida</span>
          </button>
        </div>
      </div>

      {/* 3. GRID DE TARJETAS DE MESAS & CUENTAS */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Mesas y Cuentas Activas</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Toca el botón en la mesa para sumar o cobrar
          </span>
        </div>

        {tables.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/60 border border-dashed border-cyan-500/30 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/70 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
              <CheckCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                ¡Todas las tarjetas fueron pagadas y eliminadas!
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No hay cuentas pendientes en este momento. Toca para abrir una nueva mesa o iniciar una venta rápida:
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCreateAccountByName()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm flex items-center space-x-2 shadow-[0_0_20px_rgba(0,242,254,0.35)] active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Abrir Nueva Mesa</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenTableOrder()}
                className="px-5 py-3 rounded-2xl bg-slate-950 border border-fuchsia-500/50 hover:border-fuchsia-400 text-fuchsia-300 font-bold text-xs sm:text-sm flex items-center space-x-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span>⚡ Venta Rápida</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables
              .filter((t) =>
                t.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                (t.customerName && t.customerName.toLowerCase().includes(accountSearchQuery.toLowerCase()))
              )
              .map((table) => {
                const itemsCount = table.cart.reduce((s, i) => s + i.quantity, 0);
                const isOccupied = itemsCount > 0;
                const tableTotal = table.cart.reduce(
                  (s, i) => s + i.unitPrice * i.quantity,
                  0
                );
                const isRenaming = editingAccountId === table.id;

                return (
                  <div
                    key={table.id}
                    className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 relative group ${
                      isOccupied
                        ? 'bg-slate-900/95 border-fuchsia-500/50 shadow-[0_0_25px_rgba(255,0,127,0.15)] ring-1 ring-fuchsia-500/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,242,254,0.15)]'
                    }`}
                  >
                    {/* Top Bar of Card */}
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              autoFocus
                              value={editingAccountName}
                              onChange={(e) => setEditingAccountName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameAccount(table.id);
                                if (e.key === 'Escape') setEditingAccountId(null);
                              }}
                              className="px-2 py-1 rounded bg-slate-950 border border-cyan-400 text-xs text-white font-bold w-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameAccount(table.id)}
                              className="p-1 rounded bg-cyan-500 text-slate-950 font-bold text-xs"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 truncate flex-1">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isOccupied
                                ? 'bg-fuchsia-400 shadow-[0_0_8px_#FF007F] animate-pulse'
                                : 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                            }`} />
                            <h3 className="text-base font-black text-white truncate">
                              {table.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setEditingAccountId(table.id);
                                setEditingAccountName(table.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-300 transition-opacity"
                              title="Renombrar mesa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center space-x-1 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                              isOccupied
                                ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isOccupied ? `${itemsCount} vaso${itemsCount === 1 ? '' : 's'}` : 'Libre'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDirectDeleteTable(table.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar / Quitar esta tarjeta"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Preview & Option to Remove Cups ("opcion de quitar vasos") */}
                      <div className="py-3 min-h-[72px]">
                        {isOccupied ? (
                          <div className="space-y-2">
                            <div className="text-[11px] text-slate-300 max-h-32 overflow-y-auto space-y-1.5 pr-1 font-medium">
                              {table.cart.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-1.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-1 truncate">
                                      <span className="font-mono font-black text-cyan-400 text-[10px]">
                                        {item.quantity}x
                                      </span>
                                      <span className="font-bold text-white text-[11px] truncate">
                                        {item.size} {item.flavorName}
                                      </span>
                                    </div>
                                    {item.toppings.length > 0 && (
                                      <div className="text-[9px] text-fuchsia-300 truncate">
                                        +{item.toppings.map((t) => t.name).join(', ')}
                                      </div>
                                    )}
                                    <div className="font-mono text-cyan-300 font-bold text-[10px] mt-0.5">
                                      {formatCOP(item.unitPrice * item.quantity)}
                                    </div>
                                  </div>

                                  {/* CONTROLES PARA QUITAR VASOS DIRECTAMENTE EN LA TARJETA */}
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateItemQtyInTable(table.id, item.id, -1);
                                      }}
                                      className="w-5 h-5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/50 flex items-center justify-center font-black text-[11px] transition-colors cursor-pointer"
                                      title="Quitar 1 vaso"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-black text-white text-[10px] min-w-[14px] text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateItemQtyInTable(table.id, item.id, 1);
                                      }}
                                      className="w-5 h-5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center font-black text-[11px] transition-colors cursor-pointer"
                                      title="Sumar 1 vaso"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveItemFromTable(table.id, item.id);
                                      }}
                                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer ml-0.5"
                                      title="Quitar vaso completo de la comanda"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Total acumulado:</span>
                              <span className="text-lg font-black text-cyan-400 font-mono">
                                {formatCOP(tableTotal)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-slate-500 text-xs flex flex-col items-center justify-center space-y-1">
                            <Coffee className="w-5 h-5 opacity-40 text-cyan-400" />
                            <span>Mesa libre lista para tomar pedido</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar ON THE TABLE CARD */}
                    <div className="pt-2 space-y-2 border-t border-slate-800/80">
                      {isOccupied ? (
                        <div className="space-y-2">
                          {/* Primary Cobrar Button on the Card ("y pues que en esa tarjeta se pueda cobrar") */}
                          <button
                            type="button"
                            onClick={() => handleOpenTableCheckout(table.id)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                            <span>⚡ Cobrar {formatCOP(tableTotal)}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenTableOrder(table.id)}
                              className="flex-1 py-2 rounded-xl bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1 transition-all active:scale-95 cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>+ Sumar Vaso</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleClearSpecificTableCart(table.id)}
                              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                              title="Vaciar todos los vasos de la mesa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Empty Table: Big Action Button + Option to Delete Card */
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenTableOrder(table.id)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-[0_0_20px_rgba(0,242,254,0.3)] active:scale-95 transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>➕ Sumar Pedido a esta Mesa</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDirectDeleteTable(table.id, e)}
                            className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            ✕ Eliminar Tarjeta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 4. MODAL INTERACTIVO DE PEDIDO & COBRO DE LA MESA */}
      {isTableOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-950 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.25)] my-auto max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                  <SlushCupIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                      Atendiendo a: {currentTable.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                      {totalGranizadosInCurrentTable} en cuenta
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {currentStep === 1 && 'Paso 1: Selecciona el tamaño del vaso'}
                    {currentStep === 2 && 'Paso 2: Selecciona el sabor del granizado'}
                    {currentStep === 3 && 'Paso 3: Elige toppings o adicionales'}
                    {currentStep === 4 && 'Paso 4: Nombre del cliente y cobro de la cuenta'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsTableOrderModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Cerrar ventana (el pedido permanece guardado en la mesa)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 4-Step Guided Tabs Header inside modal */}
            <div className="grid grid-cols-4 gap-2 my-3 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center space-x-1 ${
                  currentStep === 1
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>1. Vaso ({selectedSize})</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center space-x-1 ${
                  currentStep === 2
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>2. Sabor</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center space-x-1 ${
                  currentStep === 3
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>3. Toppings</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center space-x-1 ${
                  currentStep === 4
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : tableCart.length > 0
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                <span>4. Cobrar ({formatCOP(total)})</span>
              </button>
            </div>

            {/* Modal Body: Active Step View */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* PASO 1: TAMAÑO DEL VASO */}
              {currentStep === 1 && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                      ¿Qué tamaño de vaso para {currentTable.name}?
                    </h3>
                    <p className="text-xs text-slate-400">
                      Toca un tamaño para avanzar inmediatamente a la selección de sabor
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                    {(['12oz', '14oz', '16oz'] as GranizadoSize[]).map((sizeKey) => {
                      const config = sizeConfigs[sizeKey] || SIZE_CONFIGS[sizeKey];
                      const isSelected = selectedSize === sizeKey;
                      const cupItem = inventory.find(
                        (i) =>
                          i.category === 'vasos' &&
                          (i.id === config?.cupStockKey ||
                            i.sizeId === sizeKey ||
                            i.id === `vaso-${sizeKey}` ||
                            i.name.toLowerCase().includes(sizeKey.toLowerCase()))
                      );
                      const outOfStock = cupItem ? cupItem.stock <= 0 : false;

                      return (
                        <button
                          key={sizeKey}
                          type="button"
                          onClick={() => handleSelectSize(sizeKey)}
                          className={`relative p-5 sm:p-6 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-between group active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-b from-cyan-950 to-slate-900 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.35)] ring-2 ring-cyan-400 scale-[1.02]'
                              : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900'
                          }`}
                        >
                          {sizeKey === '14oz' && (
                            <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-black text-[9px] tracking-wider uppercase">
                              ⭐ Más Vendido
                            </span>
                          )}

                          <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform mb-3">
                            <SlushCupIcon
                              className={
                                sizeKey === '12oz'
                                  ? 'w-7 h-7'
                                  : sizeKey === '14oz'
                                  ? 'w-9 h-9 text-cyan-300'
                                  : 'w-11 h-11 text-cyan-200'
                              }
                            />
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-2xl font-black text-white font-mono block">
                              {sizeKey}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                              {config?.name || `Granizado ${sizeKey}`}
                            </span>
                          </div>

                          <div className="mt-4 w-full pt-3 border-t border-slate-800">
                            <span className="text-lg font-black text-cyan-400 font-mono block">
                              {formatCOP(config?.price || 12000)}
                            </span>
                            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-cyan-300 mt-1 group-hover:underline">
                              <span>Elegir tamaño</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>

                          {outOfStock && (
                            <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex items-center justify-center p-2">
                              <span className="text-xs font-black text-rose-400 uppercase">Sin Stock</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 2: SABOR DEL GRANIZADO */}
              {currentStep === 2 && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Cambiar Vaso ({selectedSize})</span>
                    </button>
                    <span className="text-xs text-cyan-300 font-mono font-bold">
                      {selectedSize} • {formatCOP(selectedConfig?.price || 12000)}
                    </span>
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                      ¿Qué Sabor Desea el Cliente?
                    </h3>
                    <p className="text-xs text-slate-400">
                      Toca un sabor para avanzar directamente a los toppings o adicionales
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {availableFlavors.map((flavor) => {
                      const isSelected = primaryFlavorId === flavor.id;
                      const isSecondary = enableMix && secondaryFlavorId === flavor.id;
                      const lower = flavor.name.toLowerCase();
                      const emoji = lower.includes('mora')
                        ? '🫐'
                        : lower.includes('fresa')
                        ? '🍓'
                        : lower.includes('limon') || lower.includes('limón')
                        ? '🍋'
                        : lower.includes('mango')
                        ? '🥭'
                        : lower.includes('maracu')
                        ? '🍈'
                        : lower.includes('uva')
                        ? '🍇'
                        : '🍧';

                      return (
                        <button
                          key={flavor.id}
                          type="button"
                          onClick={() => {
                            if (enableMix && primaryFlavorId && primaryFlavorId !== flavor.id) {
                              sounds.playClick();
                              setSecondaryFlavorId(flavor.id);
                            } else {
                              handleSelectFlavor(flavor.id);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between group active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-b from-cyan-950 to-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.35)] ring-1 ring-cyan-400'
                              : isSecondary
                              ? 'bg-gradient-to-b from-fuchsia-950 to-slate-900 border-fuchsia-400 ring-1 ring-fuchsia-400'
                              : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-2xl">{emoji}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[9px] font-black">
                                ✓
                              </span>
                            )}
                            {isSecondary && (
                              <span className="w-4 h-4 rounded-full bg-fuchsia-400 text-slate-950 flex items-center justify-center text-[9px] font-black">
                                2
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5">
                            <span className="text-xs font-black text-white block group-hover:text-cyan-300 transition-colors">
                              {flavor.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              Stock: {flavor.stock} {flavor.unit}
                            </span>
                          </div>

                          <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                            <span className="text-cyan-400 font-semibold group-hover:underline">
                              {isSelected ? 'Seleccionado' : 'Elegir'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mix Toggle */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableMix}
                        onChange={(e) => {
                          sounds.playClick();
                          setEnableMix(e.target.checked);
                          if (!e.target.checked) setSecondaryFlavorId(primaryFlavorId);
                        }}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-400"
                      />
                      <span className="font-bold text-slate-300">
                        ¿Combinar 2 sabores? (Mitad y Mitad)
                      </span>
                    </label>

                    {enableMix && (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setCurrentStep(3);
                        }}
                        disabled={!primaryFlavorId}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black text-xs transition-all shadow-[0_0_12px_rgba(255,0,127,0.3)] active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        Continuar con Mezcla ➔
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 3: TOPPINGS O ADICIONALES */}
              {currentStep === 3 && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Cambiar Sabor ({primaryFlavor.name})</span>
                    </button>
                    <span className="text-xs text-cyan-300 font-bold">
                      {selectedSize} • {primaryFlavor.name}
                      {enableMix && secondaryFlavor ? ` + ${secondaryFlavor.name}` : ''}
                    </span>
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                      ¿Desea algún Adicional o Topping?
                    </h3>
                    <p className="text-xs text-slate-400">
                      Selecciona los toppings opcionales o avanza directamente a cobrar / guardar
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {availableToppings.map((topping: Topping) => {
                      const isSelected = selectedToppings.some((t) => t.id === topping.id);
                      return (
                        <button
                          key={topping.id}
                          type="button"
                          onClick={() => toggleTopping(topping)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between group active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-fuchsia-950 to-slate-900 border-fuchsia-400 shadow-[0_0_15px_rgba(255,0,127,0.3)] ring-1 ring-fuchsia-400'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black transition-all ${
                                isSelected
                                  ? 'bg-fuchsia-500 text-white shadow-[0_0_6px_#D946EF]'
                                  : 'border border-slate-700 bg-slate-900 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {topping.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-cyan-400">
                                +{formatCOP(topping.price)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quantity and Notes */}
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs font-bold text-slate-300">Cantidad:</span>
                      <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setQuantity((q) => Math.max(1, q - 1));
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-black text-xs text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setQuantity((q) => q + 1);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="Observación opcional (ej: bien frío)..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Action Button: Advance to Step 4 (Cobro / Resumen) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddCurrentItemToTableCart(4)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(0,242,254,0.35)] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span>
                        {selectedToppings.length === 0
                          ? 'Continuar a Cobro / Resumen (Sin Adicionales)'
                          : `Continuar a Cobro con ${selectedToppings.length} Adicional${selectedToppings.length === 1 ? '' : 'es'} (${formatCOP(currentItemUnitPrice * quantity)})`}
                      </span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 4: NOMBRE DEL CLIENTE Y COBRO ("y pues que en esa tarjeta se pueda cobrar o algo") */}
              {currentStep === 4 && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                      Cobro y Facturación de {currentTable.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Verifica el nombre del cliente, el pedido y confirma el cobro
                    </p>
                  </div>

                  {/* Nombre del Cliente (Obligatorio) */}
                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/50 space-y-2.5">
                    <label className="flex items-center justify-between text-xs font-black text-cyan-300 uppercase tracking-wider">
                      <span className="flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-cyan-400" />
                        <span>Nombre del Cliente (Obligatorio para Facturar) *</span>
                      </span>
                      {customerNameInput.trim() ? (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Nombre listo</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold text-[11px]">Requerido</span>
                      )}
                    </label>

                    <input
                      type="text"
                      value={customerNameInput}
                      onChange={(e) => {
                        setCustomerNameInput(e.target.value);
                        if (checkoutError) setCheckoutError(null);
                      }}
                      placeholder="Escribe el nombre del cliente..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyan-400/50 text-white font-bold text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />

                    <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Sugerencias:</span>
                      {[currentTable.name, 'Mostrador', 'Para Llevar', 'Cliente Frecuente', 'Domicilio'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setCustomerNameInput(chip);
                            if (checkoutError) setCheckoutError(null);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resumen de Granizados en esta Mesa */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-800">
                      <span>Granizados en la mesa ({totalGranizadosInCurrentTable})</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold normal-case text-xs inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Sumar Otro Vaso</span>
                      </button>
                    </div>

                    {tableCart.length === 0 ? (
                      <div className="text-center py-5 text-slate-400 text-xs space-y-2.5">
                        <p className="text-slate-300 font-semibold">No hay vasos en esta comanda.</p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            ➕ Sumar un Vaso
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDirectDeleteTable(currentTable.id);
                              setIsTableOrderModalOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            ✕ Eliminar Tarjeta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {tableCart.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-[9px]">
                                  {item.size}
                                </span>
                                <span className="font-bold text-white truncate">
                                  {item.flavorName}
                                  {item.secondaryFlavorName ? ` + ${item.secondaryFlavorName}` : ''}
                                </span>
                              </div>
                              {item.toppings.length > 0 && (
                                <div className="text-[10px] text-fuchsia-300 truncate">
                                  + {item.toppings.map((t) => t.name).join(', ')}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => updateTableCartQty(item.id, -1)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 flex items-center justify-center font-black text-xs cursor-pointer transition-colors"
                                  title="Quitar 1 vaso"
                                >
                                  -
                                </button>
                                <span className="px-1.5 font-mono font-bold text-white text-[11px]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateTableCartQty(item.id, 1)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 flex items-center justify-center font-black text-xs cursor-pointer transition-colors"
                                  title="Sumar 1 vaso"
                                >
                                  +
                                </button>
                              </div>

                              <span className="font-mono font-bold text-cyan-300 min-w-[60px] text-right text-xs">
                                {formatCOP(item.unitPrice * item.quantity)}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeTableCartItem(item.id)}
                                className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 cursor-pointer"
                                title="Quitar vaso completo"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Quitar</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Método de Pago & Devuelta */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Método de Pago:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Efectivo', 'Nequi / Daviplata', 'Tarjeta / Datáfono'] as PaymentMethod[]).map(
                          (method) => {
                            const isSelected = paymentMethod === method;
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setPaymentMethod(method);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                {method === 'Efectivo' && <span>💵 Efectivo</span>}
                                {method === 'Nequi / Daviplata' && <span>📱 Nequi</span>}
                                {method === 'Tarjeta / Datáfono' && <span>💳 Tarjeta</span>}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {paymentMethod === 'Efectivo' && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Monto recibido:</span>
                          <div className="flex items-center space-x-1">
                            {[10000, 20000, 50000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => handleQuickCash(amt)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[9px] font-bold cursor-pointer"
                              >
                                {amt / 1000}k
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleQuickCash(total)}
                              className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold cursor-pointer"
                            >
                              Exacto
                            </button>
                          </div>
                        </div>

                        <input
                          type="number"
                          value={amountPaidInput}
                          onChange={(e) => setAmountPaidInput(e.target.value)}
                          placeholder={`Ej. ${total}`}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
                        />

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-400">Devuelta / Cambio:</span>
                          <span
                            className={`font-mono text-sm font-black ${
                              cashAmountReceived >= total ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {cashAmountReceived >= total
                              ? formatCOP(changeDue)
                              : `Falta ${formatCOP(total - cashAmountReceived)}`}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <span className="text-xs uppercase font-bold text-slate-300">Total a Pagar:</span>
                      <span className="text-xl font-black text-cyan-400 font-mono">
                        {formatCOP(total)}
                      </span>
                    </div>
                  </div>

                  {/* Error display */}
                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2 animate-pulse">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span className="font-bold">{checkoutError}</span>
                    </div>
                  )}

                  {/* Action Buttons: FACTURAR Y COBRAR vs GUARDAR A LA MESA */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleProcessCheckout}
                      disabled={tableCart.length === 0}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-base flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                      <span>⚡ FACTURAR Y COBRAR CUENTA ({formatCOP(total)})</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setIsTableOrderModalOpen(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
                      >
                        💾 Guardar y Dejar Mesa Abierta
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                      >
                        ➕ Sumar Otro Vaso a esta Mesa
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Stock warning toast */}
      {stockError && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-rose-950/90 border border-rose-500/70 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.4)] backdrop-blur-md flex items-center space-x-3 animate-in slide-in-from-bottom duration-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-xs font-bold">{stockError}</span>
          <button
            type="button"
            onClick={() => setStockError(null)}
            className="p-1 text-rose-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL 1: PANEL DE GESTIÓN DE CUENTAS ABIERTAS */}
      {isOpenAccountsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-950 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.25)] my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Panel de Gestión de Cuentas Abiertas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Control de pedidos en curso, comandas por cobrar y cuentas por cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenAccountsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 shrink-0">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cuentas</span>
                <span className="text-xl font-black text-cyan-300 font-mono">
                  {accountsSummary.totalAccounts}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-fuchsia-500/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Con Pedido Pendiente</span>
                <span className="text-xl font-black text-fuchsia-300 font-mono">
                  {accountsSummary.activeAccountsWithOrders}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Monto por Cobrar</span>
                <span className="text-xl font-black text-emerald-300 font-mono">
                  {formatCOP(accountsSummary.totalPendingAmount)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-sky-500/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Granizados en Espera</span>
                <span className="text-xl font-black text-sky-300 font-mono">
                  {accountsSummary.totalPendingGranizados}
                </span>
              </div>
            </div>

            {/* Filter Search + Fast Account Creator */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  placeholder="Buscar cuenta por nombre de cliente o pedido..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="button"
                onClick={() => handleCreateAccountByName()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(0,242,254,0.3)] whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Abrir Otra Cuenta</span>
              </button>
            </div>

            {/* Accounts List / Cards Grid */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {tables
                .filter((t) =>
                  t.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                  (t.customerName && t.customerName.toLowerCase().includes(accountSearchQuery.toLowerCase()))
                )
                .map((table) => {
                  const isCurrent = table.id === activeTableId;
                  const itemsCount = table.cart.reduce((s, i) => s + i.quantity, 0);
                  const isOccupied = itemsCount > 0;
                  const tableTotal = table.cart.reduce(
                    (s, i) => s + i.unitPrice * i.quantity,
                    0
                  );
                  const isRenaming = editingAccountId === table.id;

                  return (
                    <div
                      key={table.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.15)] ring-1 ring-cyan-500/50'
                          : isOccupied
                          ? 'bg-slate-900/80 border-fuchsia-500/40 hover:border-fuchsia-400'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Account Name and Status */}
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                autoFocus
                                value={editingAccountName}
                                onChange={(e) => setEditingAccountName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRenameAccount(table.id);
                                  if (e.key === 'Escape') setEditingAccountId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-400 text-xs text-white font-bold flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRenameAccount(table.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-black"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAccountId(null)}
                                className="p-1.5 text-slate-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-base font-black text-white">{table.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setEditingAccountId(table.id);
                                  setEditingAccountName(table.name);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                                title="Editar nombre de cliente"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase">
                                  Activa
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center space-x-3 mt-1 text-xs">
                            <span
                              className={`inline-flex items-center space-x-1.5 font-bold ${
                                isOccupied ? 'text-fuchsia-300' : 'text-emerald-400'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isOccupied
                                    ? 'bg-fuchsia-400 shadow-[0_0_6px_#D946EF] animate-pulse'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              <span>
                                {isOccupied
                                  ? `${itemsCount} ${itemsCount === 1 ? 'granizado en comanda' : 'granizados en comanda'}`
                                  : 'Cuenta abierta (sin pedidos)'}
                              </span>
                            </span>

                            {isOccupied && (
                              <span className="font-mono font-bold text-white text-sm">
                                Total: {formatCOP(tableTotal)}
                              </span>
                            )}
                          </div>

                          {/* Chips of items in comanda */}
                          {table.cart.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {table.cart.map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium"
                                >
                                  <span className="text-cyan-400 font-bold font-mono">
                                    {item.quantity}x
                                  </span>
                                  <span>{item.size}</span>
                                  <span className="text-white font-semibold">{item.flavorName}</span>
                                  {item.toppings.length > 0 && (
                                    <span className="text-fuchsia-300 text-[10px]">
                                      (+{item.toppings.length})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0">
                          {/* Atender comanda */}
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setActiveTableId(table.id);
                              setIsOpenAccountsModalOpen(false);
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors border border-slate-700"
                          >
                            <UtensilsCrossed className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Atender Comanda</span>
                          </button>

                          {/* Cobrar ahora */}
                          {isOccupied && (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setActiveTableId(table.id);
                                setIsOpenAccountsModalOpen(false);
                                setTimeout(() => {
                                  const el = document.getElementById('comanda-checkout-section');
                                  el?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Cobrar Ahora</span>
                            </button>
                          )}

                          {/* Vaciar comanda */}
                          {isOccupied && (
                            <button
                              type="button"
                              onClick={() => handleClearSpecificTableCart(table.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 border border-slate-800 transition-colors"
                              title="Vaciar comanda"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cerrar / Eliminar cuenta */}
                          {tables.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setAccountPendingDelete(table)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 transition-colors"
                              title="Cerrar y eliminar cuenta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR CERRAR Y ELIMINAR CUENTA */}
      {accountPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="flex items-center space-x-3 text-rose-400 pb-3 border-b border-slate-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                ¿Cerrar Cuenta de {accountPendingDelete.name}?
              </h3>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              ¿Estás seguro de cerrar y eliminar la cuenta <strong className="text-white">{accountPendingDelete.name}</strong>?
              {accountPendingDelete.cart.length > 0 && (
                <span className="block mt-2 text-rose-300 font-bold">
                  ⚠️ Esta cuenta tiene {accountPendingDelete.cart.length} productos en comanda sin cobrar.
                </span>
              )}
            </p>

            <div className="flex space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setAccountPendingDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Sí, Cerrar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AGREGAR NUEVA CUENTA POR NOMBRE */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,242,254,0.3)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-cyan-400">
                <PlusCircle className="w-5 h-5 text-cyan-300" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Abrir Cuenta por Nombre
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddTable} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nombre del Cliente o Pedido:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTableNameInput}
                  onChange={(e) => setNewTableNameInput(e.target.value)}
                  placeholder="Ej. Juan Carlos, Laura, Domicilio #1, Barra..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-bold"
                />
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  `Cliente ${tables.length + 1}`,
                  'Mostrador',
                  'Domicilio #1',
                  'Terraza',
                  'Barra',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNewTableNameInput(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors font-medium"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                >
                  Abrir Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR VACIAR COMANDA */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="flex items-center space-x-3 text-rose-400 pb-3 border-b border-slate-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                ¿Vaciar Comanda de {currentTable.name}?
              </h3>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              ¿Estás seguro de vaciar la cuenta actual de <strong className="text-white">{currentTable.name}</strong>? Se eliminarán los {tableCart.length} productos de la comanda sin cobrar.
            </p>

            <div className="flex space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteClearCurrentTable}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Sí, Vaciar Comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

