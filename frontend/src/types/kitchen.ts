import { OrderType } from "./pos";

export enum KitchenOrderStatus {
  New = 0,
  Accepted = 1,
  Preparing = 2,
  Ready = 3,
  Completed = 4,
  Cancelled = 5,
}

export enum KitchenPriority {
  Normal = 0,
  High = 1,
  Urgent = 2,
}

export type KitchenStation = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type CreateKitchenStationRequest = {
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
};

export type UpdateKitchenStationRequest = {
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type KitchenOrderItem = {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  status: KitchenOrderStatus;
  notes?: string | null;
  modifiers: string[];
};

export type KitchenOrder = {
  id: string;
  orderId: string;
  branchId: string;
  stationId: string;
  stationName: string;
  orderNumber: string;
  orderType: OrderType;
  tableNumber?: string | null;
  status: KitchenOrderStatus;
  priority: KitchenPriority;
  createdAt: string;
  updatedAt: string;
  version: number;
  items: KitchenOrderItem[];
};

export type KitchenEvent = {
  eventName: string;
  kitchenOrderId: string;
  orderId: string;
  branchId: string;
  stationId: string;
  status: KitchenOrderStatus;
  updatedAt: string;
  itemId?: string | null;
};
