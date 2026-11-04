import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getPriceConfigsFromDB,
  updatePriceConfigInDB,
  getInventoryFromDB,
  upsertInventoryItemInDB,
  deleteInventoryItemFromDB,
  batchSaveInventoryInDB,
  getSalesFromDB,
  createSaleInDB,
  updateSaleStatusInDB,
  clearAllSalesInDB,
  getTablesFromDB,
  saveTableSessionInDB,
  deleteTableSessionFromDB,
} from './src/db/operations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes for ICE GRANIZADOS ---

  // 1. Price configurations
  app.get('/api/price-configs', async (_req, res) => {
    try {
      const configs = await getPriceConfigsFromDB();
      res.json(configs);
    } catch (error: any) {
      console.error('Failed to get price configs:', error);
      res.status(500).json({ error: error.message || 'Error fetching price configurations' });
    }
  });

  app.put('/api/price-configs/:size', async (req, res) => {
    try {
      const { size } = req.params;
      const { price, costEstimate } = req.body;
      if (!price || isNaN(Number(price))) {
        return res.status(400).json({ error: 'Valid price is required' });
      }
      const updated = await updatePriceConfigInDB(size as any, Number(price), costEstimate ? Number(costEstimate) : undefined);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update price config:', error);
      res.status(500).json({ error: error.message || 'Error updating price configuration' });
    }
  });

  // 2. Insumos & Inventory
  app.get('/api/inventory', async (_req, res) => {
    try {
      const inventory = await getInventoryFromDB();
      res.json(inventory);
    } catch (error: any) {
      console.error('Failed to get inventory:', error);
      res.status(500).json({ error: error.message || 'Error fetching inventory' });
    }
  });

  app.post('/api/inventory', async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id || !item.name) {
        return res.status(400).json({ error: 'Valid inventory item with id and name is required' });
      }
      const saved = await upsertInventoryItemInDB(item);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to upsert inventory item:', error);
      res.status(500).json({ error: error.message || 'Error saving inventory item' });
    }
  });

  app.delete('/api/inventory/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteInventoryItemFromDB(id);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete inventory item:', error);
      res.status(500).json({ error: error.message || 'Error deleting inventory item' });
    }
  });

  app.post('/api/inventory/batch', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array' });
      }
      const result = await batchSaveInventoryInDB(items);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to batch save inventory:', error);
      res.status(500).json({ error: error.message || 'Error batch updating inventory' });
    }
  });

  // 3. Sales History
  app.get('/api/sales', async (_req, res) => {
    try {
      const sales = await getSalesFromDB();
      res.json(sales);
    } catch (error: any) {
      console.error('Failed to get sales:', error);
      res.status(500).json({ error: error.message || 'Error fetching sales' });
    }
  });

  app.post('/api/sales', async (req, res) => {
    try {
      const sale = req.body;
      if (!sale || !sale.id || !sale.invoiceNumber) {
        return res.status(400).json({ error: 'Invalid sale object' });
      }
      const saved = await createSaleInDB(sale);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save sale:', error);
      res.status(500).json({ error: error.message || 'Error saving sale' });
    }
  });

  app.patch('/api/sales/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const updated = await updateSaleStatusInDB(id, status, reason);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update sale status:', error);
      res.status(500).json({ error: error.message || 'Error updating sale' });
    }
  });

  app.post('/api/sales/reset', async (_req, res) => {
    try {
      const result = await clearAllSalesInDB();
      res.json(result);
    } catch (error: any) {
      console.error('Failed to reset sales:', error);
      res.status(500).json({ error: error.message || 'Error resetting sales' });
    }
  });

  // 4. Tables
  app.get('/api/tables', async (_req, res) => {
    try {
      const tables = await getTablesFromDB();
      res.json(tables);
    } catch (error: any) {
      console.error('Failed to get tables:', error);
      res.status(500).json({ error: error.message || 'Error fetching tables' });
    }
  });

  app.put('/api/tables/:id', async (req, res) => {
    try {
      const table = req.body;
      const saved = await saveTableSessionInDB(table);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save table:', error);
      res.status(500).json({ error: error.message || 'Error saving table' });
    }
  });

  app.delete('/api/tables/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteTableSessionFromDB(id);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete table:', error);
      res.status(500).json({ error: error.message || 'Error deleting table' });
    }
  });

  // Vite middleware in dev or static serve in prod
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ICE GRANIZADOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
