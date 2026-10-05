export type CategoryListItem = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type CategoryDetails = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryPayload = {
  name: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder: number;
};

export type UpdateCategoryPayload = {
  name: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder: number;
};

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  displayOrder: number;
  isActive: boolean;
  price?: number;
  categoryName?: string;
  imageUrl?: string | null;
};

export type ProductDetails = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  displayOrder: number;
  isActive: boolean;
  categoryIds: string[];
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductPayload = {
  sku: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  displayOrder: number;
  categoryIds: string[];
  price?: number;
  imageUrl?: string | null;
};

export type UpdateProductPayload = {
  sku: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  displayOrder: number;
  categoryIds: string[];
  price?: number;
  imageUrl?: string | null;
};

export type BranchProductItem = {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  sku: string;
  price: number;
  isAvailable: boolean;
  isActive: boolean;
  imageUrl?: string | null;
};
