import { apiRequest } from "./client";
import type {
  RecipeDto,
  SaveRecipeRequest,
  ProductStockCheckResponse,
  RecordWastePayload,
  RecordReCookPayload,
  InventoryDeductionResult,
} from "@/types/recipe";

export const recipeApi = {
  getRecipes(): Promise<RecipeDto[]> {
    return apiRequest<RecipeDto[]>("/api/recipes");
  },

  getByProduct(productId: string, variantId?: string): Promise<RecipeDto> {
    const searchParams = new URLSearchParams();
    if (variantId) searchParams.set("variantId", variantId);
    const query = searchParams.toString();
    return apiRequest<RecipeDto>(`/api/recipes/product/${productId}${query ? `?${query}` : ""}`);
  },

  saveRecipe(payload: SaveRecipeRequest): Promise<RecipeDto> {
    return apiRequest<RecipeDto>("/api/recipes", {
      method: "POST",
      body: payload,
    });
  },

  checkStock(params: {
    branchId: string;
    productId: string;
    variantId?: string;
    quantity?: number;
  }): Promise<ProductStockCheckResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("branchId", params.branchId);
    searchParams.set("productId", params.productId);
    if (params.variantId) searchParams.set("variantId", params.variantId);
    if (params.quantity) searchParams.set("quantity", String(params.quantity));
    return apiRequest<ProductStockCheckResponse>(`/api/recipes/check-stock?${searchParams.toString()}`);
  },

  deleteRecipe(id: string): Promise<void> {
    return apiRequest<void>(`/api/recipes/${id}`, {
      method: "DELETE",
    });
  },

  recordWaste(payload: RecordWastePayload): Promise<InventoryDeductionResult> {
    return apiRequest<InventoryDeductionResult>("/api/inventory/waste", {
      method: "POST",
      body: payload,
    });
  },

  recordReCook(payload: RecordReCookPayload): Promise<InventoryDeductionResult> {
    return apiRequest<InventoryDeductionResult>("/api/inventory/re-cook", {
      method: "POST",
      body: payload,
    });
  },
};
