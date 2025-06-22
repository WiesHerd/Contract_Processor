import { z } from 'zod';

export const CompensationModel = z.enum(['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST', 'LEADERSHIP']);
export type CompensationModel = z.infer<typeof CompensationModel>;

export const FTEBreakdownSchema = z.object({
  activity: z.string(),
  percentage: z.number().min(0).max(100),
});

export type FTEBreakdown = z.infer<typeof FTEBreakdownSchema>;

const defaultFTEBreakdown = [{
  activity: 'Clinical',
  percentage: 100,
}];

export const ProviderSchema = z.object({
  id: z.string(),
  employeeId: z.string().optional().nullable(),
  name: z.string(),
  providerType: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  subspecialty: z.string().optional().nullable(),
  fte: z.number().min(0).max(1).nullable(),
  administrativeFte: z.number().min(0).max(1).optional().nullable(),
  administrativeRole: z.string().optional().nullable(),
  yearsExperience: z.number().optional().nullable(),
  hourlyWage: z.number().optional().nullable(),
  baseSalary: z.number().positive().nullable(),
  originalAgreementDate: z.string().optional().nullable(),
  organizationName: z.string().optional().nullable(),
  startDate: z.string().nullable(),
  contractTerm: z.string().optional().nullable(),
  ptoDays: z.number().optional().nullable(),
  holidayDays: z.number().optional().nullable(),
  cmeDays: z.number().optional().nullable(),
  cmeAmount: z.number().optional().nullable(),
  signingBonus: z.number().optional().nullable(),
  educationBonus: z.number().optional().nullable(),
  qualityBonus: z.number().optional().nullable(),
  retentionBonus: z.any().optional().nullable(),
  relocationBonus: z.number().optional().nullable(),
  compensationType: CompensationModel.optional().nullable(),
  conversionFactor: z.number().optional().nullable(),
  wRVUTarget: z.number().optional().nullable(),
  compensationYear: z.string().optional().nullable(),
  credentials: z.string().optional().nullable(),
  compensationModel: CompensationModel.optional().nullable(),
  fteBreakdown: z.array(FTEBreakdownSchema).optional().nullable(),
  templateTag: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  __typename: z.literal('Provider').optional(),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const ProviderUploadSchema = z.object({
  providers: z.array(ProviderSchema),
  templateTag: z.string().optional(),
});

export type ProviderUpload = z.infer<typeof ProviderUploadSchema>;

export interface ExtendedProvider extends Provider {
  templateMatch?: string;
  generationStatus?: 'pending' | 'success' | 'error';
}

export type LoadingAction = 'uploading' | 'clearing' | 'fetching' | null;

export interface ProviderState {
  providers: Provider[];
  selectedProviders: string[];
  error: string | null;
  loading: boolean;
  loadingAction: LoadingAction;
  lastSync: string | null;
  uploadedColumns: string[];
  clearProgress?: number;
  clearTotal?: number;
  uploadProgress?: number;
  uploadTotal?: number;
} 