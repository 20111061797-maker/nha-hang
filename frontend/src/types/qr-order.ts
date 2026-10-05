export type PublicTableInfo = {
  branchId: string;
  tableId: string;
  branchName: string;
  areaName: string;
  tableNumber: string;
  tableName?: string | null;
  capacity?: number;
};

export type PublicOrderItemPayload = {
  productId: string;
  productVariantId?: string | null;
  modifierIds?: string[];
  quantity: number;
  notes?: string;
};

export type PublicCreateOrderPayload = {
  branchId: string;
  tableId: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: PublicOrderItemPayload[];
};

export type PublicOrderResponse = {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  tableNumber: string;
  createdAt: string;
};

export type CartItem = {
  cartItemId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
  selectedModifiers: { id: string; name: string; price: number }[];
  notes?: string;
  lineTotal: number;
  imageUrl?: string | null;
};

export type PublicActiveBillItem = {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
};

export type PublicActiveBillResponse = {
  hasActiveOrder: boolean;
  orderId?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  totalAmount: number;
  subtotal: number;
  createdAt?: string | null;
  items: PublicActiveBillItem[];
};
