import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').default('empleado').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Base Cup Prices Configuration (12oz, 14oz, 16oz editable by Admin)
export const priceConfigs = pgTable('price_configs', {
  id: serial('id').primaryKey(),
  size: text('size').notNull().unique(), // '12oz', '14oz', '16oz'
  name: text('name').notNull(),
  price: integer('price').notNull(),
  costEstimate: integer('cost_estimate').notNull().default(3000),
  iceGrams: integer('ice_grams').notNull().default(300),
  syrupMl: integer('syrup_ml').notNull().default(60),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Insumos & Inventory items (vasos, pulpas/sabores, topics/toppings, etc.)
export const inventoryItems = pgTable('inventory_items', {
  id: text('id').primaryKey(), // e.g. 'vaso-12oz', 'sabor-mora-azul', 'topic-lechera'
  name: text('name').notNull(),
  category: text('category').notNull(), // 'vasos' | 'tapas' | 'pulpas' | 'toppings' | 'hielo' | 'pitillos'
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  unit: text('unit').notNull().default('uds'), // 'uds' | 'ml' | 'kg' | 'porciones' | 'g'
  costPerUnit: integer('cost_per_unit').notNull().default(0), // in COP
  price: integer('price'), // selling price for toppings
  color: text('color'), // neon hex color for pulpas
  glowColor: text('glow_color'),
  portionUsed: integer('portion_used'), // portion used per cup
  sizeId: text('size_id'), // '12oz' | '14oz' | '16oz' for vasos
  description: text('description'),
  lastRestocked: text('last_restocked'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Sales History & Invoicing
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull(),
  createdAt: text('created_at').notNull(),
  cashierRole: text('cashier_role').notNull(),
  cashierName: text('cashier_name').notNull(),
  tableId: text('table_id'),
  tableName: text('table_name'),
  customerName: text('customer_name'),
  items: text('items').notNull(), // JSON serialized CartItem[]
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  total: integer('total').notNull(),
  paymentMethod: text('payment_method').notNull(),
  amountPaid: integer('amount_paid').notNull(),
  change: integer('change').notNull().default(0),
  totalCostEstimate: integer('total_cost_estimate').notNull().default(0),
  profitEstimate: integer('profit_estimate').notNull().default(0),
  status: text('status').notNull().default('completada'), // 'completada' | 'anulada'
  cancellationReason: text('cancellation_reason'),
});

// 5. Active Tables Sessions
export const tableSessions = pgTable('table_sessions', {
  id: text('id').primaryKey(), // 'mesa-1', 'mesa-2', etc.
  name: text('name').notNull(),
  cart: text('cart').notNull().default('[]'), // JSON serialized CartItem[]
  customerName: text('customer_name'),
  openedAt: text('opened_at'),
});
