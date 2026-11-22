export type UserRole = 'admin' | 'profesor' | 'estudiante';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}
