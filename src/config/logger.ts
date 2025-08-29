import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Configuração dos níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para os logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Formato para arquivos (sem cores)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Configuração dos transportes
const transports = [
  // Console
  new winston.transports.Console({
    format,
    level: process.env.LOG_LEVEL || 'info',
  }),

  // Arquivo de logs gerais
  new DailyRotateFile({
    filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: 'info',
  }),

  // Arquivo de logs de erro
  new DailyRotateFile({
    filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    level: 'error',
  }),

  // Arquivo de logs HTTP
  new DailyRotateFile({
    filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    format: fileFormat,
    level: 'http',
  }),
];

// Criação do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Middleware para logs HTTP
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

// Função para log de requisições HTTP
export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
    };

    if (res.statusCode >= 400) {
      httpLogger.error('HTTP Request Error', logData);
    } else {
      httpLogger.http('HTTP Request', logData);
    }
  });

  next();
};

// Função para log de erros
export const logError = (error: Error, req?: any) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    url: req?.url,
    method: req?.method,
    ip: req?.ip,
    userId: req?.user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
  };

  logger.error('Application Error', errorData);
};

// Função para log de auditoria
export const logAudit = (action: string, userId: string, details: any) => {
  const auditData = {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip,
  };

  logger.info('Audit Log', auditData);
};

// Função para log de transações financeiras
export const logTransaction = (transactionId: string, type: string, amount: number, userId: string, status: string) => {
  const transactionData = {
    transactionId,
    type,
    amount,
    userId,
    status,
    timestamp: new Date().toISOString(),
  };

  logger.info('Transaction Log', transactionData);
};

export default logger;
