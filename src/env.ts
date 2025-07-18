import { z } from 'zod/v4'

const envSchema = z.object({
  HTTP_PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ORIGIN: z.string().optional(),
  SQL_SERVER: z.string().default('localhost'),
  SQL_USER: z.string(),
  SQL_PASSWORD: z.string(),
  SQL_DATABASE: z.string().default('master'),
  SQL_PORT: z.coerce.number().default(1433),
  SQL_TRUST_CERT: z.stringbool(),
  SQL_ENCRYPT: z.stringbool(),
})

export const env = envSchema.parse(process.env)
