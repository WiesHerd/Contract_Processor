"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const { Amplify } = require("aws-amplify");
const config = require("../src/amplifyconfiguration.json");

// Import the static clause data
const CLAUSES = [
  {
    id: 'noncompete',
    title: 'Non-Compete Clause',
    content: 'The Physician agrees not to engage in any competing practice within 25 miles of {{OrganizationName}} for a period of {{NonCompeteTerm}} years after termination.',
    type: 'standard',
    category: 'restrictive',
    tags: ['non-compete', 'restrictive'],
    applicableProviderTypes: ['physician'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'malpractice',
    title: 'Malpractice Insurance Clause',
    content: 'Employer shall provide malpractice insurance coverage, including tail coverage, for the Physician during the term of employment.',
    type: 'standard',
    category: 'benefits',
    tags: ['insurance', 'malpractice'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'termination',
    title: 'Termination Clause',
    content: 'Either party may terminate this Agreement with {{NoticePeriod}} days written notice.',
    type: 'standard',
    category: 'termination',
    tags: ['termination', 'notice'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'moonlighting',
    title: 'Moonlighting Clause',
    content: 'The Physician may not engage in outside employment (moonlighting) without prior written approval from Employer.',
    type: 'standard',
    category: 'restrictive',
    tags: ['moonlighting', 'restrictive'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'callcoverage',
    title: 'Call Coverage Clause',
    content: 'The Physician shall participate in call coverage as scheduled by Employer and shall receive compensation as outlined in Schedule B.',
    type: 'standard',
    category: 'compensation',
    tags: ['call', 'duties'],
    applicableProviderTypes: ['physician'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'relocation',
    title: 'Relocation Repayment Clause',
    content: 'If the Physician voluntarily terminates employment within 24 months of start date, any relocation bonus paid must be repaid in full.',
    type: 'standard',
    category: 'compensation',
    tags: ['relocation', 'repayment'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'signingbonus',
    title: 'Signing Bonus Repayment Clause',
    content: 'If the Physician voluntarily terminates employment within 12 months of start date, any signing bonus paid must be repaid in full.',
    type: 'standard',
    category: 'compensation',
    tags: ['signing-bonus', 'repayment'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'cme',
    title: 'CME Allowance Clause',
    content: 'The Physician shall be entitled to reimbursement for continuing medical education expenses up to $3,000 per contract year.',
    type: 'standard',
    category: 'benefits',
    tags: ['cme', 'education'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'pto',
    title: 'PTO Policy Clause',
    content: 'The Physician shall be entitled to 20 business days of paid time off per contract year, in addition to 8 paid holidays.',
    type: 'standard',
    category: 'benefits',
    tags: ['pto', 'time-off'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'telemedicine',
    title: 'Telemedicine Clause',
    content: 'The Physician may provide telemedicine services as approved by Employer and in accordance with applicable laws.',
    type: 'standard',
    category: 'other',
    tags: ['telemedicine', 'duties'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'fmv',
    title: 'FMV Exception/Override Clause',
    content: 'All compensation described herein has been determined to be consistent with fair market value for the services provided and is commercially reasonable.',
    type: 'standard',
    category: 'compensation',
    tags: ['fmv', 'compensation'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'retention',
    title: 'Retention Bonus Clause',
    content: 'The Physician shall be eligible for a retention bonus as outlined in Schedule B, subject to continued employment.',
    type: 'standard',
    category: 'compensation',
    tags: ['retention', 'bonus'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'productivity',
    title: 'Productivity Incentive Clause',
    content: 'The Physician shall be eligible for productivity-based compensation as described in Schedule B.',
    type: 'standard',
    category: 'compensation',
    tags: ['productivity', 'incentive'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['productivity', 'hybrid'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'restrictive',
    title: 'Restrictive Covenant Clause',
    content: 'The Physician agrees to abide by all confidentiality, non-solicitation, and non-disparagement provisions as set forth in this Agreement.',
    type: 'standard',
    category: 'restrictive',
    tags: ['restrictive', 'covenant'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  }
];

// Patch config to use env endpoint if present
const amplifyConfig = __assign(__assign({}, config), { aws_appsync_graphqlEndpoint: process.env.VITE_AWS_APPSYNC_GRAPHQL_ENDPOINT || config.aws_appsync_graphqlEndpoint });
Amplify.configure(amplifyConfig);

// Import the GraphQL client and mutations
const { generateClient } = require('aws-amplify/api');
const { createClause } = require('../src/graphql/mutations');

const client = generateClient();

async function uploadClauses() {
    let success = 0;
    let failed = 0;
    
    console.log('Starting clause upload to DynamoDB...');
    console.log(`Found ${CLAUSES.length} clauses to upload`);
    
    for (const clause of CLAUSES) {
        try {
            // Map to API CreateClauseInput
            const input = {
                id: clause.id,
                text: clause.content,
                tags: clause.tags,
                condition: clause.conditions?.[0]?.value || undefined,
                createdAt: clause.createdAt,
                updatedAt: clause.updatedAt,
            };
            
            await client.graphql({
                query: createClause,
                variables: { input }
            });
            
            console.log(`✅ Uploaded: ${clause.title}`);
            success++;
        } catch (err) {
            console.error(`❌ Failed to upload: ${clause.title}`, err.message);
            failed++;
        }
    }
    
    console.log(`\n📊 Upload complete. Success: ${success}, Failed: ${failed}`);
    
    if (failed > 0) {
        console.log('\n⚠️  Some clauses failed to upload. Check the errors above.');
    } else {
        console.log('\n🎉 All clauses uploaded successfully!');
    }
}

uploadClauses().catch(err => {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
});
