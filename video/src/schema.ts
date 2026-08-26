import { z } from 'zod';

export const PromoSchema = z.object({
  tagline: z.string().default('Ask. Analyze. Accelerate.'),
  ctaText: z.string().default('Start your free trial today'),
});

export type PromoProps = z.infer<typeof PromoSchema>;
