import { apiRequest } from "./client";
import type {
  EmployeeItem,
  EmployeeDetails,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  RoleItem,
} from "@/types/employees";

export const employeeApi = {
  getEmployees(params?: {
    branchId?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<EmployeeItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.branchId) searchParams.set("branchId", params.branchId);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
    const qs = searchParams.toString();
    return apiRequest<EmployeeItem[]>(`/api/employees${qs ? `?${qs}` : ""}`);
  },

  getEmployee(id: string): Promise<EmployeeDetails> {
    return apiRequest<EmployeeDetails>(`/api/employees/${id}`);
  },

  createEmployee(payload: CreateEmployeePayload): Promise<EmployeeDetails> {
    return apiRequest<EmployeeDetails>("/api/employees", {
      method: "POST",
      body: payload,
    });
  },

  updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<EmployeeDetails> {
    return apiRequest<EmployeeDetails>(`/api/employees/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteEmployee(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/employees/${id}`, {
      method: "DELETE",
    });
  },

  getRoles(): Promise<RoleItem[]> {
    return apiRequest<RoleItem[]>("/api/employees/roles");
  },
};
