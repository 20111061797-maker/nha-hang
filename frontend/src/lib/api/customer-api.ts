import { apiRequest } from "./client";
import type {
  CustomerListItem,
  CustomerDetails,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  AdjustPointsRequest,
  MembershipLevel,
} from "@/types/customers";

export const customerApi = {
  getCustomers(search?: string): Promise<CustomerListItem[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiRequest<CustomerListItem[]>(`/api/customers${q}`);
  },

  getCustomer(id: string): Promise<CustomerDetails> {
    return apiRequest<CustomerDetails>(`/api/customers/${id}`);
  },

  createCustomer(payload: CreateCustomerRequest): Promise<CustomerDetails> {
    return apiRequest<CustomerDetails>("/api/customers", {
      method: "POST",
      body: payload,
    });
  },

  updateCustomer(id: string, payload: UpdateCustomerRequest): Promise<CustomerDetails> {
    return apiRequest<CustomerDetails>(`/api/customers/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  adjustPoints(id: string, payload: AdjustPointsRequest): Promise<CustomerDetails> {
    return apiRequest<CustomerDetails>(`/api/customers/${id}/points`, {
      method: "POST",
      body: payload,
    });
  },

  getMembershipLevels(): Promise<MembershipLevel[]> {
    return apiRequest<MembershipLevel[]>("/api/customers/membership-levels");
  },
};
