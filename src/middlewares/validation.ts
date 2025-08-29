import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '@/config/logger';

// Interface para erros de validação
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Função para formatar erros de validação
const formatValidationErrors = (error: Joi.ValidationError): ValidationError[] => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
};

// Middleware de validação genérico
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = formatValidationErrors(error);
      
      logger.warn('Erro de validação', {
        errors: validationErrors,
        body: req.body,
        url: req.url,
        method: req.method
      });

      res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Substituir req.body pelos dados validados
    req.body = value;
    next();
  };
};

// Middleware para validar parâmetros de query
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = formatValidationErrors(error);
      
      logger.warn('Erro de validação de query', {
        errors: validationErrors,
        query: req.query,
        url: req.url,
        method: req.method
      });

      res.status(400).json({
        success: false,
        error: 'Parâmetros de consulta inválidos',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.query = value;
    next();
  };
};

// Middleware para validar parâmetros de URL
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = formatValidationErrors(error);
      
      logger.warn('Erro de validação de parâmetros', {
        errors: validationErrors,
        params: req.params,
        url: req.url,
        method: req.method
      });

      res.status(400).json({
        success: false,
        error: 'Parâmetros de URL inválidos',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.params = value;
    next();
  };
};

// Schemas de validação comuns

// Validação de UUID
export const uuidSchema = Joi.string().uuid().required();

// Validação de email
export const emailSchema = Joi.string().email().required();

// Validação de senha
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base': 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
    'string.min': 'A senha deve ter pelo menos 8 caracteres',
    'string.max': 'A senha deve ter no máximo 128 caracteres'
  });

// Validação de CPF
export const cpfSchema = Joi.string()
  .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)
  .required()
  .messages({
    'string.pattern.base': 'CPF deve estar no formato 000.000.000-00 ou 00000000000'
  });

// Validação de CNPJ
export const cnpjSchema = Joi.string()
  .pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/)
  .required()
  .messages({
    'string.pattern.base': 'CNPJ deve estar no formato 00.000.000/0000-00 ou 00000000000000'
  });

// Validação de telefone
export const phoneSchema = Joi.string()
  .pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)
  .required()
  .messages({
    'string.pattern.base': 'Telefone deve estar no formato (00) 00000-0000'
  });

// Validação de valor monetário
export const amountSchema = Joi.number()
  .positive()
  .precision(2)
  .min(0.01)
  .max(1000000.00)
  .required()
  .messages({
    'number.positive': 'O valor deve ser positivo',
    'number.min': 'O valor mínimo é R$ 0,01',
    'number.max': 'O valor máximo é R$ 1.000.000,00'
  });

// Validação de paginação
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('asc', 'desc').default('desc'),
  orderBy: Joi.string().default('created_at')
});

// Schemas específicos para diferentes endpoints

// Schema para registro de usuário
export const registerUserSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  document: Joi.alternatives().try(cpfSchema, cnpjSchema).required(),
  documentType: Joi.string().valid('cpf', 'cnpj').required(),
  phone: phoneSchema,
  role: Joi.string().valid('user', 'merchant').default('user')
});

// Schema para login
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required()
});

// Schema para recuperação de senha
export const forgotPasswordSchema = Joi.object({
  email: emailSchema
});

// Schema para redefinição de senha
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema
});

// Schema para atualização de perfil
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(100),
  lastName: Joi.string().min(2).max(100),
  phone: phoneSchema,
  document: Joi.alternatives().try(cpfSchema, cnpjSchema),
  documentType: Joi.string().valid('cpf', 'cnpj')
});

// Schema para criação de cobrança
export const createChargeSchema = Joi.object({
  amount: amountSchema,
  description: Joi.string().min(3).max(500).required(),
  paymentMethod: Joi.string().valid('pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer').required(),
  currency: Joi.string().valid('BRL').default('BRL'),
  expiresAt: Joi.date().min('now').optional(),
  metadata: Joi.object().optional()
});

// Schema para criação de payout
export const createPayoutSchema = Joi.object({
  amount: amountSchema,
  bankCode: Joi.string().length(3).required(),
  bankName: Joi.string().min(2).max(100).required(),
  agency: Joi.string().min(1).max(10).required(),
  account: Joi.string().min(1).max(20).required(),
  accountType: Joi.string().valid('checking', 'savings').required(),
  beneficiaryName: Joi.string().min(2).max(255).required(),
  beneficiaryDocument: Joi.alternatives().try(cpfSchema, cnpjSchema).required(),
  currency: Joi.string().valid('BRL').default('BRL')
});

// Schema para configurações de taxa
export const feeSettingsSchema = Joi.object({
  paymentMethod: Joi.string().valid('pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer').required(),
  percentage: Joi.number().min(0).max(100).precision(2).required(),
  fixed: Joi.number().min(0).max(10000).precision(2).required(),
  minAmount: Joi.number().positive().precision(2).required(),
  maxAmount: Joi.number().positive().precision(2).required(),
  active: Joi.boolean().default(true)
});

// Schema para webhook
export const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string().valid(
    'charge.created',
    'charge.paid',
    'charge.expired',
    'charge.cancelled',
    'payout.created',
    'payout.processed',
    'payout.failed',
    'user.kyc.approved',
    'user.kyc.rejected'
  )).min(1).required(),
  active: Joi.boolean().default(true)
});

// Schema para filtros de transações
export const transactionFiltersSchema = Joi.object({
  type: Joi.string().valid('charge', 'payout', 'transfer', 'refund', 'fee'),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'),
  paymentMethod: Joi.string().valid('pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer'),
  startDate: Joi.date(),
  endDate: Joi.date().min(Joi.ref('startDate')),
  minAmount: Joi.number().positive(),
  maxAmount: Joi.number().positive().min(Joi.ref('minAmount')),
  ...paginationSchema.describe().keys
});

// Schema para configurações do sistema
export const systemSettingsSchema = Joi.object({
  key: Joi.string().min(1).max(100).required(),
  value: Joi.string().required(),
  description: Joi.string().max(500)
});

// Schema para upload de arquivo KYC
export const kycDocumentSchema = Joi.object({
  type: Joi.string().valid('cpf', 'cnpj', 'rg', 'comprovante_residencia').required(),
  description: Joi.string().max(500)
});

// Função para validar CPF
export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Função para validar CNPJ
export const validateCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleanCNPJ.charAt(13))) return false;
  
  return true;
};

// Middleware para validar documento baseado no tipo
export const validateDocument = (req: Request, res: Response, next: NextFunction): void => {
  const { document, documentType } = req.body;
  
  if (!document || !documentType) {
    next();
    return;
  }
  
  let isValid = false;
  
  if (documentType === 'cpf') {
    isValid = validateCPF(document);
  } else if (documentType === 'cnpj') {
    isValid = validateCNPJ(document);
  }
  
  if (!isValid) {
    res.status(400).json({
      success: false,
      error: `${documentType.toUpperCase()} inválido`,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};
