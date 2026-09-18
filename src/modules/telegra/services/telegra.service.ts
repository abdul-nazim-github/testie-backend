import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { TelegraAuthResponse } from '../interfaces/telegra-auth-response.interface';
import { TelegraApiLog, TelegraApiLogDocument } from '../schemas/telegra-api-log.schema';


@Injectable()
export class TelegraService {
  private readonly logger = new Logger(TelegraService.name);
  private cachedToken: string | null = null;

  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly origin: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectModel(TelegraApiLog.name) private readonly apiLogModel: Model<TelegraApiLogDocument>,
  ) {
    this.baseUrl = this.configService.get<string>('app.telegra.baseUrl')!;
    this.username = this.configService.get<string>('app.telegra.username')!;
    this.password = this.configService.get<string>('app.telegra.password')!;
    this.origin = this.configService.get<string>('app.telegra.origin')!;
  }

  private async logApiCall(logData: Partial<TelegraApiLog>) {
    try {
      await this.apiLogModel.create(logData);
    } catch (err) {
      this.logger.error('Failed to log Telegra API call', err);
    }
  }

  /**
   * Centralized HTTP request handler for Telegra API.
   * Handles authentication headers, logging, and automatic retries for expired tokens.
   */
  private async makeRequest<T>(
    apiName: string,
    endpoint: string,
    method: string,
    payload: any = {},
    requiresAuth: boolean = true,
    isRetry: boolean = false,
  ): Promise<T> {
    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseData: any = null;

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      if (endpoint !== '/auth/client') {
        headers['Origin'] = this.origin;
      }

      if (requiresAuth) {
        const token = await this.getToken();
        headers['Authorization'] = `Bearer ${token}`;
      } else if (apiName === 'Auth') {
        const authHeader = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        headers['Authorization'] = `Basic ${authHeader}`;
      }

      const response = await firstValueFrom(
        this.httpService.request({
          url: `${this.baseUrl}${endpoint}`,
          method,
          data: payload,
          headers,
        })
      );

      statusCode = response.status;
      responseData = response.data;

      let safePayload = {};
      try { safePayload = payload ? JSON.parse(JSON.stringify(payload)) : {}; } catch (e) { }

      await this.logApiCall({
        api_name: apiName,
        endpoint,
        method,
        payload: safePayload,
        response: responseData,
        response_status_code: statusCode ?? undefined,
        status: 'success',
        duration_ms: Date.now() - startTime,
      });

      return responseData;
    } catch (error: any) {
      statusCode = error?.response?.status || 500;
      const errorData = error?.response?.data || null;
      const errorMessage = error?.message || 'Unknown error';

      // Deep clone to strip ANY hidden circular references or methods
      let safePayload = {};
      try { safePayload = payload ? JSON.parse(JSON.stringify(payload)) : {}; } catch (e) { }

      let safeError = {};
      try { safeError = errorData ? JSON.parse(JSON.stringify(errorData)) : { name: error?.name, message: errorMessage, code: error?.code }; } catch (e) { }

      await this.logApiCall({
        api_name: apiName,
        endpoint,
        method,
        payload: safePayload,
        response: safeError, // save the error data in the response field as well for visibility
        response_status_code: statusCode ?? undefined,
        error: safeError,
        error_message: errorMessage,
        status: 'failed',
        duration_ms: Date.now() - startTime,
      });

      if (statusCode === 401 && requiresAuth && !isRetry) {
        this.logger.warn(`Telegra token expired during ${apiName}. Retrying...`);
        this.clearToken();
        return this.makeRequest<T>(apiName, endpoint, method, payload, requiresAuth, true);
      }

      this.logger.error(`Failed ${apiName} API call`, errorData || errorMessage);
      throw error;
    }
  }

  /**
   * Retrieves the Telegra API token.
   * Uses a cached token if available, otherwise fetches a new one.
   * If forceRefresh is true, it skips the cache.
   */
  async getToken(forceRefresh = false): Promise<string> {
    if (this.cachedToken && !forceRefresh) {
      return this.cachedToken;
    }

    this.logger.debug('Fetching new Telegra auth token...');
    const data = await this.makeRequest<TelegraAuthResponse>('Auth', '/auth/client', 'POST', {}, false);

    if (!data?.token) {
      throw new UnauthorizedException('No token found in Telegra auth response');
    }

    this.cachedToken = data.token;
    this.logger.debug('Successfully retrieved and cached Telegra auth token.');
    return this.cachedToken;
  }

  /**
   * Clears the cached token.
   * Useful when an API call fails due to an expired token.
   */
  clearToken(): void {
    this.cachedToken = null;
    this.logger.debug('Cleared Telegra auth token cache.');
  }

  /**
   * Creates a patient in Telegra.
   */
  async createPatient(payload: any): Promise<any> {
    this.logger.debug('Creating patient in Telegra...');
    const data = await this.makeRequest('Create Patient', '/patients', 'POST', payload, true);
    this.logger.log('Successfully created patient in Telegra.');
    return data;
  }

  /**
   * Creates an order in Telegra.
   */
  async createOrder(payload: any): Promise<any> {
    this.logger.debug('Creating order in Telegra...');
    const data = await this.makeRequest('Create Order', '/orders', 'POST', payload, true);
    this.logger.log('Successfully created order in Telegra.');
    // await this.fetchAndSaveLabOrder((data as any)?.id);
    return data;
  }

  /**
   * Submits an order in Telegra.
   */
  // async submitOrder(orderId: string): Promise<any> {
  //   this.logger.debug(`Submitting order in Telegra: ${orderId}...`);
  //   const data = await this.makeRequest('Submit Order', `/orders/${orderId}/submit`, 'POST', {}, true);
  //   this.logger.log(`Successfully submitted order in Telegra: ${orderId}.`);
  //   return data;
  // }

  /**
   * Fetches the lab order details from Telegra and saves them to the DB.
   */
  // async fetchAndSaveLabOrder(orderId: string): Promise<void> {
  //   try {
  //     this.logger.debug(`Fetching lab order details for: ${orderId}...`);
  //     const labOrderData = await this.makeRequest('Get Lab Order', `/labOrders/${orderId}`, 'GET', {}, true);

  //     await this.labOrderModel.create({
  //       orderId,
  //       data: labOrderData,
  //     });
  //     this.logger.log(`Successfully saved lab order details for: ${orderId}.`);
  //   } catch (error) {
  //     this.logger.error(`Failed to fetch or save lab order details for: ${orderId}`, error instanceof Error ? error.message : error);
  //   }
  // }
}
