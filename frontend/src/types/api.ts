export type Permission = string;

export type EmployeeProfile = {
  id: string;
  branchId: string;
  employeeCode: string;
  fullName: string;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  employee: EmployeeProfile | null;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserProfile;
};

export type Branch = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
};

export type ApiProblem = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
};

export type ApiError = Error & { status?: number; problem?: ApiProblem };