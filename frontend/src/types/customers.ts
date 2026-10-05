export type CustomerListItem = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  isActive: boolean;
  membershipLevelCode: string;
  membershipLevelName: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
};

export type CustomerPointTransaction = {
  id: string;
  orderId?: string | null;
  pointsDelta: number;
  reason: string;
  createdAt: string;
};

export type CustomerDetails = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  isActive: boolean;
  membershipLevelCode: string;
  membershipLevelName: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  pointTransactions: CustomerPointTransaction[];
};

export type CreateCustomerRequest = {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  initialPoints?: number;
};

export type UpdateCustomerRequest = {
  fullName: string;
  phone: string;
  email?: string;
  isActive: boolean;
};

export type AdjustPointsRequest = {
  pointsDelta: number;
  reason: string;
  orderId?: string;
};

export type MembershipLevel = {
  id: string;
  code: string;
  name: string;
  minimumPoints: number;
};
