import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthResponse, 
  User, 
  Charge, 
  Payout, 
  Transaction, 
  Webhook, 
  KycDocument,
  DashboardStats,
  UserStats,
  PaginatedResponse,
  ApiResponse,
  LoginForm,
  RegisterForm,
  CreateChargeForm,
  CreatePayoutForm,
  CreateWebhookForm,
  UpdateProfileForm,
  TransactionFilters,
  UserFilters
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expirado, redirecionar para login
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // Carregar token do localStorage
    this.loadToken();
  }

  private loadToken(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.setToken(token);
    }
  }

  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  public getToken(): string | null {
    return this.token;
  }

  // Autenticação
  public async login(credentials: LoginForm): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/login', credentials);
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.access_token);
      localStorage.setItem('refresh_token', response.data.data.refresh_token);
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro no login');
  }

  public async register(userData: RegisterForm): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/register', userData);
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.access_token);
      localStorage.setItem('refresh_token', response.data.data.refresh_token);
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro no registro');
  }

  public async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('Refresh token não encontrado');
    }

    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/refresh', {
      refresh_token: refreshToken
    });
    
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.access_token);
      localStorage.setItem('refresh_token', response.data.data.refresh_token);
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao renovar token');
  }

  public async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await this.api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Erro no logout:', error);
      }
    }
    this.clearToken();
  }

  public async verifyToken(): Promise<User> {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await this.api.get('/auth/verify');
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }
    throw new Error(response.data.error || 'Token inválido');
  }

  // Usuários
  public async getProfile(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/users/profile');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar perfil');
  }

  public async updateProfile(profileData: UpdateProfileForm): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put('/users/profile', profileData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao atualizar perfil');
  }

  public async getBalance(): Promise<{ balance: number }> {
    const response: AxiosResponse<ApiResponse<{ balance: number }>> = await this.api.get('/users/balance');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar saldo');
  }

  public async getTransactions(filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Transaction>>> = await this.api.get(`/users/transactions?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar transações');
  }

  public async uploadKycDocument(documentType: string, file: File): Promise<KycDocument> {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);

    const response: AxiosResponse<ApiResponse<KycDocument>> = await this.api.post('/users/kyc', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao enviar documento');
  }

  public async getKycDocuments(): Promise<KycDocument[]> {
    const response: AxiosResponse<ApiResponse<KycDocument[]>> = await this.api.get('/users/kyc');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar documentos');
  }

  public async getUserStats(): Promise<UserStats> {
    const response: AxiosResponse<ApiResponse<UserStats>> = await this.api.get('/users/stats');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar estatísticas');
  }

  // Cobranças
  public async createCharge(chargeData: CreateChargeForm): Promise<Charge> {
    const response: AxiosResponse<ApiResponse<Charge>> = await this.api.post('/charges', chargeData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao criar cobrança');
  }

  public async getCharges(filters?: TransactionFilters): Promise<PaginatedResponse<Charge>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Charge>>> = await this.api.get(`/charges?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar cobranças');
  }

  public async getCharge(id: string): Promise<Charge> {
    const response: AxiosResponse<ApiResponse<Charge>> = await this.api.get(`/charges/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar cobrança');
  }

  public async cancelCharge(id: string): Promise<Charge> {
    const response: AxiosResponse<ApiResponse<Charge>> = await this.api.post(`/charges/${id}/cancel`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao cancelar cobrança');
  }

  // Payouts
  public async createPayout(payoutData: CreatePayoutForm): Promise<Payout> {
    const response: AxiosResponse<ApiResponse<Payout>> = await this.api.post('/payouts', payoutData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao criar payout');
  }

  public async getPayouts(filters?: TransactionFilters): Promise<PaginatedResponse<Payout>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Payout>>> = await this.api.get(`/payouts?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar payouts');
  }

  public async getPayout(id: string): Promise<Payout> {
    const response: AxiosResponse<ApiResponse<Payout>> = await this.api.get(`/payouts/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar payout');
  }

  // Webhooks
  public async createWebhook(webhookData: CreateWebhookForm): Promise<Webhook> {
    const response: AxiosResponse<ApiResponse<Webhook>> = await this.api.post('/webhooks', webhookData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao criar webhook');
  }

  public async getWebhooks(): Promise<Webhook[]> {
    const response: AxiosResponse<ApiResponse<Webhook[]>> = await this.api.get('/webhooks');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar webhooks');
  }

  public async getWebhook(id: string): Promise<Webhook> {
    const response: AxiosResponse<ApiResponse<Webhook>> = await this.api.get(`/webhooks/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar webhook');
  }

  public async updateWebhook(id: string, webhookData: Partial<CreateWebhookForm>): Promise<Webhook> {
    const response: AxiosResponse<ApiResponse<Webhook>> = await this.api.put(`/webhooks/${id}`, webhookData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao atualizar webhook');
  }

  public async deleteWebhook(id: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.delete(`/webhooks/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Erro ao deletar webhook');
    }
  }

  public async testWebhook(id: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.post(`/webhooks/${id}/test`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Erro ao testar webhook');
    }
  }

  // Admin
  public async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<ApiResponse<DashboardStats>> = await this.api.get('/admin/dashboard');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar dashboard');
  }

  public async getUsers(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<PaginatedResponse<User>>> = await this.api.get(`/admin/users?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao carregar usuários');
  }

  public async updateUserKyc(userId: string, kycStatus: string, notes?: string): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put(`/admin/users/${userId}/kyc`, {
      kyc_status: kycStatus,
      notes
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Erro ao atualizar KYC');
  }

  // Health Check
  public async healthCheck(): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/health');
    return response.data;
  }

  public async detailedHealthCheck(): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/health/detailed');
    return response.data;
  }
}

// Instância singleton
const apiService = new ApiService();
export default apiService;
