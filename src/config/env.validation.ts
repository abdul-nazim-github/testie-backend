import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URI: Joi.string().required(),

  SHOPIFY_WEBHOOK_SECRET: Joi.string().required(),

  TELEGRA_BASE_URL: Joi.string().uri().required(),
  TELEGRA_API_USERNAME: Joi.string().required(),
  TELEGRA_API_PASSWORD: Joi.string().required(),
  TELEGRA_ORIGIN: Joi.string().required(),
});
