"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderUploadSchema = exports.ProviderSchema = exports.FTEBreakdownSchema = exports.CompensationModel = void 0;
var zod_1 = require("zod");
exports.CompensationModel = zod_1.z.enum(['BASE', 'PRODUCTIVITY', 'HYBRID', 'HOSPITALIST', 'LEADERSHIP']);
exports.FTEBreakdownSchema = zod_1.z.object({
    activity: zod_1.z.string(),
    percentage: zod_1.z.number().min(0).max(100),
});
var defaultFTEBreakdown = [{
        activity: 'Clinical',
        percentage: 100,
    }];
exports.ProviderSchema = zod_1.z.object({
    id: zod_1.z.string(),
    employeeId: zod_1.z.string().optional().nullable(),
    name: zod_1.z.string(),
    providerType: zod_1.z.string().optional().nullable(),
    specialty: zod_1.z.string().optional().nullable(),
    subspecialty: zod_1.z.string().optional().nullable(),
    fte: zod_1.z.number().min(0).max(1).nullable(),
    administrativeFte: zod_1.z.number().min(0).max(1).optional().nullable(),
    administrativeRole: zod_1.z.string().optional().nullable(),
    yearsExperience: zod_1.z.number().optional().nullable(),
    hourlyWage: zod_1.z.number().optional().nullable(),
    baseSalary: zod_1.z.number().positive().nullable(),
    originalAgreementDate: zod_1.z.string().optional().nullable(),
    organizationName: zod_1.z.string().optional().nullable(),
    startDate: zod_1.z.string().nullable(),
    contractTerm: zod_1.z.string().optional().nullable(),
    ptoDays: zod_1.z.number().optional().nullable(),
    holidayDays: zod_1.z.number().optional().nullable(),
    cmeDays: zod_1.z.number().optional().nullable(),
    cmeAmount: zod_1.z.number().optional().nullable(),
    signingBonus: zod_1.z.number().optional().nullable(),
    educationBonus: zod_1.z.number().optional().nullable(),
    qualityBonus: zod_1.z.number().optional().nullable(),
    retentionBonus: zod_1.z.any().optional().nullable(),
    relocationBonus: zod_1.z.number().optional().nullable(),
    compensationType: exports.CompensationModel.optional().nullable(),
    conversionFactor: zod_1.z.number().optional().nullable(),
    wRVUTarget: zod_1.z.number().optional().nullable(),
    compensationYear: zod_1.z.string().optional().nullable(),
    credentials: zod_1.z.string().optional().nullable(),
    compensationModel: exports.CompensationModel.optional().nullable(),
    fteBreakdown: zod_1.z.array(exports.FTEBreakdownSchema).optional().nullable(),
    templateTag: zod_1.z.string().optional().nullable(),
    dynamicFields: zod_1.z.record(zod_1.z.any()).optional().nullable(),
    createdAt: zod_1.z.string().optional().nullable(),
    updatedAt: zod_1.z.string().optional().nullable(),
    __typename: zod_1.z.literal('Provider').optional(),
});
exports.ProviderUploadSchema = zod_1.z.object({
    providers: zod_1.z.array(exports.ProviderSchema),
    templateTag: zod_1.z.string().optional(),
});
