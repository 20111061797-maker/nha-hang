export interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unitId: string;
  unitName: string;
  unitCode: string;
  currentQuantity: number;
  averageUnitCost: number;
  totalValue: number;
  minStockThreshold: number;
  stockStatus: "InStock" | "LowStock" | "OutOfStock" | string;
  isActive: boolean;
  lastUpdated: string;
}

export interface InventorySummary {
  totalItems: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  ingredientName: string;
  unitName: string;
  transactionType: "Receipt" | "Issue" | "Adjustment" | "Count" | string;
  quantityDelta: number;
  unitCost: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string | null;
  performedBy: string;
  createdAt: string;
}

export interface CreateInventoryItemPayload {
  branchId: string;
  name: string;
  code?: string;
  unitName: string;
  initialQuantity: number;
  initialCost: number;
  minStockThreshold?: number;
}

export interface AdjustInventoryPayload {
  inventoryItemId: string;
  type: "RECEIPT" | "ISSUE" | "COUNT";
  quantity: number;
  unitCost?: number;
  reason?: string;
}
