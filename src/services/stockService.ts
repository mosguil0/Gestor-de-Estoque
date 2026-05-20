import { Product, InventoryBatch, Sale, StockMovement, DashboardStats } from '../types';
import { addDays, isBefore, parseISO } from 'date-fns';

const STORAGE_KEYS = {
  PRODUCTS: 'stock_manager_products',
  BATCHES: 'stock_manager_batches',
  SALES: 'stock_manager_sales',
  MOVEMENTS: 'stock_manager_movements',
};

class StockService {
  constructor() {
    this.initMockData();
  }

  private initMockData(): void {
    // If old dataset is detected (e.g. missing custom expired batches b_exp1), wipe localStorage to populate clean data
    const oldDataFlag = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const oldBatches = localStorage.getItem(STORAGE_KEYS.BATCHES);
    if (
      (oldDataFlag && oldDataFlag.includes('Leite Condensado')) ||
      (oldBatches && !oldBatches.includes('b_exp1'))
    ) {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.BATCHES);
      localStorage.removeItem(STORAGE_KEYS.SALES);
      localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      const defaultProducts: Product[] = [
        { id: 'p1', name: 'Ração Golden Special Cães Adultos Frango 15kg', barcode: '7891000053508', category: 'Rações', minStockLevel: 5 },
        { id: 'p2', name: 'Sachê Whiskas Gatos Adultos Carne ao Molho 85g', barcode: '7892000012345', category: 'Nutrição Úmida', minStockLevel: 15 },
        { id: 'p3', name: 'Anti-pulgas e Carrapatos Bravecto Cães 20-40kg', barcode: '7893000067890', category: 'Medicamentos Vet', minStockLevel: 3 },
        { id: 'p4', name: 'Areia Higiênica Pipicat Premium Gatos 4kg', barcode: '7894000043210', category: 'Higiene & Acessórios', minStockLevel: 10 },
      ];
      this.set(STORAGE_KEYS.PRODUCTS, defaultProducts);

      const defaultBatches: InventoryBatch[] = [
        { id: 'b1', productId: 'p1', quantity: 12, expiryDate: '2026-06-15', receivedAt: '2026-05-01T10:00:00Z' },
        { id: 'b2', productId: 'p1', quantity: 18, expiryDate: '2026-12-05', receivedAt: '2026-05-01T10:00:00Z' },
        { id: 'b3', productId: 'p2', quantity: 10, expiryDate: '2026-05-28', receivedAt: '2026-05-02T11:00:00Z' },
        { id: 'b4', productId: 'p3', quantity: 5, expiryDate: '2026-08-30', receivedAt: '2026-05-03T14:00:00Z' },
        { id: 'b5', productId: 'p4', quantity: 24, expiryDate: '2027-01-15', receivedAt: '2026-05-04T09:00:00Z' },
        { id: 'b_exp1', productId: 'p2', quantity: 15, expiryDate: '2026-05-01', receivedAt: '2026-04-15T11:00:00Z' },
        { id: 'b_exp2', productId: 'p3', quantity: 2, expiryDate: '2026-04-10', receivedAt: '2026-03-20T14:00:00Z' },
      ];
      this.set(STORAGE_KEYS.BATCHES, defaultBatches);

      const defaultSales: Sale[] = [
        { id: 's1', productId: 'p1', quantity: 6, price: 149.90, soldAt: '2026-05-18T14:30:00Z' },
        { id: 's2', productId: 'p1', quantity: 8, price: 149.90, soldAt: '2026-05-19T10:15:00Z' },
        { id: 's3', productId: 'p2', quantity: 15, price: 3.50, soldAt: '2026-05-15T09:00:00Z' },
        { id: 's4', productId: 'p2', quantity: 4, price: 3.50, soldAt: '2026-05-20T17:45:00Z' },
        { id: 's5', productId: 'p3', quantity: 2, price: 219.00, soldAt: '2026-05-17T20:30:00Z' },
        { id: 's6', productId: 'p4', quantity: 5, price: 24.90, soldAt: '2026-05-19T14:20:00Z' },
      ];
      this.set(STORAGE_KEYS.SALES, defaultSales);

      const defaultMovements: StockMovement[] = [
        { id: 'm1', productId: 'p1', type: 'IN', quantity: 30, reason: 'Carga Inicial', timestamp: '2026-05-01T10:00:00Z' },
        { id: 'm2', productId: 'p1', type: 'OUT', quantity: 14, reason: 'Venda PDV', timestamp: '2026-05-19T14:30:00Z' },
        { id: 'm4', productId: 'p2', type: 'IN', quantity: 29, reason: 'Carga Inicial', timestamp: '2026-05-02T11:00:00Z' },
        { id: 'm5', productId: 'p2', type: 'OUT', quantity: 19, reason: 'Venda PDV', timestamp: '2026-05-20T17:45:00Z' },
        { id: 'm7', productId: 'p3', type: 'IN', quantity: 15, reason: 'Carga Inicial', timestamp: '2026-05-03T14:00:00Z' },
        { id: 'm8', productId: 'p3', type: 'OUT', quantity: 2, reason: 'Venda PDV', timestamp: '2026-05-17T20:30:00Z' },
        { id: 'm10', productId: 'p4', type: 'IN', quantity: 29, reason: 'Carga Inicial', timestamp: '2026-05-04T09:00:00Z' },
        { id: 'm11', productId: 'p4', type: 'OUT', quantity: 5, reason: 'Venda PDV', timestamp: '2026-05-19T14:20:00Z' },
      ];
      this.set(STORAGE_KEYS.MOVEMENTS, defaultMovements);
    }
  }

  private get<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private set<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Products
  getProducts(): Product[] {
    return this.get<Product>(STORAGE_KEYS.PRODUCTS);
  }

  saveProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index > -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  // Batches (Inventory)
  getBatches(): InventoryBatch[] {
    return this.get<InventoryBatch>(STORAGE_KEYS.BATCHES);
  }

  addBatch(batch: InventoryBatch): void {
    const batches = this.getBatches();
    batches.push(batch);
    this.set(STORAGE_KEYS.BATCHES, batches);
    
    // Register movement
    this.registerMovement({
      id: Math.random().toString(36).substr(2, 9),
      productId: batch.productId,
      type: 'IN',
      quantity: batch.quantity,
      reason: 'Recepção de Lote',
      timestamp: new Date().toISOString(),
    });
  }

  // Sales
  getSales(): Sale[] {
    return this.get<Sale>(STORAGE_KEYS.SALES);
  }

  recordSale(sale: Sale): void {
    const sales = this.getSales();
    sales.push(sale);
    this.set(STORAGE_KEYS.SALES, sales);

    // Update inventory batches (FEFO - First Expired First Out)
    let remainingToSell = sale.quantity;
    const batches = this.getBatches()
      .filter(b => b.productId === sale.productId)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const allBatches = this.getBatches();
    
    for (const batch of batches) {
      if (remainingToSell <= 0) break;

      const batchToUpdate = allBatches.find(b => b.id === batch.id);
      if (batchToUpdate) {
        const canTake = Math.min(batchToUpdate.quantity, remainingToSell);
        batchToUpdate.quantity -= canTake;
        remainingToSell -= canTake;
      }
    }

    this.set(STORAGE_KEYS.BATCHES, allBatches.filter(b => b.quantity > 0));

    // Register movement
    this.registerMovement({
      id: Math.random().toString(36).substr(2, 9),
      productId: sale.productId,
      type: 'OUT',
      quantity: sale.quantity,
      reason: 'Venda',
      timestamp: new Date().toISOString(),
    });
  }

  // Movements
  private registerMovement(movement: StockMovement): void {
    const movements = this.get<StockMovement>(STORAGE_KEYS.MOVEMENTS);
    movements.push(movement);
    this.set(STORAGE_KEYS.MOVEMENTS, movements);
  }

  getMovements(): StockMovement[] {
    return this.get<StockMovement>(STORAGE_KEYS.MOVEMENTS);
  }

  // Dashboard & Logic
  getDashboardStats(): DashboardStats {
    const products = this.getProducts();
    const batches = this.getBatches();
    const sales = this.getSales();
    
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    
    const expiringSoon = batches.filter(batch => {
      const expiry = parseISO(batch.expiryDate);
      return isBefore(expiry, thirtyDaysFromNow) && isBefore(now, expiry);
    }).length;

    const lowStockItems = products.filter(product => {
      const currentStock = batches
        .filter(b => b.productId === product.id)
        .reduce((sum, b) => sum + b.quantity, 0);
      return currentStock <= product.minStockLevel;
    }).length;

    const recentSalesTotal = sales
      .filter(s => {
        try {
          const soldDate = parseISO(s.soldAt);
          const sevenDaysAgo = addDays(now, -7);
          return soldDate >= sevenDaysAgo;
        } catch (e) {
          return true;
        }
      })
      .reduce((sum, s) => sum + (s.price * s.quantity), 0);

    return {
      totalItems: products.length,
      expiringSoon,
      lowStockItems,
      recentSalesTotal,
    };
  }

  getReplenishmentSuggestions() {
    const products = this.getProducts();
    const sales = this.getSales();
    const batches = this.getBatches();

    return products.map(product => {
      const currentStock = batches
        .filter(b => b.productId === product.id)
        .reduce((sum, b) => sum + b.quantity, 0);
      
      const last30DaysSales = sales
        .filter(s => s.productId === product.id && isBefore(addDays(new Date(), -30), parseISO(s.soldAt)))
        .reduce((sum, s) => sum + s.quantity, 0);
      
      const suggestedReorder = Math.max(0, (last30DaysSales * 1.2) - currentStock); // Simple logic: 20% buffer

      return {
        ...product,
        currentStock,
        last30DaysSales,
        suggestedReorder,
      };
    }).filter(p => p.currentStock <= p.minStockLevel || p.suggestedReorder > 0);
  }
}

export const stockService = new StockService();
