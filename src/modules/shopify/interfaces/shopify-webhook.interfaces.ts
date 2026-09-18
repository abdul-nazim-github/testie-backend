/** Standard webhook API response structure */
export interface WebhookResponse {
  success: boolean;
  message: string;
}

/** Extracted Shopify webhook header values */
export interface ShopifyWebhookHeaders {
  topic: string;
  shopDomain: string;
  webhookId: string | undefined;
  apiVersion: string | undefined;
}
