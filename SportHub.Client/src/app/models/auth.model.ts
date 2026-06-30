export interface LoginRequest {
  email : string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface AuthResponse {
  id: number;
  name: string;
  email: string;
  role: 'Customer' | 'Admin';
  token: string;
}


