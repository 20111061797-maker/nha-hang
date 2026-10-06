export type EmployeeItem = {
  id: string;
  branchId: string;
  branchName: string;
  employeeCode: string;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  userId?: string | null;
  username?: string | null;
  email?: string | null;
  roles: string[];
  createdAt: string;
};

export type EmployeeDetails = EmployeeItem & {
  updatedAt: string;
};

export type CreateEmployeePayload = {
  branchId: string;
  employeeCode?: string;
  fullName: string;
  phone?: string;
  role?: string;
  createLoginAccount: boolean;
  username?: string;
  password?: string;
  email?: string;
};

export type UpdateEmployeePayload = {
  branchId: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  role?: string;
  newPassword?: string;
};

export type RoleItem = {
  id: string;
  name: string;
  description?: string | null;
};
