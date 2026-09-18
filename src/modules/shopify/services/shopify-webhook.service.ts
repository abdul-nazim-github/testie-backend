import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ShopifyWebhook,
  ShopifyWebhookDocument,
} from '../schemas/shopify-webhook.schema';
import {
  WebhookResponse,
  ShopifyWebhookHeaders,
} from '../interfaces/shopify-webhook.interfaces';
import { TelegraService } from '../../telegra/services/telegra.service';
import { PRODUCT_VARIATION_MAP } from '../mappings/product-variation.mapping';

@Injectable()
export class ShopifyWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);

  constructor(
    @InjectModel(ShopifyWebhook.name)
    private readonly webhookModel: Model<ShopifyWebhookDocument>,
    private readonly telegraService: TelegraService,
  ) { }

  async processWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: Record<string, unknown>,
  ): Promise<WebhookResponse> {
    const webhookMeta = this.extractHeaders(headers);

    if (!webhookMeta.webhookId) {
      this.logger.warn('Webhook received without X-Shopify-Webhook-Id header');
      throw new BadRequestException({
        success: false,
        message: 'Missing X-Shopify-Webhook-Id header',
      });
    }

    const startTime = Date.now();

    try {
      const webhook = new this.webhookModel({
        topic: webhookMeta.topic,
        shop_domain: webhookMeta.shopDomain,
        webhook_id: webhookMeta.webhookId,
        api_version: webhookMeta.apiVersion ?? undefined,
        payload,
        headers: headers,
      });

      await webhook.save();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Webhook stored and processed: id=${webhookMeta.webhookId} topic=${webhookMeta.topic} shop=${webhookMeta.shopDomain} duration=${duration}ms`,
      );

      // Create patient and order in Telegra if it's an order creation webhook
      try {
        const patientPayload = this.buildPatientPayload(payload);
        if (patientPayload) {
          const patientResponse = await this.telegraService.createPatient(patientPayload);

          // Only call createOrder if the patient was successfully created
          if (patientResponse) {
            const orderPayload = this.buildOrderPayload(payload, patientPayload);
            if (orderPayload) {
              const orderResponse = await this.telegraService.createOrder(orderPayload);
              if (orderResponse) {
                // await this.telegraService.submitOrder(orderResponse.id);
                this.logger.log(`Order created successfully for webhook: id=${webhookMeta.webhookId}`);
              } else {
                this.logger.warn(`Order creation may have failed silently. Skipping order submission for webhook: id=${webhookMeta.webhookId}`);
              }
            }
          } else {
            this.logger.warn(`Patient creation may have failed silently. Skipping order creation for webhook: id=${webhookMeta.webhookId}`);
          }
        }
      } catch (err: any) {
        this.logger.error(`Failed to create patient/order for webhook: id=${webhookMeta.webhookId}`, err?.message || err);
        // We log the error but don't fail the webhook processing since the webhook is already stored successfully
      }

      return {
        success: true,
        message: 'Shopify webhook received successfully',
      };
    } catch (error: unknown) {
      const mongoError = error as { code?: number };

      // Handle MongoDB unique constraint violation (duplicate webhook)
      if (mongoError.code === 11000) {
        this.logger.warn(
          `Duplicate webhook received: id=${webhookMeta.webhookId}`,
        );
        return {
          success: true,
          message: 'Shopify webhook received successfully',
        };
      }

      this.logger.error(
        `Failed to store webhook: id=${webhookMeta.webhookId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private extractHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): ShopifyWebhookHeaders {
    return {
      topic: (headers['x-shopify-topic'] as string) || 'unknown',
      shopDomain: (headers['x-shopify-shop-domain'] as string) || 'unknown',
      webhookId: headers['x-shopify-webhook-id'] as string | undefined,
      apiVersion: headers['x-shopify-api-version'] as string | undefined,
    };
  }

  private buildPatientPayload(payload: any): any | null {
    if (!payload) return null;

    // Extract from note_attributes
    const noteAttributes = Array.isArray(payload.note_attributes) ? payload.note_attributes : [];
    const getNoteAttribute = (key: string) => noteAttributes.find((attr: any) => attr.name === key)?.value;

    const customer = payload.customer || {};

    let firstName = getNoteAttribute('first_name') || getNoteAttribute('firstName');
    let lastName = getNoteAttribute('last_name') || getNoteAttribute('lastName');
    let email = getNoteAttribute('email');

    if (!firstName) firstName = customer.first_name;
    if (!lastName) lastName = customer.last_name;
    if (!email) email = customer.email || payload.email;

    // If still missing essential data, maybe we can't create a patient.
    if (!firstName && !lastName && !email) {
      return null;
    }

    let dateOfBirth = getNoteAttribute('dob') || getNoteAttribute('dateOfBirth');
    // The webhook JSON might have dob as YYYY-MM-DD, convert to MM-DD-YYYY for Telegra
    if (dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      const [year, month, day] = dateOfBirth.split('-');
      dateOfBirth = `${month}-${day}-${year}`;
    }

    const gender = getNoteAttribute('gender') || getNoteAttribute('genderBiological');
    const genderBiological = gender || getNoteAttribute('genderBiological');

    // Attempt to find phone from customer or addresses
    let phone = getNoteAttribute('phone') || customer.phone;
    if (!phone && payload.billing_address) phone = payload.billing_address.phone;
    if (!phone && payload.shipping_address) phone = payload.shipping_address.phone;

    let height = getNoteAttribute('height');
    if (height) {
      const parsedHeight = parseFloat(String(height).replace(/[^\d.]/g, ''));
      if (!isNaN(parsedHeight)) {
        // height from webhook is in cm, convert to inches
        height = (parsedHeight / 2.54).toFixed(1);
      }
    }

    const weight = getNoteAttribute('weight');

    return {
      dateOfBirth: dateOfBirth || '',
      email: email || '',
      firstName: firstName || '',
      gender: gender || '',
      genderBiological: genderBiological || '',
      lastName: lastName || '',
      phone: phone || '',
      height: height ? String(height) : '',
      weight: weight ? String(weight) : '',
    };
  }

  private buildOrderPayload(payload: any, patientPayload: any): any | null {
    if (!payload) return null;

    const billingAddress = payload.billing_address || payload.shipping_address || {};
    // If no address at all, might not be able to create order, but let's build what we can

    const billing = {
      address1: billingAddress.address1 || '',
      address2: billingAddress.address2 || '',
      city: billingAddress.city || '',
      state: billingAddress.province || '', // shopify uses province
      zipcode: billingAddress.zip || '',
    };

    // Requested by user: shipping will be same as billing
    const shipping = { ...billing };

    // Determine product variation dynamically based on line_items[0].product_id
    let productVariation = 'pvt::bf28e536-9e5c-4d0e-9e91-a7b6dca86542'; // Default
    let quantity = 1;

    if (payload.line_items && payload.line_items.length > 0) {
      const lineItem = payload.line_items[0];
      const productId = String(lineItem.product_id);

      if (PRODUCT_VARIATION_MAP[productId]) {
        productVariation = PRODUCT_VARIATION_MAP[productId];
      }

      if (lineItem.quantity) {
        quantity = lineItem.quantity;
      }
    }

    const orderPatientPayload = {
      dateOfBirth: patientPayload.dateOfBirth,
      email: patientPayload.email,
      firstName: patientPayload.firstName,
      gender: patientPayload.gender,
      lastName: patientPayload.lastName,
      phone: patientPayload.phone,
    };

    return {
      address: {
        billing,
        shipping,
      },
      patient: orderPatientPayload,
      productVariations: [
        {
          productVariation,
          quantity,
        },
      ],
    };
  }
}
