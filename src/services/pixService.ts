import crypto from 'crypto';
import { Charge } from '../types';
import logger from '../config/logger';

export interface PixData {
  pix_code: string;
  qr_code: string;
  qr_code_text: string;
  expires_at: Date;
}

export interface PixPayment {
  id: string;
  amount: number;
  description: string;
  pix_code: string;
  qr_code: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  created_at: Date;
  paid_at?: Date;
}

export class PixService {
  private static readonly PIX_KEY = process.env.PIX_KEY || 'test@pagamentos.com';
  private static readonly PIX_MERCHANT_NAME = process.env.PIX_MERCHANT_NAME || 'Sistema de Pagamentos';
  private static readonly PIX_MERCHANT_CITY = process.env.PIX_MERCHANT_CITY || 'SAO PAULO';
  private static readonly PIX_EXPIRATION_MINUTES = parseInt(process.env.PIX_EXPIRATION_MINUTES || '30');

  /**
   * Gera um código PIX para uma cobrança
   */
  static generatePixCode(charge: Charge): PixData {
    try {
      const amount = charge.amount.toFixed(2);
      const description = charge.description.substring(0, 25); // Limita a 25 caracteres
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + this.PIX_EXPIRATION_MINUTES);

      // Gera um ID único para o PIX
      const pixId = crypto.randomBytes(16).toString('hex');

      // Cria o payload do PIX
      const pixPayload = this.createPixPayload({
        pixKey: this.PIX_KEY,
        merchantName: this.PIX_MERCHANT_NAME,
        merchantCity: this.PIX_MERCHANT_CITY,
        amount: amount,
        description: description,
        pixId: pixId
      });

      // Gera o QR Code
      const qrCode = this.generateQRCode(pixPayload);

      logger.info(`PIX code generated for charge ${charge.id}`, {
        chargeId: charge.id,
        amount: amount,
        pixId: pixId
      });

      return {
        pix_code: pixId,
        qr_code: qrCode,
        qr_code_text: pixPayload,
        expires_at: expirationDate
      };
    } catch (error) {
      logger.error('Error generating PIX code', { error, chargeId: charge.id });
      throw new Error('Erro ao gerar código PIX');
    }
  }

  /**
   * Cria o payload do PIX seguindo o padrão EMV QR Code
   */
  private static createPixPayload(data: {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    amount: string;
    description: string;
    pixId: string;
  }): string {
    const {
      pixKey,
      merchantName,
      merchantCity,
      amount,
      description,
      pixId
    } = data;

    // Estrutura do payload PIX (EMV QR Code)
    const payload = [
      // Payload Format Indicator
      '000201',
      // Point of Initiation Method
      '010212',
      // Merchant Account Information
      '26' + this.createMerchantAccountInfo(pixKey),
      // Merchant Category Code
      '52040000',
      // Transaction Currency
      '5303986',
      // Transaction Amount
      '54' + this.padLeft(amount.length.toString(), 2) + amount,
      // Country Code
      '5802BR',
      // Merchant Name
      '59' + this.padLeft(merchantName.length.toString(), 2) + merchantName,
      // Merchant City
      '60' + this.padLeft(merchantCity.length.toString(), 2) + merchantCity,
      // Additional Data Field Template
      '62' + this.createAdditionalData(description, pixId),
      // CRC16
      '6304'
    ].join('');

    // Calcula o CRC16
    const crc = this.calculateCRC16(payload);
    return payload + this.padLeft(crc.toString(16).toUpperCase(), 4);
  }

  /**
   * Cria as informações da conta do merchant
   */
  private static createMerchantAccountInfo(pixKey: string): string {
    const gui = '0014BR.GOV.BCB.PIX'; // GUI do PIX
    const key = '01' + this.padLeft(pixKey.length.toString(), 2) + pixKey;
    
    const merchantAccountInfo = gui + key;
    return this.padLeft(merchantAccountInfo.length.toString(), 2) + merchantAccountInfo;
  }

  /**
   * Cria dados adicionais (descrição e ID)
   */
  private static createAdditionalData(description: string, pixId: string): string {
    const referenceLabel = '05' + this.padLeft(description.length.toString(), 2) + description;
    const additionalData = referenceLabel;
    return this.padLeft(additionalData.length.toString(), 2) + additionalData;
  }

  /**
   * Gera o QR Code em formato de imagem (simulado)
   */
  private static generateQRCode(payload: string): string {
    // Em produção, você usaria uma biblioteca como qrcode
    // Por enquanto, retornamos uma URL simulada
    const encodedPayload = encodeURIComponent(payload);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedPayload}`;
  }

  /**
   * Calcula o CRC16 do payload
   */
  private static calculateCRC16(payload: string): number {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
      }
    }

    return crc & 0xFFFF;
  }

  /**
   * Preenche string à esquerda com zeros
   */
  private static padLeft(str: string, length: number): string {
    return str.padStart(length, '0');
  }

  /**
   * Simula a verificação de pagamento PIX
   * Em produção, isso seria integrado com a API do banco central
   */
  static async checkPixPayment(pixCode: string): Promise<{
    isPaid: boolean;
    paidAt?: Date;
    amount?: number;
  }> {
    try {
      // Simula verificação com delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Em produção, você faria uma requisição para a API do banco central
      // ou para o seu provedor de PIX
      
      // Simulação: 70% de chance de estar pago após 30 segundos
      const isPaid = Math.random() > 0.3;
      
      if (isPaid) {
        return {
          isPaid: true,
          paidAt: new Date(),
          amount: 100.00 // Valor simulado
        };
      }

      return { isPaid: false };
    } catch (error) {
      logger.error('Error checking PIX payment', { error, pixCode });
      throw new Error('Erro ao verificar pagamento PIX');
    }
  }

  /**
   * Valida se um código PIX está expirado
   */
  static isPixExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Cancela um código PIX
   */
  static async cancelPixPayment(pixCode: string): Promise<boolean> {
    try {
      // Em produção, você faria uma requisição para cancelar o PIX
      logger.info(`PIX payment cancelled`, { pixCode });
      return true;
    } catch (error) {
      logger.error('Error cancelling PIX payment', { error, pixCode });
      throw new Error('Erro ao cancelar pagamento PIX');
    }
  }

  /**
   * Gera relatório de transações PIX
   */
  static async generatePixReport(startDate: Date, endDate: Date): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    transactions: Array<{
      id: string;
      amount: number;
      status: string;
      created_at: Date;
      paid_at?: Date;
    }>;
  }> {
    try {
      // Em produção, você consultaria o banco de dados
      // Por enquanto, retornamos dados simulados
      const transactions = [
        {
          id: 'pix_001',
          amount: 100.00,
          status: 'paid',
          created_at: new Date('2024-01-15T10:00:00Z'),
          paid_at: new Date('2024-01-15T10:05:00Z')
        },
        {
          id: 'pix_002',
          amount: 250.00,
          status: 'paid',
          created_at: new Date('2024-01-15T11:00:00Z'),
          paid_at: new Date('2024-01-15T11:03:00Z')
        }
      ];

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const successRate = (transactions.filter(t => t.status === 'paid').length / transactions.length) * 100;

      return {
        totalTransactions: transactions.length,
        totalAmount,
        successRate,
        transactions
      };
    } catch (error) {
      logger.error('Error generating PIX report', { error, startDate, endDate });
      throw new Error('Erro ao gerar relatório PIX');
    }
  }
}
