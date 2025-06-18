import { z } from 'zod';

export const CompensationModel = z.enum(['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST', 'LEADERSHIP']);
export type CompensationModel = z.infer<typeof CompensationModel>;

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  fte: z.number().min(0).max(1),
  baseSalary: z.number().positive(),
  compensationModel: CompensationModel,
  wRVUTarget: z.number().optional(),
  conversionFactor: z.number().optional(),
  retentionBonus: z.object({
    amount: z.number(),
    vestingPeriod: z.number(),
  }).optional(),
  longTermIncentive: z.object({
    amount: z.number(),
    vestingPeriod: z.number(),
  }).optional(),
  fteBreakdown: z.array(z.object({
    activity: z.string(),
    percentage: z.number().min(0).max(100),
  })),
  templateTag: z.string().optional(),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const ProviderUploadSchema = z.object({
  providers: z.array(ProviderSchema),
  templateTag: z.string().optional(),
});

export type ProviderUpload = z.infer<typeof ProviderUploadSchema>;

export interface ProviderState {
  providers: Provider[];
  selectedProviders: string[];
  loading: boolean;
  error: string | null;
} 