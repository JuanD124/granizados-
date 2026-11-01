import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateItemUnitPrice,
  calculateCartSummary,
  calculateInsumosDeduction,
  applyInventoryDeduction,
  generateNextInvoiceNumber,
  generateDailyReport,
  calculateAccumulatedMetrics,
  verifyPin,
  verifyLoginCredentials,
  formatCOP,
} from './billing';
import { CartItem, InventoryItem, Sale } from '../types';

test('calculateItemUnitPrice returns base prices: 12k for 12oz, 14k for 14oz, 16k for 16oz', () => {
  assert.equal(calculateItemUnitPrice('12oz', []), 12000);
  assert.equal(calculateItemUnitPrice('14oz', []), 14000);
  assert.equal(calculateItemUnitPrice('16oz', []), 16000);

  // With toppings
  const withToppings = calculateItemUnitPrice('12oz', [
    { price: 1500 },
    { price: 1000 },
  ]);
  assert.equal(withToppings, 14500);
});

test('calculateCartSummary computes subtotal and discount correctly', () => {
  const items: CartItem[] = [
    {
      id: 'item-1',
      size: '12oz',
      flavorId: 'mora-azul',
      flavorName: 'Mora Azul',
      toppings: [],
      unitPrice: 12000,
      quantity: 2,
    },
    {
      id: 'item-2',
      size: '16oz',
      flavorId: 'fresa-ice',
      flavorName: 'Fresa Ice',
      toppings: [],
      unitPrice: 16000,
      quantity: 1,
    },
  ];

  const summary = calculateCartSummary(items, 10);
  assert.equal(summary.subtotal, 40000); // 24000 + 16000
  assert.equal(summary.discountAmount, 4000); // 10%
  assert.equal(summary.total, 36000);
});

test('calculateInsumosDeduction calculates cups, lids, ice, syrup, and toppings', () => {
  const items: CartItem[] = [
    {
      id: 'item-1',
      size: '12oz',
      flavorId: 'mora-azul',
      flavorName: 'Mora Azul',
      toppings: [
        {
          id: 'leche-condensada',
          name: 'Leche Condensada',
          price: 1500,
          stockKey: 'insumo-leche-condensada',
          portionUsed: 30,
          unit: 'ml',
        },
      ],
      unitPrice: 13500,
      quantity: 2,
    },
    {
      id: 'item-2',
      size: '14oz',
      flavorId: 'limon-electrico',
      flavorName: 'Limón',
      secondaryFlavorId: 'mango-biche',
      secondaryFlavorName: 'Mango',
      toppings: [],
      unitPrice: 14000,
      quantity: 1,
    },
  ];

  const deduction = calculateInsumosDeduction(items);

  // 2 x 12oz cups
  assert.equal(deduction['vaso-12oz'], 2);
  assert.equal(deduction['tapa-12oz'], 2);

  // 1 x 14oz cup
  assert.equal(deduction['vaso-14oz'], 1);
  assert.equal(deduction['tapa-14oz'], 1);

  // 3 pitillos total (2 + 1)
  assert.equal(deduction['pitillo-neon'], 3);

  // Ice: 2 x 300g (0.6kg) + 1 x 380g (0.38kg) = 0.98kg
  assert.equal(deduction['hielo-purificado'], 0.98);

  // Mora syrup: 2 * 60ml = 120ml
  assert.equal(deduction['pulpa-mora-azul'], 120);

  // Mixed flavor for 14oz: 75ml total / 2 = 37.5ml each
  assert.equal(deduction['pulpa-limon-electrico'], 37.5);
  assert.equal(deduction['pulpa-mango-biche'], 37.5);

  // Topping: 2 * 30ml = 60ml
  assert.equal(deduction['insumo-leche-condensada'], 60);
});

test('applyInventoryDeduction reduces stock and reports depleted/low items', () => {
  const inventory: InventoryItem[] = [
    {
      id: 'vaso-12oz',
      name: 'Vaso 12oz',
      category: 'vasos',
      stock: 10,
      minStock: 5,
      unit: 'uds',
      costPerUnit: 600,
    },
    {
      id: 'pitillo-neon',
      name: 'Pitillo Neón',
      category: 'pitillos',
      stock: 50,
      minStock: 10,
      unit: 'uds',
      costPerUnit: 150,
    },
  ];

  const deductions = {
    'vaso-12oz': 6, // will drop to 4, which is <= minStock (5)
    'pitillo-neon': 5, // drops to 45
  };

  const { updatedInventory, depletedItems } = applyInventoryDeduction(
    inventory,
    deductions
  );

  const updatedVaso = updatedInventory.find((i) => i.id === 'vaso-12oz');
  assert.equal(updatedVaso?.stock, 4);

  const updatedPitillo = updatedInventory.find((i) => i.id === 'pitillo-neon');
  assert.equal(updatedPitillo?.stock, 45);

  assert.equal(depletedItems.length, 1);
  assert.equal(depletedItems[0], 'Vaso 12oz');
});

test('generateNextInvoiceNumber increments consecutively', () => {
  const existingSales: Partial<Sale>[] = [
    { invoiceNumber: 'ICE-00101' },
    { invoiceNumber: 'ICE-00102' },
  ];
  const next = generateNextInvoiceNumber(existingSales as Sale[]);
  assert.equal(next, 'ICE-00103');
});

test('verifyPin checks employee (1234) and admin (4321) passwords strictly and handles legacy states', () => {
  const creds = { employeePin: '1234', adminPin: '4321' };
  assert.equal(verifyPin('empleado', '1234', creds), true);
  assert.equal(verifyPin('empleado', '0000', creds), false);
  assert.equal(verifyPin('administrador', '4321', creds), true);
  assert.equal(verifyPin('administrador', '1234', creds), false);

  // Resilient against stale credentials from localStorage
  const staleCreds = { employeePin: '123456', adminPin: '882200' };
  assert.equal(verifyPin('administrador', '4321', staleCreds), true);
  assert.equal(verifyPin('empleado', '1234', staleCreds), true);
});

test('verifyLoginCredentials checks username and password for employee (1234) and admin (4321)', () => {
  const creds = {
    employeeUser: 'empleado',
    adminUser: 'administrador',
    employeePin: '1234',
    adminPin: '4321',
  };

  // Valid employee login
  const empLogin = verifyLoginCredentials('empleado', '1234', creds);
  assert.equal(empLogin.success, true);
  assert.equal(empLogin.role, 'empleado');

  // Valid admin login with 'administrador'
  const adminLogin1 = verifyLoginCredentials('administrador', '4321', creds);
  assert.equal(adminLogin1.success, true);
  assert.equal(adminLogin1.role, 'administrador');

  // Valid admin login with 'admin' and uppercase
  const adminLogin2 = verifyLoginCredentials('Admin', '4321', creds);
  assert.equal(adminLogin2.success, true);
  assert.equal(adminLogin2.role, 'administrador');

  // Valid admin login even with empty username if password is 4321
  const adminLogin3 = verifyLoginCredentials('', '4321', creds);
  assert.equal(adminLogin3.success, true);
  assert.equal(adminLogin3.role, 'administrador');

  // Inverted inputs (4321 as user, admin as pass)
  const adminLogin4 = verifyLoginCredentials('4321', 'admin', creds);
  assert.equal(adminLogin4.success, true);
  assert.equal(adminLogin4.role, 'administrador');

  // Invalid employee password
  const invalidEmp = verifyLoginCredentials('empleado', '9999', creds);
  assert.equal(invalidEmp.success, false);

  // Attempting admin password with employee username
  const invalidAdminMismatch = verifyLoginCredentials('empleado', '4321', creds);
  assert.equal(invalidAdminMismatch.success, false);

  // Stale config object with legacy adminPin 882200 still accepts 4321
  const staleConfig = {
    employeeUser: 'empleado',
    adminUser: 'admin',
    employeePin: '123456',
    adminPin: '882200',
  };
  const adminStalePass = verifyLoginCredentials('administrador', '4321', staleConfig);
  assert.equal(adminStalePass.success, true);
  assert.equal(adminStalePass.role, 'administrador');
});

test('calculateAccumulatedMetrics and generateDailyReport aggregate financial totals accurately', () => {
  const sales: Sale[] = [
    {
      id: 's1',
      invoiceNumber: 'ICE-00101',
      createdAt: '2026-11-01T10:00:00.000Z',
      cashierRole: 'empleado',
      cashierName: 'Juan',
      items: [
        {
          id: 'i1',
          size: '12oz',
          flavorId: 'mora-azul',
          flavorName: 'Mora Azul',
          toppings: [],
          unitPrice: 12000,
          quantity: 1,
        },
      ],
      subtotal: 12000,
      discount: 0,
      total: 12000,
      paymentMethod: 'Efectivo',
      amountPaid: 20000,
      change: 8000,
      totalCostEstimate: 3200,
      profitEstimate: 8800,
      status: 'completada',
    },
    {
      id: 's2',
      invoiceNumber: 'ICE-00102',
      createdAt: '2026-11-01T12:30:00.000Z',
      cashierRole: 'empleado',
      cashierName: 'Juan',
      items: [
        {
          id: 'i2',
          size: '16oz',
          flavorId: 'fresa-ice',
          flavorName: 'Fresa Ice',
          toppings: [],
          unitPrice: 16000,
          quantity: 2,
        },
      ],
      subtotal: 32000,
      discount: 0,
      total: 32000,
      paymentMethod: 'Nequi / Daviplata',
      amountPaid: 32000,
      change: 0,
      totalCostEstimate: 9200,
      profitEstimate: 22800,
      status: 'completada',
    },
  ];

  const daily = generateDailyReport(sales, '2026-11-01');
  assert.equal(daily.grossSales, 44000);
  assert.equal(daily.totalCost, 12400);
  assert.equal(daily.netProfit, 31600);
  assert.equal(daily.cashExpected, 12000);
  assert.equal(daily.bySize['12oz'].count, 1);
  assert.equal(daily.bySize['16oz'].count, 2);

  const accumulated = calculateAccumulatedMetrics(sales);
  assert.equal(accumulated.totalGrossSales, 44000);
  assert.equal(accumulated.totalNetProfit, 31600);
  assert.equal(accumulated.totalGranizadosSold, 3);
});

test('formatCOP produces formatted currency string', () => {
  const formatted = formatCOP(12000);
  assert.ok(formatted.includes('12.000') || formatted.includes('12,000'));
});
