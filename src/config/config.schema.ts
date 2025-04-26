import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Node environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Server
  PORT: Joi.number().default(8080),
  WEBSOCKET_PORT: Joi.number().default(8081),
  CORS_ORIGIN: Joi.string().default('*'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SCHEMA: Joi.string().default('public'),
  DB_SSL: Joi.boolean().default(false),

  // Authentication
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('24h'),

  // Application settings
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  MAX_QUEUE_SIZE: Joi.number().default(1000),
  JOB_RETENTION_DAYS: Joi.number().default(30),
  HEARTBEAT_TIMEOUT_SECONDS: Joi.number().default(180),
});