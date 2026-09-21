import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.DATABASE_URI,
  },
  shopify: {
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
    shopDomain: process.env.SHOPIFY_WEBHOOK_SHOP_DOMAIN,
  },
  telegra: {
    baseUrl: process.env.TELEGRA_BASE_URL,
    username: process.env.TELEGRA_API_USERNAME,
    password: process.env.TELEGRA_API_PASSWORD,
    origin: process.env.TELEGRA_ORIGIN,
  },
}));
