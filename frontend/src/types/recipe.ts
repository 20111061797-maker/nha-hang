export interface RecipeItemDto {
  id: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  quantity: number;
  wastePercentage: number;
  effectiveQuantity: number;
}

export interface RecipeDto {
  id: string;
  productId: string;
  productName: string;
  productVariantId?: string | null;
  variantName?: string | null;
  name: string;
  isActive: boolean;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
  items: RecipeItemDto[];
}

export interface SaveRecipeItemRequest {
  ingredientId: string;
  unitId?: string;
  unitName?: string;
  quantity: number;
  wastePercentage?: number;
}

export interface SaveRecipeRequest {
  productId: string;
  productVariantId?: string | null;
  name?: string | null;
  items: SaveRecipeItemRequest[];
}

export interface ProductStockCheckItemDto {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  requiredQuantity: number;
  requiredUnitName: string;
  convertedStockQuantity: number;
  stockUnitName: string;
  currentStock: number;
  isSufficient: boolean;
}

export interface ProductStockCheckResponse {
  productId: string;
  productName: string;
  orderQuantity: number;
  hasRecipe: boolean;
  allIngredientsAvailable: boolean;
  ingredients: ProductStockCheckItemDto[];
}

export interface RecordWastePayload {
  branchId: string;
  kitchenOrderId?: string;
  productId?: string;
  ingredientId?: string;
  quantity: number;
  reason: string;
}

export interface RecordReCookPayload {
  kitchenOrderId: string;
  kitchenOrderItemId: string;
  reason: string;
}

export interface InventoryDeductionResult {
  success: boolean;
  itemsProcessed: number;
  transactionsCreated: number;
  deductedItems: string[];
  warnings: string[];
}
