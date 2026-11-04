import { db } from './index.ts';
import { priceConfigs, inventoryItems, sales, tableSessions } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { InventoryItem, Sale, TableSession, GranizadoSize } from '../types/index.ts';

// --- Price Configurations ---
export async function getPriceConfigsFromDB() {
  try {
    return await db.select().from(priceConfigs);
  } catch (error) {
    console.error('Error fetching price configs:', error);
    throw new Error('Database query failed: price configs', { cause: error });
  }
}

export async function updatePriceConfigInDB(size: GranizadoSize, price: number, costEstimate?: number) {
  try {
    const existing = await db.select().from(priceConfigs).where(eq(priceConfigs.size, size));
    if (existing.length === 0) {
      const inserted = await db.insert(priceConfigs).values({
        size,
        name: `Granizado ${size}`,
        price,
        costEstimate: costEstimate || 3000,
      }).returning();
      return inserted[0];
    }

    const updated = await db.update(priceConfigs)
      .set({
        price,
        ...(costEstimate !== undefined ? { costEstimate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(priceConfigs.size, size))
      .returning();
    return updated[0];
  } catch (error) {
    console.error(`Error updating price config for ${size}:`, error);
    throw new Error(`Database query failed: update price config ${size}`, { cause: error });
  }
}

// --- Inventory Items ---
export async function getInventoryFromDB(): Promise<InventoryItem[]> {
  try {
    const items = await db.select().from(inventoryItems);
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category as InventoryItem['category'],
      stock: i.stock,
      minStock: i.minStock,
      unit: i.unit as InventoryItem['unit'],
      costPerUnit: i.costPerUnit,
      price: i.price ?? undefined,
      color: i.color ?? undefined,
      glowColor: i.glowColor ?? undefined,
      portionUsed: i.portionUsed ?? undefined,
      sizeId: (i.sizeId as GranizadoSize) ?? undefined,
      description: i.description ?? undefined,
      lastRestocked: i.lastRestocked ?? undefined,
    }));
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw new Error('Database query failed: inventory', { cause: error });
  }
}

export async function upsertInventoryItemInDB(item: InventoryItem) {
  try {
    const inserted = await db.insert(inventoryItems).values({
      id: item.id,
      name: item.name,
      category: item.category,
      stock: item.stock,
      minStock: item.minStock,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      price: item.price,
      color: item.color,
      glowColor: item.glowColor,
      portionUsed: item.portionUsed,
      sizeId: item.sizeId,
      description: item.description,
      lastRestocked: item.lastRestocked,
    }).onConflictDoUpdate({
      target: inventoryItems.id,
      set: {
        name: item.name,
        category: item.category,
        stock: item.stock,
        minStock: item.minStock,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        price: item.price,
        color: item.color,
        glowColor: item.glowColor,
        portionUsed: item.portionUsed,
        sizeId: item.sizeId,
        description: item.description,
        lastRestocked: item.lastRestocked,
      },
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error('Error upserting inventory item:', error);
    throw new Error(`Database query failed: upsert inventory ${item.id}`, { cause: error });
  }
}

export async function deleteInventoryItemFromDB(id: string) {
  try {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return { success: true, id };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw new Error(`Database query failed: delete inventory ${id}`, { cause: error });
  }
}

export async function batchSaveInventoryInDB(items: InventoryItem[]) {
  try {
    for (const item of items) {
      await upsertInventoryItemInDB(item);
    }
    return { success: true, count: items.length };
  } catch (error) {
    console.error('Error batch saving inventory:', error);
    throw new Error('Database query failed: batch save inventory', { cause: error });
  }
}

// --- Sales History ---
export async function getSalesFromDB(): Promise<Sale[]> {
  try {
    const rows = await db.select().from(sales).orderBy(desc(sales.createdAt));
    return rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(r.items);
      } catch {
        parsedItems = [];
      }
      return {
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        createdAt: r.createdAt,
        cashierRole: r.cashierRole as 'empleado' | 'administrador',
        cashierName: r.cashierName,
        tableId: r.tableId ?? undefined,
        tableName: r.tableName ?? undefined,
        customerName: r.customerName ?? undefined,
        items: parsedItems,
        subtotal: r.subtotal,
        discount: r.discount,
        total: r.total,
        paymentMethod: r.paymentMethod as any,
        amountPaid: r.amountPaid,
        change: r.change,
        totalCostEstimate: r.totalCostEstimate,
        profitEstimate: r.profitEstimate,
        status: r.status as 'completada' | 'anulada',
        cancellationReason: r.cancellationReason ?? undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw new Error('Database query failed: sales', { cause: error });
  }
}

export async function createSaleInDB(sale: Sale) {
  try {
    await db.insert(sales).values({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      createdAt: sale.createdAt,
      cashierRole: sale.cashierRole,
      cashierName: sale.cashierName,
      tableId: sale.tableId,
      tableName: sale.tableName,
      customerName: sale.customerName,
      items: JSON.stringify(sale.items),
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      amountPaid: sale.amountPaid,
      change: sale.change,
      totalCostEstimate: sale.totalCostEstimate,
      profitEstimate: sale.profitEstimate,
      status: sale.status,
      cancellationReason: sale.cancellationReason,
    }).onConflictDoUpdate({
      target: sales.id,
      set: {
        status: sale.status,
        cancellationReason: sale.cancellationReason,
      },
    });
    return sale;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw new Error('Database query failed: create sale', { cause: error });
  }
}

export async function updateSaleStatusInDB(id: string, status: 'completada' | 'anulada', reason?: string) {
  try {
    const updated = await db.update(sales).set({
      status,
      cancellationReason: reason,
    }).where(eq(sales.id, id)).returning();
    return updated[0];
  } catch (error) {
    console.error('Error updating sale status:', error);
    throw new Error(`Database query failed: update sale status ${id}`, { cause: error });
  }
}

export async function clearAllSalesInDB() {
  try {
    await db.delete(sales);
    return { success: true };
  } catch (error) {
    console.error('Error clearing sales:', error);
    throw new Error('Database query failed: clear sales', { cause: error });
  }
}

// --- Tables Sessions ---
export async function getTablesFromDB(): Promise<TableSession[]> {
  try {
    const rows = await db.select().from(tableSessions);
    return rows.map((r) => {
      let cart = [];
      try {
        cart = JSON.parse(r.cart);
      } catch {
        cart = [];
      }
      return {
        id: r.id,
        name: r.name,
        cart,
        customerName: r.customerName ?? undefined,
        openedAt: r.openedAt ?? undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching table sessions:', error);
    throw new Error('Database query failed: tables', { cause: error });
  }
}

export async function saveTableSessionInDB(table: TableSession) {
  try {
    await db.insert(tableSessions).values({
      id: table.id,
      name: table.name,
      cart: JSON.stringify(table.cart),
      customerName: table.customerName,
      openedAt: table.openedAt,
    }).onConflictDoUpdate({
      target: tableSessions.id,
      set: {
        name: table.name,
        cart: JSON.stringify(table.cart),
        customerName: table.customerName,
        openedAt: table.openedAt,
      },
    });
    return table;
  } catch (error) {
    console.error('Error saving table session:', error);
    throw new Error(`Database query failed: table session ${table.id}`, { cause: error });
  }
}

export async function deleteTableSessionFromDB(id: string) {
  try {
    await db.delete(tableSessions).where(eq(tableSessions.id, id));
    return { success: true, id };
  } catch (error) {
    console.error('Error deleting table session:', error);
    throw new Error(`Database query failed: delete table session ${id}`, { cause: error });
  }
}

