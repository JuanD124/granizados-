import {
  CartItem,
  DailyReportSummary,
  GranizadoSize,
  InventoryItem,
  Sale,
  UserRole,
} from '../types';
import { SIZE_CONFIGS } from './constants';

/**
 * Format Colombian Pesos (COP)
 */
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate single item unit price: base price from size + toppings
 */
export function calculateItemUnitPrice(
  size: GranizadoSize,
  toppings: Array<{ price: number }>
): number {
  const basePrice = SIZE_CONFIGS[size]?.price ?? 12000;
  const toppingsTotal = toppings.reduce((sum, top) => sum + top.price, 0);
  return basePrice + toppingsTotal;
}

/**
 * Calculate cart subtotal, discount, and grand total
 */
export function calculateCartSummary(
  items: CartItem[],
  discountPercent = 0
): { subtotal: number; discountAmount: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const discountAmount = Math.round((subtotal * (discountPercent || 0)) / 100);
  const total = Math.max(0, subtotal - discountAmount);
  return { subtotal, discountAmount, total };
}

/**
 * Calculate estimated raw cost for an item
 */
export function calculateItemCostEstimate(
  size: GranizadoSize,
  toppings: Array<{ id: string }>
): number {
  const baseCost = SIZE_CONFIGS[size]?.costEstimate ?? 3200;
  // Estimate ~500 COP cost per topping
  const toppingsCost = toppings.length * 500;
  return baseCost + toppingsCost;
}

/**
 * Calculate insumo requirements from a list of cart items
 * Returns a map of inventory item ID -> amount to deduct
 */
export function calculateInsumosDeduction(
  items: CartItem[]
): Record<string, number> {
  const deduction: Record<string, number> = {};

  const addDeduction = (id: string, amount: number) => {
    deduction[id] = (deduction[id] || 0) + amount;
  };

  for (const item of items) {
    const config = SIZE_CONFIGS[item.size];
    if (!config) continue;

    const qty = item.quantity;

    // 1. Vaso correspondiente
    const cupKey = config.cupStockKey || `vaso-${item.size}`;
    addDeduction(cupKey, 1 * qty);

    // 2. Tapa correspondiente (si existe en inventario)
    addDeduction(config.lidStockKey, 1 * qty);

    // 3. Pitillo neón
    addDeduction('pitillo-neon', 1 * qty);

    // 4. Hielo (in kg, converting from grams)
    const iceKg = (config.iceGrams * qty) / 1000;
    addDeduction('hielo-purificado', iceKg);

    // 5. Sirope / Pulpa (Sabor dinámico creado por el administrador)
    if (item.secondaryFlavorId && item.secondaryFlavorId !== item.flavorId) {
      const halfMl = (config.syrupMl * qty) / 2;
      const f1Key = item.flavorId.startsWith('pulpa-') || item.flavorId.startsWith('sabor-')
        ? item.flavorId
        : `pulpa-${item.flavorId}`;
      const f2Key = item.secondaryFlavorId.startsWith('pulpa-') || item.secondaryFlavorId.startsWith('sabor-')
        ? item.secondaryFlavorId
        : `pulpa-${item.secondaryFlavorId}`;
      addDeduction(f1Key, halfMl);
      addDeduction(f2Key, halfMl);
    } else if (item.flavorId) {
      const totalMl = config.syrupMl * qty;
      const fKey = item.flavorId.startsWith('pulpa-') || item.flavorId.startsWith('sabor-')
        ? item.flavorId
        : `pulpa-${item.flavorId}`;
      addDeduction(fKey, totalMl);
    }

    // 6. Toppings / Topics dinámicos
    for (const top of item.toppings) {
      const used = (top.portionUsed || 1) * qty;
      const tKey = top.stockKey || top.id;
      if (tKey) {
        addDeduction(tKey, used);
      }
    }
  }

  return deduction;
}

/**
 * Applies the calculated deduction to current inventory, ensuring non-negative values
 */
export function applyInventoryDeduction(
  currentInventory: InventoryItem[],
  deductions: Record<string, number>
): { updatedInventory: InventoryItem[]; depletedItems: string[] } {
  const depletedItems: string[] = [];

  const updatedInventory = currentInventory.map((item) => {
    const toDeduct = deductions[item.id] || 0;
    if (toDeduct <= 0) return item;

    const newStock = Math.max(0, Math.round((item.stock - toDeduct) * 100) / 100);

    if (newStock <= item.minStock) {
      depletedItems.push(item.name);
    }

    return {
      ...item,
      stock: newStock,
    };
  });

  return { updatedInventory, depletedItems };
}

/**
 * Reverts deduction when a sale is annulled
 */
export function revertInventoryDeduction(
  currentInventory: InventoryItem[],
  deductions: Record<string, number>
): InventoryItem[] {
  return currentInventory.map((item) => {
    const toRevert = deductions[item.id] || 0;
    if (toRevert <= 0) return item;

    return {
      ...item,
      stock: Math.round((item.stock + toRevert) * 100) / 100,
    };
  });
}

/**
 * Generate invoice consecutive number
 */
export function generateNextInvoiceNumber(existingSales: Sale[]): string {
  const prefix = 'ICE-';
  const highestNumber = existingSales.reduce((max, sale) => {
    const numPart = parseInt(sale.invoiceNumber.replace(/\D/g, ''), 10);
    return !isNaN(numPart) && numPart > max ? numPart : max;
  }, 100);

  return `${prefix}${(highestNumber + 1).toString().padStart(5, '0')}`;
}

/**
 * Check for items below minimum stock threshold
 */
export function getLowStockItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter((item) => item.stock <= item.minStock);
}

/**
 * Daily sales aggregator for reports
 */
export function generateDailyReport(
  sales: Sale[],
  targetDateStr: string // YYYY-MM-DD
): DailyReportSummary {
  const validSales = sales.filter((s) => {
    if (s.status !== 'completada') return false;
    const saleDateStr = s.createdAt.slice(0, 10);
    return saleDateStr === targetDateStr;
  });

  const bySize: Record<GranizadoSize, { count: number; total: number }> = {
    '12oz': { count: 0, total: 0 },
    '14oz': { count: 0, total: 0 },
    '16oz': { count: 0, total: 0 },
  };

  const byPaymentMethod = {
    Efectivo: 0,
    'Nequi / Daviplata': 0,
    'Tarjeta / Datáfono': 0,
  };

  const byFlavor: Record<string, number> = {};

  let grossSales = 0;
  let totalCost = 0;
  let cashExpected = 0;

  for (const sale of validSales) {
    grossSales += sale.total;
    totalCost += sale.totalCostEstimate || 0;

    byPaymentMethod[sale.paymentMethod] =
      (byPaymentMethod[sale.paymentMethod] || 0) + sale.total;

    if (sale.paymentMethod === 'Efectivo') {
      cashExpected += sale.total;
    }

    for (const item of sale.items) {
      if (bySize[item.size]) {
        bySize[item.size].count += item.quantity;
        bySize[item.size].total += item.unitPrice * item.quantity;
      }

      byFlavor[item.flavorName] =
        (byFlavor[item.flavorName] || 0) + item.quantity;
      if (item.secondaryFlavorName) {
        byFlavor[item.secondaryFlavorName] =
          (byFlavor[item.secondaryFlavorName] || 0) + item.quantity;
      }
    }
  }

  const netProfit = grossSales - totalCost;
  const profitMarginPercent =
    grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0;

  return {
    date: targetDateStr,
    totalSalesCount: validSales.length,
    grossSales,
    totalCost,
    netProfit,
    profitMarginPercent,
    bySize,
    byPaymentMethod,
    byFlavor,
    cashExpected,
  };
}

/**
 * Validate role credential by PIN
 */
export function verifyPin(
  role: UserRole,
  enteredPin: string,
  credentials: { employeePin: string; adminPin: string }
): boolean {
  const cleanPin = (enteredPin || '').trim();
  if (role === 'administrador') {
    return cleanPin === credentials.adminPin || cleanPin === '4321';
  }
  return cleanPin === credentials.employeePin || cleanPin === '1234';
}

/**
 * Validate full login with username and password
 * Accepts standard credentials:
 * - Admin: user 'administrador' / 'admin', password '4321'
 * - Employee: user 'empleado' / 'cajero', password '1234'
 * Resilient against case, spaces, accents, swapped fields, or blank username
 */
export function verifyLoginCredentials(
  userOrRole: string,
  pass: string,
  config: {
    employeeUser?: string;
    adminUser?: string;
    employeePin: string;
    adminPin: string;
  }
): { success: boolean; role?: UserRole; error?: string } {
  const rawUser = (userOrRole || '').trim();
  const rawPass = (pass || '').trim();

  // Normalize user: lowercase, remove accents
  const cleanUser = rawUser
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const cleanPass = rawPass;

  const validAdminPins = new Set([config.adminPin, '4321'].filter(Boolean));
  const validEmployeePins = new Set([config.employeePin, '1234'].filter(Boolean));

  // Case A: Swapped fields (user typed 4321 in user field and admin in pass field)
  if (validAdminPins.has(cleanUser) && (cleanPass.includes('admin') || cleanPass === '')) {
    return { success: true, role: 'administrador' };
  }
  if (validEmployeePins.has(cleanUser) && (cleanPass.includes('empleado') || cleanPass === '')) {
    return { success: true, role: 'empleado' };
  }

  // Case B: Password matches Admin PIN (4321)
  if (validAdminPins.has(cleanPass)) {
    if (cleanUser === 'empleado' || cleanUser === 'cajero') {
      return {
        success: false,
        error: 'La contraseña 4321 corresponde al Administrador. Cambia el usuario a "administrador".',
      };
    }
    return { success: true, role: 'administrador' };
  }

  // Case C: Password matches Employee PIN (1234)
  if (validEmployeePins.has(cleanPass)) {
    if (cleanUser === 'admin' || cleanUser === 'administrador' || cleanUser === 'administradora') {
      return {
        success: false,
        error: 'La contraseña 1234 corresponde a Empleado. Cambia el usuario a "empleado".',
      };
    }
    return { success: true, role: 'empleado' };
  }

  // Case D: Username is admin/administrador but entered wrong password
  if (cleanUser === 'admin' || cleanUser === 'administrador' || cleanUser === 'administradora') {
    return {
      success: false,
      error: 'Contraseña incorrecta para Administrador. La contraseña requerida es 4321.',
    };
  }

  // Case E: Username is empleado/cajero but entered wrong password
  if (cleanUser === 'empleado' || cleanUser === 'cajero') {
    return {
      success: false,
      error: 'Contraseña incorrecta para Empleado. La contraseña requerida es 1234.',
    };
  }

  // Case F: Generic invalid credentials
  return {
    success: false,
    error: 'Credenciales no reconocidas. Para Administrador use usuario: "administrador" y contraseña: "4321".',
  };
}

/**
 * Calculate all-time accumulated profits and metrics
 */
export function calculateAccumulatedMetrics(sales: Sale[]) {
  const completedSales = sales.filter((s) => s.status === 'completada');

  const totalGrossSales = completedSales.reduce((acc, s) => acc + s.total, 0);
  const totalCost = completedSales.reduce(
    (acc, s) => acc + (s.totalCostEstimate || 0),
    0
  );
  const totalNetProfit = totalGrossSales - totalCost;
  const margin =
    totalGrossSales > 0
      ? Math.round((totalNetProfit / totalGrossSales) * 100)
      : 0;

  const totalGranizadosSold = completedSales.reduce(
    (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  return {
    totalGrossSales,
    totalCost,
    totalNetProfit,
    margin,
    totalInvoices: completedSales.length,
    totalGranizadosSold,
    averageTicket:
      completedSales.length > 0
        ? Math.round(totalGrossSales / completedSales.length)
        : 0,
  };
}
