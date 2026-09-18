/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { ShopifyWebhookService } from './shopify-webhook.service';
import { ShopifyWebhook } from '../schemas/shopify-webhook.schema';

describe('ShopifyWebhookService', () => {
  let service: ShopifyWebhookService;

  const mockSave = jest.fn();

  class MockWebhookModel {
    constructor(private data: any) {}
    save = mockSave;
  }

  const validHeaders: Record<string, string> = {
    'x-shopify-topic': 'orders/create',
    'x-shopify-shop-domain': 'test-store.myshopify.com',
    'x-shopify-webhook-id': 'wh-unique-123',
    'x-shopify-api-version': '2024-01',
  };

  const validPayload = { order_id: 12345, total_price: '99.99' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyWebhookService,
        {
          provide: getModelToken(ShopifyWebhook.name),
          useValue: MockWebhookModel,
        },
      ],
    }).compile();

    service = module.get<ShopifyWebhookService>(ShopifyWebhookService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    it('should persist a valid webhook', async () => {
      mockSave.mockResolvedValueOnce({ id: 'uuid-1', ...validPayload });

      const result = await service.processWebhook(validHeaders, validPayload);

      expect(result).toEqual({
        success: true,
        message: 'Shopify webhook received successfully',
      });
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when X-Shopify-Webhook-Id is missing', async () => {
      const headersWithoutId = { ...validHeaders };
      delete headersWithoutId['x-shopify-webhook-id'];

      await expect(
        service.processWebhook(headersWithoutId, validPayload),
      ).rejects.toThrow(BadRequestException);

      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should return success for duplicate webhooks (MongoDB 11000)', async () => {
      const uniqueViolationError = new Error('duplicate key value') as Error & {
        code?: number;
      };
      uniqueViolationError.code = 11000;
      mockSave.mockRejectedValueOnce(uniqueViolationError);

      const result = await service.processWebhook(validHeaders, validPayload);

      expect(result).toEqual({
        success: true,
        message: 'Shopify webhook received successfully',
      });
    });

    it('should re-throw non-duplicate database errors', async () => {
      const connectionError = new Error('connection refused') as Error & {
        code?: number;
      };
      connectionError.code = 12345;
      mockSave.mockRejectedValueOnce(connectionError);

      await expect(
        service.processWebhook(validHeaders, validPayload),
      ).rejects.toThrow('connection refused');
    });
  });
});
