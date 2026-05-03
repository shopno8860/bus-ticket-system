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
  /** SSL `APIConnect` field (e.g. DONE, FAILED, INVALID_REQUEST). */
  apiConnect?: string;
  /** Primary `status` from SSL initiate response (e.g. success, failed, processing). */
  sslStatus?: string;
  /** Some SSL responses include a separate approval line (e.g. Cancel). */
  approvalStatus?: string;
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

  pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
    return undefined;
  }

  /**
   * Walks nested objects (shallow depth) to find any field whose path suggests
   * "approval status" and whose value is Cancel / Failed / etc. SSL merchant UI
   * can show Request=Success while a separate approval line is Cancel.
   */
  private detectDeclinedApprovalInResponse(
    node: unknown,
    depth = 0,
    path = '',
  ): string | undefined {
    if (depth > 4 || node === null || node === undefined) return undefined;
    if (typeof node !== 'object' || Array.isArray(node)) return undefined;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const inner = this.detectDeclinedApprovalInResponse(v, depth + 1, fullPath);
        if (inner) return inner;
        continue;
      }
      if (typeof v === 'boolean') continue;
      if (v === undefined || v === null) continue;
      const val = String(v).trim();
      if (!val) continue;

      const pathKey = `${fullPath}`.toLowerCase();
      const looksLikeApprovalField =
        pathKey.includes('approval') ||
        pathKey.replace(/[\s_-]/g, '').includes('approvalstatus');

      if (!looksLikeApprovalField) continue;

      const lower = val.toLowerCase();
      const negative =
        lower === 'cancel' ||
        lower === 'cancelled' ||
        lower === 'canceled' ||
        lower.includes('cancel') ||
        lower.includes('fail') ||
        lower.includes('reject') ||
        lower.includes('declin') ||
        lower.includes('denied');
      if (negative) {
        return `Gateway declined refund (${fullPath}=${val})`;
      }
    }
    return undefined;
  }

  private resolveApprovalStatusString(raw: Record<string, unknown>): string | undefined {
    const direct = this.pickString(
      raw,
      'approval_status',
      'Approval_Status',
      'ApprovalStatus',
      'approvalStatus',
      'refund_approval_status',
      'RefundApprovalStatus',
      'Approval Status',
    );
    if (direct) return direct;
    for (const [k, v] of Object.entries(raw)) {
      if (v === null || v === undefined || typeof v === 'object') continue;
      const nk = k.toLowerCase().replace(/[\s_-]+/g, '');
      if (nk.includes('approval') && nk.includes('status')) {
        const s = String(v).trim();
        if (s) return s;
      }
    }
    return undefined;
  }

  /**
   * Maps a single SSL `status` token (initiate or query) to a coarse outcome.
   * Initiate refund uses: success | failed | processing (per SSL docs).
   */
  normalizeGatewayStatus(status: unknown): SslRefundGatewayStatus {
    const s = String(status ?? '').toUpperCase();
    if (s === 'SUCCESS' || s === 'REFUNDED') return 'SUCCESS';
    if (
      s === 'FAILED' ||
      s === 'FAIL' ||
      s === 'CANCELLED' ||
      s === 'CANCELED' ||
      s === 'CANCEL'
    ) {
      return 'FAILED';
    }
    if (s === 'PROCESSING' || s === 'PENDING') return 'PROCESSING';
    return 'UNKNOWN';
  }

  /**
   * Interprets SSLCommerz **initiate refund** JSON strictly:
   * - `APIConnect` must be DONE before trusting `status`.
   * - Optional `ApprovalStatus` / `approval_status` must not indicate cancel/fail.
   * - `success` + refund_ref_id is the documented happy path.
   */
  private interpretInitiateRefundResponse(raw: Record<string, unknown>): SslRefundInitResult {
    const apiConnect =
      this.pickString(raw, 'APIConnect', 'APICONNECT', 'ApiConnect') ?? '';
    const apiConnectUpper = apiConnect.toUpperCase();

    const sslStatus = this.pickString(
      raw,
      'status',
      'Status',
      'request_status',
      'Request_Status',
      'RequestStatus',
    );
    const approvalStatus = this.resolveApprovalStatusString(raw);

    const refundRefId = this.pickString(raw, 'refund_ref_id', 'refundRefId');
    const errorReason = this.pickString(
      raw,
      'errorReason',
      'error_reason',
      'errorMessage',
      'ErrorReason',
    );

    if (apiConnectUpper && apiConnectUpper !== 'DONE') {
      return {
        raw,
        normalizedStatus: 'FAILED',
        refundRefId,
        errorReason:
          errorReason ||
          `SSL APIConnect is not DONE (got ${apiConnect})`,
        apiConnect: apiConnect || undefined,
        sslStatus,
        approvalStatus,
      };
    }

    const approvalLower = (approvalStatus ?? '').toLowerCase();
    if (
      approvalLower &&
      ['cancel', 'cancelled', 'canceled', 'fail', 'failed', 'reject', 'declined', 'denied'].some(
        (token) => approvalLower.includes(token),
      )
    ) {
      return {
        raw,
        normalizedStatus: 'FAILED',
        refundRefId,
        errorReason:
          errorReason ||
          (approvalStatus
            ? `Gateway approval status: ${approvalStatus}`
            : 'Refund declined by gateway'),
        apiConnect: apiConnect || undefined,
        sslStatus,
        approvalStatus,
      };
    }

    if (!apiConnectUpper) {
      return {
        raw,
        normalizedStatus: 'FAILED',
        refundRefId,
        errorReason:
          errorReason || 'SSL response missing APIConnect; cannot verify refund outcome',
        sslStatus,
        approvalStatus,
      };
    }

    const declinedByNestedApproval = this.detectDeclinedApprovalInResponse(raw);
    if (declinedByNestedApproval) {
      return {
        raw,
        normalizedStatus: 'FAILED',
        refundRefId,
        errorReason: errorReason || declinedByNestedApproval,
        apiConnect: apiConnect || undefined,
        sslStatus,
        approvalStatus,
      };
    }

    if (!sslStatus) {
      if (refundRefId && apiConnectUpper === 'DONE') {
        return {
          raw,
          normalizedStatus: 'SUCCESS',
          refundRefId,
          errorReason,
          apiConnect: apiConnect || undefined,
          sslStatus: undefined,
          approvalStatus,
        };
      }
      return {
        raw,
        normalizedStatus: 'UNKNOWN',
        refundRefId,
        errorReason: errorReason || 'Missing status and refund_ref_id in SSL response',
        apiConnect: apiConnect || undefined,
        sslStatus,
        approvalStatus,
      };
    }

    const normalized = this.normalizeGatewayStatus(sslStatus);
    if (normalized === 'UNKNOWN') {
      return {
        raw,
        normalizedStatus: 'UNKNOWN',
        refundRefId,
        errorReason: errorReason || `Unrecognized SSL status: ${sslStatus}`,
        apiConnect: apiConnect || undefined,
        sslStatus,
        approvalStatus,
      };
    }

    if (normalized === 'SUCCESS' && !refundRefId) {
      return {
        raw,
        normalizedStatus: 'UNKNOWN',
        errorReason:
          errorReason ||
          'SSL reported success but did not return refund_ref_id; refusing to treat as success',
        apiConnect: apiConnect || undefined,
        sslStatus,
        approvalStatus,
      };
    }

    return {
      raw,
      normalizedStatus: normalized,
      refundRefId,
      errorReason,
      apiConnect: apiConnect || undefined,
      sslStatus,
      approvalStatus,
    };
  }

  /**
   * Parses SSLCommerz **refund query** JSON (`refund_ref_id` call). Documented
   * `status` values include refunded, processing, cancelled.
   */
  interpretRefundQueryResponse(raw: Record<string, unknown>): {
    normalizedStatus: SslRefundGatewayStatus;
    sslStatus?: string;
    errorReason?: string;
    apiConnect?: string;
  } {
    const apiConnect =
      this.pickString(raw, 'APIConnect', 'APICONNECT', 'ApiConnect') ?? '';
    const apiConnectUpper = apiConnect.toUpperCase();
    const errorReason = this.pickString(
      raw,
      'errorReason',
      'error_reason',
      'errorMessage',
      'ErrorReason',
    );

    if (apiConnectUpper && apiConnectUpper !== 'DONE') {
      return {
        normalizedStatus: 'FAILED',
        errorReason:
          errorReason || `SSL APIConnect is not DONE (got ${apiConnect})`,
        apiConnect: apiConnect || undefined,
      };
    }

    if (!apiConnectUpper) {
      return {
        normalizedStatus: 'FAILED',
        errorReason:
          errorReason || 'SSL query response missing APIConnect',
      };
    }

    const declined = this.detectDeclinedApprovalInResponse(raw);
    if (declined) {
      return {
        normalizedStatus: 'FAILED',
        errorReason: errorReason || declined,
        apiConnect: apiConnect || undefined,
      };
    }

    const sslStatus = this.pickString(raw, 'status', 'Status');
    const s = (sslStatus ?? '').toLowerCase();

    if (s === 'refunded') {
      return {
        normalizedStatus: 'SUCCESS',
        sslStatus,
        apiConnect: apiConnect || undefined,
      };
    }
    if (s === 'processing') {
      return {
        normalizedStatus: 'PROCESSING',
        sslStatus,
        apiConnect: apiConnect || undefined,
      };
    }
    if (
      s === 'cancelled' ||
      s === 'canceled' ||
      s === 'failed' ||
      s === 'cancel'
    ) {
      return {
        normalizedStatus: 'FAILED',
        sslStatus,
        errorReason: errorReason || `SSL query status: ${sslStatus}`,
        apiConnect: apiConnect || undefined,
      };
    }

    if (!sslStatus) {
      return {
        normalizedStatus: 'UNKNOWN',
        errorReason: errorReason || 'Missing status in SSL query response',
        apiConnect: apiConnect || undefined,
      };
    }

    const normalized = this.normalizeGatewayStatus(sslStatus);
    return {
      normalizedStatus: normalized,
      sslStatus,
      errorReason,
      apiConnect: apiConnect || undefined,
    };
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
    url.searchParams.set('refund_remarks', params.reason.slice(0, 255));
    url.searchParams.set('refe_id', params.refeId.slice(0, 50));
    url.searchParams.set('refund_trans_id', params.refundTransId.slice(0, 30));
    url.searchParams.set('format', 'json');
    url.searchParams.set('v', '1');

    const safeLogUrl = (() => {
      const u = new URL(url.toString());
      u.searchParams.set('store_passwd', '***');
      return u.toString();
    })();
    this.logger.log(`SSL refund initiate URL (redacted): ${safeLogUrl}`);

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const text = await response.text();
      const raw = this.parseJsonObject(text);

      // Requested diagnostic — full gateway body (no secrets; body is SSL response only)
      console.log('SSL Refund Response:', raw);
      this.logger.log(`SSL Refund Response: ${JSON.stringify(raw)}`);

      if (!response.ok) {
        this.logger.warn(
          `SSL refund HTTP ${response.status}: ${text.slice(0, 500)}`,
        );
        throw new BadGatewayException(
          'SSLCommerz refund request failed (HTTP error)',
        );
      }

      const interpreted = this.interpretInitiateRefundResponse(raw);
      this.logger.log(
        `SSL refund interpreted: normalized=${interpreted.normalizedStatus} apiConnect=${interpreted.apiConnect ?? ''} sslStatus=${interpreted.sslStatus ?? ''} approval=${interpreted.approvalStatus ?? ''} refundRefId=${interpreted.refundRefId ?? ''}`,
      );

      return interpreted;
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
    url.searchParams.set('v', '1');

    try {
      const response = await fetch(url.toString(), { method: 'GET' });
      const text = await response.text();
      const raw = this.parseJsonObject(text);
      console.log('SSL Refund Query Response:', raw);
      this.logger.log(`SSL Refund Query Response: ${JSON.stringify(raw)}`);
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
