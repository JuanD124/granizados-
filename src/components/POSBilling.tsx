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
} from 'lucide-react';
import {
  CartItem,
  GranizadoSize,
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
  formatCOP,
  generateNextInvoiceNumber,
} from '../utils/billing';
import { sounds } from '../utils/audio';
import { SlushCupIcon } from './SlushCupIcon';

interface POSBillingProps {
  inventory: InventoryItem[];
  tables: TableSession[];
  onUpdateTables: (tables: TableSession[]) => void;
  onCompleteSale: (newSale: Sale, deductions: Record<string, number>) => void;
  currentRole: UserRole;
  cashierName: string;
  existingSales: Sale[];
  onViewInvoice: (sale: Sale) => void;
}

export const POSBilling: React.FC<POSBillingProps> = ({
  inventory,
  tables,
  onUpdateTables,
  onCompleteSale,
  currentRole,
  cashierName,
  existingSales,
  onViewInvoice,
}) => {
  // Active selected table (defaults to mesa-1)
  const [activeTableId, setActiveTableId] = useState<string>(tables[0]?.id || 'mesa-1');

  // Step-by-step breakdown: 1 = Tamaños, 2 = Sabores, 3 = Toppings & Cantidad (Finalizar)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // Find active table session
  const currentTable = tables.find((t) => t.id === activeTableId) || tables[0];
  const tableCart = currentTable?.cart || [];

  // Helper getters
  const selectedConfig = SIZE_CONFIGS[selectedSize];

  // Dynamic flavors derived directly from inventory
  const availableFlavors = inventory
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

  // Dynamic toppings / topics derived directly from inventory
  const availableToppings: Topping[] = inventory
    .filter((i) => i.category === 'toppings')
    .map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price ?? 1500,
      stockKey: i.id,
      portionUsed: i.portionUsed ?? (i.unit === 'g' ? 35 : 25),
      unit: i.unit || 'porciones',
    }));

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
    selectedToppings
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

  // Step 3: Add to Table's Ticket automatically and reset to Step 1
  const handleAddCurrentItemToTableCart = () => {
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

    // Update active table's cart
    const updatedTables = tables.map((t) => {
      if (t.id === activeTableId) {
        return {
          ...t,
          cart: [...t.cart, newItem],
          openedAt: t.openedAt || new Date().toISOString(),
        };
      }
      return t;
    });

    onUpdateTables(updatedTables);

    // Reset item builder state and return to Step 1 for next granizado
    setSelectedToppings([]);
    setItemNotes('');
    setQuantity(1);
    setEnableMix(false);
    setCurrentStep(1);
    setStockError(null);
  };

  // Add more tables dynamically via in-app modal
  const handleOpenAddTableModal = () => {
    sounds.playClick();
    setNewTableNameInput(`Mesa ${tables.length + 1}`);
    setIsAddTableModalOpen(true);
  };

  const handleConfirmAddTable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sounds.playClick();
    const trimmed = newTableNameInput.trim();
    if (!trimmed) return;

    const newTable: TableSession = {
      id: `mesa-${Date.now()}`,
      name: trimmed,
      cart: [],
    };
    onUpdateTables([...tables, newTable]);
    setActiveTableId(newTable.id);
    setIsAddTableModalOpen(false);
    setNewTableNameInput('');
  };

  // Cart operations for active table
  const updateTableCartQty = (itemId: string, delta: number) => {
    sounds.playClick();
    const updatedTables = tables.map((t) => {
      if (t.id === activeTableId) {
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
  };

  const removeTableCartItem = (itemId: string) => {
    sounds.playClick();
    const updatedTables = tables.map((t) => {
      if (t.id === activeTableId) {
        return { ...t, cart: t.cart.filter((item) => item.id !== itemId) };
      }
      return t;
    });
    onUpdateTables(updatedTables);
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
      setCheckoutError('La mesa seleccionada no tiene granizados en la cuenta.');
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
      const itemCost = calculateItemCostEstimate(item.size, item.toppings);
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
      tableName: currentTable.name,
      customerName: currentTable.customerName || undefined,
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

    // 6. Clear this table (liberar mesa)
    const updatedTables = tables.map((t) => {
      if (t.id === activeTableId) {
        return { ...t, cart: [], customerName: undefined, openedAt: undefined };
      }
      return t;
    });
    onUpdateTables(updatedTables);

    // 7. Open receipt if enabled
    if (autoOpenReceipt) {
      onViewInvoice(newSale);
    }

    // Reset cashier controls
    setAmountPaidInput('');
    setDiscountPercent(0);
  };

  const totalGranizadosInCurrentTable = tableCart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. SELECCIÓN Y GESTIÓN DE MESAS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 border border-cyan-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2 text-cyan-400">
            <UtensilsCrossed className="w-5 h-5 text-cyan-300" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Gestión de Mesas & Cuentas Abiertas
            </h2>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">
              Mesa activa:{' '}
              <strong className="text-cyan-300 font-bold">{currentTable.name}</strong>
            </span>
            <button
              type="button"
              onClick={handleOpenAddTableModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 font-bold transition-all shadow-[0_0_10px_rgba(0,242,254,0.2)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Agregar Mesa</span>
            </button>
          </div>
        </div>

        {/* Tables Carousel / Grid */}
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-1.5 pt-0.5">
          {tables.map((table) => {
            const isSelected = table.id === activeTableId;
            const itemsCount = table.cart.reduce((s, i) => s + i.quantity, 0);
            const isOccupied = itemsCount > 0;
            const tableTotal = table.cart.reduce(
              (s, i) => s + i.unitPrice * i.quantity,
              0
            );

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveTableId(table.id);
                  setCheckoutError(null);
                }}
                className={`flex-shrink-0 min-w-[130px] p-3 rounded-2xl border text-left transition-all duration-200 relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-950 to-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.35)] ring-1 ring-cyan-400 scale-[1.02]'
                    : isOccupied
                    ? 'bg-slate-950/90 border-fuchsia-500/50 hover:border-fuchsia-400'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{table.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOccupied
                        ? 'bg-fuchsia-400 shadow-[0_0_6px_#D946EF] animate-pulse'
                        : 'bg-emerald-400 shadow-[0_0_6px_#10B981]'
                    }`}
                  />
                </div>

                <div className="mt-2 flex items-baseline justify-between text-[11px]">
                  {isOccupied ? (
                    <>
                      <span className="text-fuchsia-300 font-bold font-mono">
                        {itemsCount} {itemsCount === 1 ? 'granizado' : 'granizados'}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {formatCOP(tableTotal)}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">
                      Libre
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DESGLOSE POR PASOS (PASO 1: TAMAÑOS -> PASO 2: SABORES -> PASO 3: TOPPINGS & CANTIDAD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: WIZARD BUILDER */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step Indicator Header */}
          <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                {/* Step 1 badge */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentStep === 1
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900/40 text-[10px] flex items-center justify-center font-black">
                    1
                  </span>
                  <span>1. Tamaño ({selectedSize})</span>
                </button>

                {/* Arrow */}
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

                {/* Step 2 badge */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentStep === 2
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900/40 text-[10px] flex items-center justify-center font-black">
                    2
                  </span>
                  <span>2. Sabor</span>
                </button>

                {/* Arrow */}
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

                {/* Step 3 badge */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentStep === 3
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900/40 text-[10px] flex items-center justify-center font-black">
                    3
                  </span>
                  <span>3. Toppings & Sumar</span>
                </button>
              </div>
            </div>

            {/* Price indicator preview */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Precio unitario:
              </span>
              <span className="text-base font-black text-cyan-300 font-mono">
                {formatCOP(currentItemUnitPrice)}
              </span>
            </div>
          </div>

          {/* STEP 1: SELECCIÓN DE LOS 3 TAMAÑOS CON SU PRECIO */}
          {currentStep === 1 && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-cyan-500/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs">
                      1
                    </span>
                    Elige el Tamaño del Granizado
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Al seleccionar un tamaño se desglosará automáticamente a los sabores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {(['12oz', '14oz', '16oz'] as GranizadoSize[]).map((sizeKey) => {
                  const config = SIZE_CONFIGS[sizeKey];
                  const isSelected = selectedSize === sizeKey;
                  const cupItem = inventory.find(
                    (i) =>
                      i.category === 'vasos' &&
                      (i.id === config.cupStockKey ||
                        i.sizeId === sizeKey ||
                        i.id === `vaso-${sizeKey}` ||
                        i.name.toLowerCase().includes(sizeKey.toLowerCase()))
                  );
                  const stockQty = cupItem?.stock ?? 0;
                  const isLow = stockQty <= (cupItem?.minStock ?? 20);

                  return (
                    <button
                      key={sizeKey}
                      type="button"
                      onClick={() => handleSelectSize(sizeKey)}
                      className={`relative p-5 rounded-3xl border text-left transition-all duration-200 flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-gradient-to-b from-cyan-950 via-slate-900 to-slate-950 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.4)] scale-[1.03]'
                          : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                            {config.ounces} onz
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {sizeKey === '12oz' ? 'Pequeño' : sizeKey === '14oz' ? 'Mediano' : 'Grande'}
                          </span>
                        </div>

                        {/* Large Official Price */}
                        <div className="mt-4 text-2xl font-black text-cyan-300 font-mono tracking-tight">
                          {formatCOP(config.price)}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1">
                          {config.iceGrams}g hielo • {config.syrupMl}ml pulpa
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Vasos en stock:</span>
                        <span
                          className={`font-mono font-bold ${
                            stockQty <= 0
                              ? 'text-rose-500'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {stockQty} uds
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-center py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                        <span>Seleccionar {config.ounces} onz</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: DESGLOSE DE SABORES */}
          {currentStep === 2 && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-cyan-500/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs">
                      2
                    </span>
                    Elige el Sabor del Granizado ({selectedSize})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecciona el sabor deseado para avanzar a los adicionales.
                  </p>
                </div>

                {/* Back to Size button */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar Tamaño</span>
                </button>
              </div>

              {/* Mix 50/50 toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-300 font-semibold">
                  ¿Deseas combinar dos sabores?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setEnableMix(!enableMix);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    enableMix
                      ? 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{enableMix ? 'Mezcla 50/50 Activa' : 'Combinar 2 Sabores'}</span>
                </button>
              </div>

              {/* Primary Flavors Grid */}
              {availableFlavors.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
                  <Droplet className="w-8 h-8 text-cyan-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No hay sabores registrados en el inventario</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Los insumos anteriores fueron retirados. Como Administrador, puedes agregar sabores desde la sección <strong>Insumos</strong> o <strong>Panel Admin</strong>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableFlavors.map((flavor) => {
                    const isSelected = (activePrimaryFlavor?.id === flavor.id) || (primaryFlavorId === flavor.id);

                    return (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleSelectFlavor(flavor.id)}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-slate-950 border-cyan-400 shadow-[0_0_18px_rgba(0,242,254,0.4)] ring-1 ring-cyan-400'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor: flavor.color,
                              boxShadow: `0 0 10px ${flavor.color}`,
                            }}
                          />
                          <span className="text-xs font-bold text-white truncate">
                            {flavor.name}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 flex justify-between font-mono">
                          <span>Stock:</span>
                          <span>{flavor.stock} {flavor.unit}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Secondary Flavor picker if Mix is enabled */}
              {enableMix && availableFlavors.length > 1 && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-fuchsia-400 block">
                    Elige el Segundo Sabor para la Mitad (50%):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableFlavors.filter((f) => f.id !== (activePrimaryFlavor?.id || primaryFlavorId)).map((flavor) => {
                      const isSelected = secondaryFlavorId === flavor.id;
                      return (
                        <button
                          key={flavor.id}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setSecondaryFlavorId(flavor.id);
                          }}
                          className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center space-x-2 ${
                            isSelected
                              ? 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.3)]'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: flavor.color }}
                          />
                          <span className="truncate">{flavor.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(0,242,254,0.3)] inline-flex items-center gap-1.5"
                    >
                      <span>Continuar a Toppings</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ADICIONALES, TOPPINGS Y CANTIDAD (FINALIZA Y SUMA AL TICKET) */}
          {currentStep === 3 && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-cyan-500/30 shadow-2xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs">
                      3
                    </span>
                    Adicionales, Toppings & Cantidad
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Personaliza con toppings opcionales y selecciona la cantidad para sumar al ticket.
                  </p>
                </div>

                {/* Back to Flavors */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar Sabor</span>
                </button>
              </div>

              {/* Toppings Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                  Toppings & Adicionales (Opcionales):
                </label>
                {availableToppings.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <p className="text-xs text-slate-400">
                      Sin topics o adicionales registrados. Puedes continuar seleccionando la cantidad y sumar al ticket.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {availableToppings.map((topping) => {
                      const isSelected = selectedToppings.some((t) => t.id === topping.id);
                      const toppingItem = inventory.find((i) => i.id === topping.stockKey || i.id === topping.id);
                      const toppingStock = toppingItem?.stock ?? 0;

                      return (
                        <button
                          key={topping.id}
                          type="button"
                          onClick={() => toggleTopping(topping)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-fuchsia-950 to-slate-900 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">{topping.name}</span>
                            <span className="text-xs font-mono font-bold text-fuchsia-400">
                              +{formatCOP(topping.price)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                            <span>Stock:</span>
                            <span>{toppingStock} {topping.unit}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cantidad Selector */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Cantidad a sumar a {currentTable.name}:
                  </label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setQuantity(val);
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                          quantity === val
                            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,242,254,0.4)]'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setQuantity((prev) => Math.max(1, prev - 1));
                      }}
                      className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-mono font-black text-xl text-cyan-300">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setQuantity((prev) => prev + 1);
                      }}
                      className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Total de este granizado:
                    </span>
                    <div className="text-xl font-black text-white font-mono">
                      {formatCOP(currentItemUnitPrice * quantity)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón Finalizar: Sumar automáticamente al ticket de la mesa */}
              <button
                type="button"
                onClick={handleAddCurrentItemToTableCart}
                disabled={isCupOutOfStock}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>SUMAR AL TICKET DE {currentTable.name.toUpperCase()}</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE TICKET FOR ACTIVE TABLE & CHECKOUT */}
        <div id="comanda-checkout-section" className="lg:col-span-5 space-y-6 scroll-mt-24">
          <div className="bg-slate-900/95 rounded-3xl p-6 border border-cyan-500/30 shadow-2xl relative">
            {/* Ticket Header with Table Name */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Cuenta: {currentTable.name}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {totalGranizadosInCurrentTable} {totalGranizadosInCurrentTable === 1 ? 'granizado en comanda' : 'granizados en comanda'}
                  </span>
                </div>
              </div>

              {tableCart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 text-[10px] font-bold flex items-center gap-1 transition-colors border border-slate-800 hover:border-rose-500/30"
                  title="Liberar mesa y vaciar comanda"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Liberar Mesa</span>
                </button>
              )}
            </div>

            {/* Optional Customer Name Input for table */}
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                Nombre del Cliente en {currentTable.name} (Opcional):
              </label>
              <input
                type="text"
                value={currentTable.customerName || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const updatedTables = tables.map((t) =>
                    t.id === activeTableId ? { ...t, customerName: val } : t
                  );
                  onUpdateTables(updatedTables);
                }}
                placeholder="Ej. Juan Pérez / Pareja mesa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Cart Items List */}
            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
              {tableCart.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  <SlushCupIcon size={40} className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-slate-400">Esta mesa no tiene pedidos aún.</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Selecciona tamaño, sabor y toppings a la izquierda para sumar granizados.
                  </p>
                </div>
              ) : (
                tableCart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold font-mono">
                          {item.size}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {item.flavorName}
                          {item.secondaryFlavorName && ` + ${item.secondaryFlavorName}`}
                        </span>
                      </div>
                      {item.toppings.length > 0 && (
                        <div className="text-[10px] text-fuchsia-300 truncate mt-0.5">
                          + {item.toppings.map((t) => t.name).join(', ')}
                        </div>
                      )}
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {formatCOP(item.unitPrice)} c/u
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center space-x-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateTableCartQty(item.id, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                        aria-label="Restar unidad"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold font-mono text-cyan-300">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateTableCartQty(item.id, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                        aria-label="Sumar unidad"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <div className="text-xs font-bold font-mono text-white">
                        {formatCOP(item.unitPrice * item.quantity)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTableCartItem(item.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                      title="Eliminar del ticket"
                      aria-label="Eliminar del ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({totalGranizadosInCurrentTable} granizados):</span>
                <span className="font-mono text-slate-200">{formatCOP(subtotal)}</span>
              </div>

              {/* Discount Selector */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Descuento aplicado:</span>
                <div className="flex space-x-1">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setDiscountPercent(pct);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                        discountPercent === pct
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {discountPercent > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Ahorro ({discountPercent}%):</span>
                  <span className="font-mono">-{formatCOP(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-sm font-black text-white uppercase">Total Cuenta:</span>
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-white font-mono">
                  {formatCOP(total)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Medio de Pago para {currentTable.name}:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'Nequi / Daviplata', label: 'Nequi / Davi', icon: Smartphone },
                  { id: 'Tarjeta / Datáfono', label: 'Tarjeta', icon: CreditCard },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setPaymentMethod(id as PaymentMethod);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 text-xs font-bold transition-all ${
                      paymentMethod === id
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Calculator */}
            {paymentMethod === 'Efectivo' && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Efectivo Recibido:</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(total)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                    >
                      Exacto
                    </button>
                    {total <= 12000 && (
                      <button
                        type="button"
                        onClick={() => handleQuickCash(12000)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                      >
                        $12k
                      </button>
                    )}
                    {total <= 14000 && (
                      <button
                        type="button"
                        onClick={() => handleQuickCash(14000)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                      >
                        $14k
                      </button>
                    )}
                    {total <= 16000 && (
                      <button
                        type="button"
                        onClick={() => handleQuickCash(16000)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                      >
                        $16k
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuickCash(20000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                    >
                      $20k
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(50000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                    >
                      $50k
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(100000)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono font-bold"
                    >
                      $100k
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder={`Ej. ${total || 20000}`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-slate-400 font-semibold">Devuelta / Cambio:</span>
                  <span
                    className={`font-mono text-base font-bold ${
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

            {/* Error Message */}
            {checkoutError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Final Action Button: Cobrar y Facturar Mesa */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleProcessCheckout}
                disabled={tableCart.length === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-base flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                <span>FACTURAR Y COBRAR {currentTable.name.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar: fast access to active table comanda and billing on phones */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-2.5 bg-slate-950/95 border-t border-cyan-500/30 backdrop-blur-md shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5 text-xs text-slate-300">
              <span className="font-bold text-white truncate">{currentTable.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-semibold">{totalGranizadosInCurrentTable} {totalGranizadosInCurrentTable === 1 ? 'granizado' : 'granizados'}</span>
            </div>
            <div className="text-base font-black text-white font-mono leading-tight">
              {formatCOP(total)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              const el = document.getElementById('comanda-checkout-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,242,254,0.4)] flex items-center space-x-1.5 whitespace-nowrap active:scale-95 transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{tableCart.length > 0 ? 'Ver Cuenta / Cobrar' : 'Ver Comanda'}</span>
          </button>
        </div>
      </div>

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

      {/* Modal: Agregar Nueva Mesa */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,242,254,0.3)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-cyan-400">
                <PlusCircle className="w-5 h-5 text-cyan-300" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Agregar Nueva Mesa
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
                  Nombre o Identificador de Mesa:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTableNameInput}
                  onChange={(e) => setNewTableNameInput(e.target.value)}
                  placeholder="Ej. Mesa 6, Terraza 2, Barra..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-bold"
                />
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  `Mesa ${tables.length + 1}`,
                  `Mesa ${tables.length + 2}`,
                  'Terraza',
                  'Barra',
                  'Zona VIP',
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
                  disabled={!newTableNameInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)] disabled:opacity-50"
                >
                  Crear Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Vaciar/Liberar Mesa */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="flex items-center space-x-3 text-rose-400 pb-3 border-b border-slate-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                ¿Liberar {currentTable.name}?
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
                Sí, Vaciar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
