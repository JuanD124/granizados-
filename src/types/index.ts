export type GranizadoSize = '12oz' | '14oz' | '16oz';

export interface GranizadoSizeConfig {
  id: GranizadoSize;
  name: string;
  ounces: number;
  price: number;
  costEstimate: number; // estimated cost in COP of raw materials
  iceGrams: number;
  syrupMl: number;
  cupStockKey: string;
  lidStockKey: string;
}

export interface Flavor {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  description: string;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  stockKey: string;
  portionUsed: number;
  unit: string;
}

export interface CartItem {
  id: string; // unique item uuid in cart
  size: GranizadoSize;
  flavorId: string;
  flavorName: string;
  secondaryFlavorId?: string; // option to mix 2 flavors
  secondaryFlavorName?: string;
  toppings: Topping[];
  unitPrice: number;
  quantity: number;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'vasos' | 'tapas' | 'pitillos' | 'pulpas' | 'hielo' | 'toppings';
  stock: number;
  minStock: number;
  unit: 'uds' | 'ml' | 'kg' | 'porciones' | 'g';
  costPerUnit: number; // in COP
  lastRestocked?: string;
  price?: number; // selling price for toppings / topics
  color?: string; // neon hex color for pulpas / sabores
  glowColor?: string; // neon glow rgba
  portionUsed?: number; // deduction portion per granizado for toppings (e.g. 30)
  sizeId?: GranizadoSize; // target cup size for vasos ('12oz' | '14oz' | '16oz')
  description?: string;
}

export type PaymentMethod = 'Efectivo' | 'Nequi / Daviplata' | 'Tarjeta / Datáfono';

export interface Sale {
  id: string;
  invoiceNumber: string;
  createdAt: string; // ISO date string
  cashierRole: 'empleado' | 'administrador';
  cashierName: string;
  tableId?: string;
  tableName?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  totalCostEstimate: number;
  profitEstimate: number;
  status: 'completada' | 'anulada';
  cancellationReason?: string;
}

export interface TableSession {
  id: string;
  name: string;
  cart: CartItem[];
  customerName?: string;
  openedAt?: string;
}

export type UserRole = 'empleado' | 'administrador';

export interface AuthState {
  isAuthenticated: boolean;
  currentRole: UserRole;
  employeeUser: string;
  adminUser: string;
  employeePin: string; // 1234
  adminPin: string;    // 4321
  employeeName: string;
  adminName: string;
}

export interface DailyReportSummary {
  date: string;
  totalSalesCount: number;
  grossSales: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercent: number;
  bySize: Record<GranizadoSize, { count: number; total: number }>;
  byPaymentMethod: Record<PaymentMethod, number>;
  byFlavor: Record<string, number>;
  cashExpected: number;
}
