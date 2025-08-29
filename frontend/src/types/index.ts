// Tipos compartilhados com o backend
export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  role: 'admin' | 'user' | 'merchant';
  status: 'active' | 'inactive' | 'suspended';
  kyc_status: 'pending' | 'approved' | 'rejected';
  balance: number;
  daily_limit: number;
  monthly_limit: number;
  transaction_limit: number;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Charge {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  total_amount: number;
  description: string;
  payment_method: 'pix' | 'boleto' | 'card';
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed';
  pix_code?: string;
  pix_qr_code?: string;
  boleto_code?: string;
  boleto_url?: string;
  expires_at: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    email: string;
    document: string;
  };
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  bank_account: {
    bank_code: string;
    agency: string;
    account: string;
    account_type: 'checking' | 'savings';
  };
  description: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'charge' | 'payout';
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  document_type: 'cpf' | 'cnpj' | 'rg' | 'passport';
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_users: number;
  total_charges: number;
  total_payouts: number;
  total_volume: number;
  pending_kyc: number;
  recent_transactions: Transaction[];
  monthly_revenue: {
    month: string;
    amount: number;
  }[];
}

export interface UserStats {
  total_charges: number;
  total_payouts: number;
  total_volume: number;
  success_rate: number;
  recent_transactions: Transaction[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Tipos específicos do frontend
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  cpf?: string;
  phone?: string;
  role?: 'user' | 'merchant';
}

export interface CreateChargeForm {
  amount: number;
  description: string;
  payment_method: 'pix' | 'boleto' | 'card';
  expires_at: string;
  customer: {
    name: string;
    email: string;
    document: string;
  };
}

export interface CreatePayoutForm {
  amount: number;
  bank_account: {
    bank_code: string;
    agency: string;
    account: string;
    account_type: 'checking' | 'savings';
  };
  description: string;
}

export interface CreateWebhookForm {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateProfileForm {
  name: string;
  phone?: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Estados de loading
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Contexto de autenticação
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginForm) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// Filtros para listagens
export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'charge' | 'payout';
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  kyc_status?: string;
  search?: string;
}

// Notificações
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Configurações do sistema
export interface SystemSettings {
  default_currency: string;
  min_charge_amount: number;
  max_charge_amount: number;
  default_fee_percentage: number;
  default_fee_fixed: number;
  kyc_required: boolean;
  default_daily_limit: number;
  default_monthly_limit: number;
  default_transaction_limit: number;
}

// Relatórios
export interface Report {
  id: string;
  type: 'financial' | 'operational' | 'user';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  data: any;
  generated_at: string;
  file_url?: string;
}
