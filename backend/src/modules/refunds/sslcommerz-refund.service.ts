import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SslRefundGatewayStatus = 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'UNKNOWN';

export type SslRefundInitResult = {
  raw: Record<string, unknown>;
  normalizedStatus: SslRefundGatewayStatus;
  refundRefId?: string;
  errorReason?: string;
};

@Injectable()
export class SslCommerzRefundService {
  private readonly logger = new Logger(SslCommerzRefundService.name);

  constructor(private readonly configService: ConfigService) {}

  getStoreId(): string {
    return (
      this.configService.get<string>('SSL_STORE_ID')?.trim() ||
      this.configService.get<string>('STORE_ID')?.trim() ||
      ''
    );
  }

  getStorePass(): string {
    return (
      this.configService.get<string>('SSL_STORE_PASS')?.trim() ||
      this.configService.get<string>('STORE_PASSWORD')?.trim() ||
      ''
    );
  }

  /**
   * Refund initiate + refund status query both use merchantTransIDvalidationAPI.php
   * (different query params per SSLCommerz v4).
   */
  getRefundApiUrl(): string {
    const explicit = this.configService.get<string>('SSL_REFUND_URL')?.trim();
    if (explicit) {
      return explicit;
    }

    const base = this.configService
      .get<string>('SSL_BASE_URL')
      ?.replace(/\/$/, '')
      ?.trim();
    if (base) {
      return `${base}/validator/api/merchantTransIDvalidationAPI.php`;
    }

    const sslUrl = this.configService.get<string>('SSLCOMMERZ_URL')?.trim();
    if (sslUrl) {
      try {
        const u = new URL(sslUrl);
        return `${u.origin}/validator/api/merchantTransIDvalidationAPI.php`;
      } catch {
        this.logger.warn(
          'SSLCOMMERZ_URL is not a valid URL; using sandbox refund API host.',
        );
      }
    }

    return 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php';
  }

  private parseJsonObject(text: string): Record<string, unknown> {
    try {
      const v = JSON.parse(text) as unknown;
      return typeof v === 'object' && v !== null && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  normalizeGatewayStatus(status: unknown): SslRefundGatewayStatus {
    const s = String(status ?? '').toUpperCase();
    if (s === 'SUCCESS') return 'SUCCESS';
    if (s === 'FAILED' || s === 'FAIL' || s === 'CANCELLED') return 'FAILED';
    if (s === 'PROCESSING' || s === 'PENDING') return 'PROCESSING';
    return 'UNKNOWN';
  }

  pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
    return undefined;
  }

  async initiateRefund(params: {
    bankTranId: string;
    amount: number;
    reason: string;
    refundTransId: string;
    refeId: string;
  }): Promise<SslRefundInitResult> {
    const storeId = this.getStoreId();
    const storePass = this.getStorePass();
    if (!storeId || !storePass) {
      throw new BadGatewayException(
        'SSLCommerz store credentials are not configured',
      );
    }

    const url = new URL(this.getRefundApiUrl());
    url.searchParams.set('bank_tran_id', params.bankTranId);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('store_passwd', storePass);
    url.searchParams.set('refund_amount', params.amount.toFixed(2));
    url.searchParams.set(
      'refund_remarks',
      params.reason.slice(0, 255),
    );
    url.searchParams.set('refe_id', params.refeId.slice(0, 50));
    url.searchParams.set('refund_trans_id', params.refundTransId.slice(0, 30));
    url.searchParams.set('format', 'json');

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const text = await response.text();
      const raw = this.parseJsonObject(text);
      if (!response.ok) {
        this.logger.warn(
          `SSL refund HTTP ${response.status}: ${text.slice(0, 500)}`,
        );
        throw new BadGatewayException(
          'SSLCommerz refund request failed (HTTP error)',
        );
      }

      const normalizedStatus = this.normalizeGatewayStatus(
        raw.status ?? raw.Status,
      );
      const refundRefId = this.pickString(raw, 'refund_ref_id', 'refundRefId');
      const errorReason = this.pickString(raw, 'errorReason', 'error_reason');

      return {
        raw,
        normalizedStatus,
        refundRefId,
        errorReason,
      };
    } catch (e) {
      if (e instanceof BadGatewayException) throw e;
      this.logger.error(
        'SSLCommerz initiateRefund exception',
        e instanceof Error ? e.stack : String(e),
      );
      throw new BadGatewayException(
        'SSLCommerz refund request failed (network or parse error)',
      );
    }
  }

  async queryRefundStatus(refundRefId: string): Promise<Record<string, unknown>> {
    const storeId = this.getStoreId();
    const storePass = this.getStorePass();
    if (!storeId || !storePass) {
      throw new BadGatewayException(
        'SSLCommerz store credentials are not configured',
      );
    }

    const url = new URL(this.getRefundApiUrl());
    url.searchParams.set('refund_ref_id', refundRefId);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('store_passwd', storePass);
    url.searchParams.set('format', 'json');

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const text = await response.text();
      const raw = this.parseJsonObject(text);
      if (!response.ok) {
        throw new BadGatewayException(
          `SSLCommerz refund status HTTP ${response.status}`,
        );
      }
      return raw;
    } catch (e) {
      if (e instanceof BadGatewayException) throw e;
      this.logger.error(
        'SSLCommerz queryRefundStatus exception',
        e instanceof Error ? e.stack : String(e),
      );
      throw new BadGatewayException(
        'SSLCommerz refund status request failed (network or parse error)',
      );
    }
  }
}
