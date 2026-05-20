export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  minStockLevel: number;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  soldAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface DashboardStats {
  totalItems: number;
  expiringSoon: number;
  lowStockItems: number;
  recentSalesTotal: number;
}
