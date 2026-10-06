export type DashboardOrderStatus = number;

export interface DashboardHourly {
  hour: number;
  revenue: number;
}

export interface DashboardTopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  tableNumber: string | null;
  status: DashboardOrderStatus;
  totalAmount: number;
  summary: string;
}

export interface DashboardKitchenOrder {
  id: string;
  orderNumber: string;
  tableNumber: string | null;
  status: number;
  createdAt: string;
  waitingMinutes: number;
}

export interface DashboardData {
  revenueToday: number;
  revenueYesterday: number;
  revenueMonth: number;
  revenueLastMonth: number;
  revenueRange: number;
  orderCountToday: number;
  orderCountRange: number;
  waitingKitchenCount: number;
  tablesTotal: number;
  tablesOccupied: number;
  hourly: DashboardHourly[];
  topProducts: DashboardTopProduct[];
  topByRevenue: DashboardTopProduct[];
  recentOrders: DashboardRecentOrder[];
  kitchenOrderCount: number;
  kitchenOrders: DashboardKitchenOrder[];
}

export type DashboardRange = "today" | "yesterday" | "week" | "month";
