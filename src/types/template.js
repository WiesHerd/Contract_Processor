"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSchema = exports.ClauseSchema = void 0;
var zod_1 = require("zod");
var provider_1 = require("./provider");
exports.ClauseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    content: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    conditions: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum(['equals', 'notEquals', 'greaterThan', 'lessThan', 'exists']),
        value: zod_1.z.any(),
    })).optional(),
});
exports.TemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string(),
    compensationModel: provider_1.CompensationModel,
    tags: zod_1.z.array(zod_1.z.string()),
    clauses: zod_1.z.array(exports.ClauseSchema),
    metadata: zod_1.z.object({
        createdAt: zod_1.z.string(),
        updatedAt: zod_1.z.string(),
        createdBy: zod_1.z.string(),
        lastModifiedBy: zod_1.z.string(),
    }),
    docxTemplate: zod_1.z.string().optional(),
    htmlPreviewContent: zod_1.z.string().optional(),
    editedHtmlContent: zod_1.z.string().optional(),
    contractYear: zod_1.z.string().optional(),
    placeholders: zod_1.z.array(zod_1.z.string()),
    clauseIds: zod_1.z.array(zod_1.z.string()),
    content: zod_1.z.string().optional(),
    versionHistory: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        html: zod_1.z.string(),
    })).optional(),
});
