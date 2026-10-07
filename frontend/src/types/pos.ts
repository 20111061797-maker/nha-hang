export enum TableStatus {
  Available = 0,
  Occupied = 1,
  Reserved = 2,
  Cleaning = 3,
  OutOfService = 4,
}

export enum OrderType {
  DineIn = 0,
  Takeaway = 1,
  Delivery = 2,
  Online = 3,
}

export enum OrderStatus {
  Draft = 0,
  Open = 1,
  Pending = 2,
  Confirmed = 3,
  Preparing = 4,
  Ready = 5,
  Completed = 6,
  Cancelled = 7,
}

export type DiningArea = {
  id: string;
  branchId: string;
  name: string;
  code: string;
  displayOrder: number;
  isActive: boolean;
};

export type DiningTable = {
  id: string;
  branchId: string;
  areaId: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  isActive: boolean;
};

export type MenuModifier = {
  id: string;
  name: string;
  price: number;
  displayOrder: number;
};

export type MenuModifierGroup = {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  modifiers: MenuModifier[];
};

export type MenuVariant = {
  id: string;
  name: string;
  price: number;
  displayOrder: number;
};

export type MenuProduct = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  variants: MenuVariant[];
  modifierGroups: MenuModifierGroup[];
  imageUrl?: string | null;
  isAvailable?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  displayOrder: number;
  products: MenuProduct[];
};

export type MenuComboItem = {
  productId: string;
  productVariantId?: string | null;
  quantity: number;
  displayOrder: number;
};

export type MenuCombo = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  displayOrder: number;
  items: MenuComboItem[];
};

export type MenuResponse = {
  branchId: string;
  categories: MenuCategory[];
  combos: MenuCombo[];
};

export type OrderItemModifierDetails = {
  id: string;
  modifierId: string;
  modifierNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderItemDetails = {
  id: string;
  productId?: string | null;
  productVariantId?: string | null;
  comboId?: string | null;
  productNameSnapshot: string;
  variantNameSnapshot?: string | null;
  comboNameSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  modifiers: OrderItemModifierDetails[];
};

export type OrderDetails = {
  id: string;
  orderNumber: string;
  branchId: string;
  orderType: OrderType;
  status: OrderStatus;
  diningTableId?: string | null;
  customerNameSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  deliveryAddressSnapshot?: string | null;
  currencyCode: string;
  notes?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  version: number;
  createdAt: string;
  items: OrderItemDetails[];
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  branchId: string;
  orderType: OrderType;
  status: OrderStatus;
  diningTableId?: string | null;
  totalAmount: number;
  createdAt: string;
  version: number;
};

export type CreateOrderRequest = {
  branchId: string;
  orderType: OrderType;
  diningTableId?: string | null;
  customerId?: string | null;
  customerNameSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  deliveryAddressSnapshot?: string | null;
  notes?: string | null;
};

export type AddOrderItemRequest = {
  productId?: string | null;
  productVariantId?: string | null;
  comboId?: string | null;
  quantity: number;
  modifierIds: string[];
  notes?: string | null;
  expectedVersion?: number;
};

export type UpdateOrderItemRequest = {
  productId?: string | null;
  productVariantId?: string | null;
  comboId?: string | null;
  quantity: number;
  modifierIds: string[];
  notes?: string | null;
  expectedVersion?: number;
};

export type ChangeOrderStatusRequest = {
  status: OrderStatus;
  reason?: string | null;
  expectedVersion?: number;
};

export type CancelOrderRequest = {
  reason: string;
  expectedVersion?: number;
};
