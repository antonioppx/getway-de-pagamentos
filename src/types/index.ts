// Tipos de usuário
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MERCHANT = 'merchant',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_KYC = 'pending_kyc',
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required',
}

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  document: string;
  documentType: 'cpf' | 'cnpj';
  phone: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: KycStatus;
  kycDocuments?: KycDocument[];
  balance: number;
  dailyLimit: number;
  monthlyLimit: number;
  transactionLimit: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface KycDocument {
  id: string;
  userId: string;
  type: 'cpf' | 'cnpj' | 'rg' | 'comprovante_residencia';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

// Tipos de transação
export enum TransactionType {
  CHARGE = 'charge',
  PAYOUT = 'payout',
  TRANSFER = 'transfer',
  REFUND = 'refund',
  FEE = 'fee',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PaymentMethod {
  PIX = 'pix',
  BOLETO = 'boleto',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  description: string;
  externalId?: string;
  metadata?: Record<string, any>;
  processedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de cobrança
export interface Charge {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  externalId?: string;
  pixKey?: string;
  pixQrCode?: string;
  boletoCode?: string;
  boletoUrl?: string;
  metadata?: Record<string, any>;
  expiresAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de payout
export interface Payout {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  accountType: 'checking' | 'savings';
  beneficiaryName: string;
  beneficiaryDocument: string;
  status: TransactionStatus;
  externalId?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de configuração
export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt: Date;
}

export interface FeeSettings {
  id: string;
  paymentMethod: PaymentMethod;
  percentage: number;
  fixed: number;
  minAmount: number;
  maxAmount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de webhook
export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  responseCode?: number;
  responseBody?: string;
  createdAt: Date;
}

// Tipos de autenticação
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Tipos de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos de validação
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Tipos de auditoria
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

// Tipos de notificação
export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// Tipos de relatório
export interface Report {
  id: string;
  userId: string;
  type: 'transaction' | 'financial' | 'user';
  format: 'pdf' | 'csv' | 'xlsx';
  filters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Tipos de cache
export interface CacheConfig {
  ttl: number;
  prefix: string;
}

// Tipos de rate limiting
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

// Tipos de upload
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Tipos de email
export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Tipos de dashboard
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalVolume: number;
  pendingTransactions: number;
  failedTransactions: number;
  revenue: number;
  fees: number;
}

export interface UserDashboardStats {
  balance: number;
  totalTransactions: number;
  totalVolume: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
}
