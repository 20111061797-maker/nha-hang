import { apiRequest } from "./client";
import type {
  CategoryListItem,
  CategoryDetails,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  ProductListItem,
  ProductDetails,
  CreateProductPayload,
  UpdateProductPayload,
  BranchProductItem,
} from "@/types/products";
import type { MenuResponse } from "@/types/pos";

export const productApi = {
  // Products
  getProducts(): Promise<ProductListItem[]> {
    return apiRequest<ProductListItem[]>("/api/products");
  },

  getProduct(id: string): Promise<ProductDetails> {
    return apiRequest<ProductDetails>(`/api/products/${id}`);
  },

  createProduct(payload: CreateProductPayload): Promise<ProductDetails> {
    return apiRequest<ProductDetails>("/api/products", {
      method: "POST",
      body: {
        sku: payload.sku,
        name: payload.name,
        description: payload.description,
        shortDescription: payload.shortDescription,
        displayOrder: payload.displayOrder,
        categoryIds: payload.categoryIds,
        imageUrl: payload.imageUrl,
      },
    });
  },

  updateProduct(id: string, payload: UpdateProductPayload): Promise<ProductDetails> {
    return apiRequest<ProductDetails>(`/api/products/${id}`, {
      method: "PUT",
      body: {
        sku: payload.sku,
        name: payload.name,
        description: payload.description,
        shortDescription: payload.shortDescription,
        displayOrder: payload.displayOrder,
        categoryIds: payload.categoryIds,
        imageUrl: payload.imageUrl,
      },
    });
  },

  deleteProduct(id: string): Promise<void> {
    return apiRequest<void>(`/api/products/${id}`, {
      method: "DELETE",
    });
  },

  setProductStatus(id: string, isActive: boolean): Promise<void> {
    return apiRequest<void>(`/api/products/${id}/status`, {
      method: "PATCH",
      body: { isActive },
    });
  },

  // Categories
  getCategories(): Promise<CategoryListItem[]> {
    return apiRequest<CategoryListItem[]>("/api/categories");
  },

  getCategory(id: string): Promise<CategoryDetails> {
    return apiRequest<CategoryDetails>(`/api/categories/${id}`);
  },

  createCategory(payload: CreateCategoryPayload): Promise<CategoryDetails> {
    return apiRequest<CategoryDetails>("/api/categories", {
      method: "POST",
      body: payload,
    });
  },

  updateCategory(id: string, payload: UpdateCategoryPayload): Promise<CategoryDetails> {
    return apiRequest<CategoryDetails>(`/api/categories/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteCategory(id: string): Promise<void> {
    return apiRequest<void>(`/api/categories/${id}`, {
      method: "DELETE",
    });
  },

  // Branch Menu & Branch Products
  getBranchMenu(branchId: string): Promise<MenuResponse> {
    return apiRequest<MenuResponse>(`/api/branches/${branchId}/menu`);
  },

  getBranchProducts(branchId: string): Promise<BranchProductItem[]> {
    return apiRequest<BranchProductItem[]>(`/api/branches/${branchId}/products`);
  },

  createBranchProduct(
    branchId: string,
    payload: { productId: string; price: number; isAvailable: boolean }
  ): Promise<BranchProductItem> {
    return apiRequest<BranchProductItem>(`/api/branches/${branchId}/products`, {
      method: "POST",
      body: payload,
    });
  },

  updateBranchProduct(id: string, payload: { price: number }): Promise<BranchProductItem> {
    return apiRequest<BranchProductItem>(`/api/branch-products/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
};
