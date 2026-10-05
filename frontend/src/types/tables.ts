import { TableStatus } from "./pos";

export type TableListItem = {
  id: string;
  branchId: string;
  areaId: string;
  tableNumber: string;
  name?: string | null;
  capacity: number;
  status: TableStatus;
  qrCodeIdentifier?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type TableDetails = TableListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CreateTablePayload = {
  areaId: string;
  tableNumber: string;
  name?: string | null;
  capacity: number;
  qrCodeIdentifier?: string | null;
  displayOrder: number;
};

export type UpdateTablePayload = {
  areaId: string;
  tableNumber: string;
  name?: string | null;
  capacity: number;
  qrCodeIdentifier?: string | null;
  displayOrder: number;
};

export type ChangeTableStatusPayload = {
  status: TableStatus;
  reason?: string | null;
};

export type AreaListItem = {
  id: string;
  branchId: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type AreaDetails = AreaListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CreateAreaPayload = {
  name: string;
  description?: string | null;
  displayOrder: number;
};

export type UpdateAreaPayload = {
  name: string;
  description?: string | null;
  displayOrder: number;
};
