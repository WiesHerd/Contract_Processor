import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncCollection } from "@aws-amplify/datastore";



type EagerFTEBreakdownComponent = {
  readonly activity: string;
  readonly percentage: number;
}

type LazyFTEBreakdownComponent = {
  readonly activity: string;
  readonly percentage: number;
}

export declare type FTEBreakdownComponent = LazyLoading extends LazyLoadingDisabled ? EagerFTEBreakdownComponent : LazyFTEBreakdownComponent

export declare const FTEBreakdownComponent: (new (init: ModelInit<FTEBreakdownComponent>) => FTEBreakdownComponent)

type EagerProviderConnection = {
  readonly items?: (Provider | null)[] | null;
  readonly nextToken?: string | null;
}

type LazyProviderConnection = {
  readonly items: AsyncCollection<Provider>;
  readonly nextToken?: string | null;
}

export declare type ProviderConnection = LazyLoading extends LazyLoadingDisabled ? EagerProviderConnection : LazyProviderConnection

export declare const ProviderConnection: (new (init: ModelInit<ProviderConnection>) => ProviderConnection)

type EagerTemplate = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Template, 'id'>;
  };
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly version?: string | null;
  readonly s3Key: string;
  readonly type?: string | null;
  readonly contractYear?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly owner?: string | null;
}

type LazyTemplate = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Template, 'id'>;
  };
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly version?: string | null;
  readonly s3Key: string;
  readonly type?: string | null;
  readonly contractYear?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly owner?: string | null;
}

export declare type Template = LazyLoading extends LazyLoadingDisabled ? EagerTemplate : LazyTemplate

export declare const Template: (new (init: ModelInit<Template>) => Template) & {
  copyOf(source: Template, mutator: (draft: MutableModel<Template>) => MutableModel<Template> | void): Template;
}

type EagerProvider = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Provider, 'id'>;
  };
  readonly id: string;
  readonly employeeId?: string | null;
  readonly name: string;
  readonly providerType?: string | null;
  readonly specialty?: string | null;
  readonly subspecialty?: string | null;
  readonly fte?: number | null;
  readonly administrativeFte?: number | null;
  readonly administrativeRole?: string | null;
  readonly yearsExperience?: number | null;
  readonly hourlyWage?: number | null;
  readonly baseSalary?: number | null;
  readonly originalAgreementDate?: string | null;
  readonly organizationName?: string | null;
  readonly startDate?: string | null;
  readonly contractTerm?: string | null;
  readonly ptoDays?: number | null;
  readonly holidayDays?: number | null;
  readonly cmeDays?: number | null;
  readonly cmeAmount?: number | null;
  readonly signingBonus?: number | null;
  readonly educationBonus?: number | null;
  readonly qualityBonus?: number | null;
  readonly compensationType?: string | null;
  readonly conversionFactor?: number | null;
  readonly wRVUTarget?: number | null;
  readonly compensationYear?: string | null;
  readonly credentials?: string | null;
  readonly compensationModel?: string | null;
  readonly fteBreakdown?: (FTEBreakdownComponent | null)[] | null;
  readonly templateTag?: string | null;
  readonly dynamicFields?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly owner?: string | null;
}

type LazyProvider = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Provider, 'id'>;
  };
  readonly id: string;
  readonly employeeId?: string | null;
  readonly name: string;
  readonly providerType?: string | null;
  readonly specialty?: string | null;
  readonly subspecialty?: string | null;
  readonly fte?: number | null;
  readonly administrativeFte?: number | null;
  readonly administrativeRole?: string | null;
  readonly yearsExperience?: number | null;
  readonly hourlyWage?: number | null;
  readonly baseSalary?: number | null;
  readonly originalAgreementDate?: string | null;
  readonly organizationName?: string | null;
  readonly startDate?: string | null;
  readonly contractTerm?: string | null;
  readonly ptoDays?: number | null;
  readonly holidayDays?: number | null;
  readonly cmeDays?: number | null;
  readonly cmeAmount?: number | null;
  readonly signingBonus?: number | null;
  readonly educationBonus?: number | null;
  readonly qualityBonus?: number | null;
  readonly compensationType?: string | null;
  readonly conversionFactor?: number | null;
  readonly wRVUTarget?: number | null;
  readonly compensationYear?: string | null;
  readonly credentials?: string | null;
  readonly compensationModel?: string | null;
  readonly fteBreakdown?: (FTEBreakdownComponent | null)[] | null;
  readonly templateTag?: string | null;
  readonly dynamicFields?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly owner?: string | null;
}

export declare type Provider = LazyLoading extends LazyLoadingDisabled ? EagerProvider : LazyProvider

export declare const Provider: (new (init: ModelInit<Provider>) => Provider) & {
  copyOf(source: Provider, mutator: (draft: MutableModel<Provider>) => MutableModel<Provider> | void): Provider;
}

type EagerTemplateMapping = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TemplateMapping, 'id'>;
  };
  readonly id: string;
  readonly templateID: string;
  readonly field: string;
  readonly value?: string | null;
  readonly notes?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly owner?: string | null;
}

type LazyTemplateMapping = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TemplateMapping, 'id'>;
  };
  readonly id: string;
  readonly templateID: string;
  readonly field: string;
  readonly value?: string | null;
  readonly notes?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly owner?: string | null;
}

export declare type TemplateMapping = LazyLoading extends LazyLoadingDisabled ? EagerTemplateMapping : LazyTemplateMapping

export declare const TemplateMapping: (new (init: ModelInit<TemplateMapping>) => TemplateMapping) & {
  copyOf(source: TemplateMapping, mutator: (draft: MutableModel<TemplateMapping>) => MutableModel<TemplateMapping> | void): TemplateMapping;
}

type EagerMapping = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Mapping, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly templateID: string;
  readonly providerID: string;
  readonly field: string;
  readonly value?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyMapping = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Mapping, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly templateID: string;
  readonly providerID: string;
  readonly field: string;
  readonly value?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Mapping = LazyLoading extends LazyLoadingDisabled ? EagerMapping : LazyMapping

export declare const Mapping: (new (init: ModelInit<Mapping>) => Mapping) & {
  copyOf(source: Mapping, mutator: (draft: MutableModel<Mapping>) => MutableModel<Mapping> | void): Mapping;
}

type EagerClause = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Clause, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly text: string;
  readonly tags?: (string | null)[] | null;
  readonly condition?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyClause = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Clause, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly text: string;
  readonly tags?: (string | null)[] | null;
  readonly condition?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Clause = LazyLoading extends LazyLoadingDisabled ? EagerClause : LazyClause

export declare const Clause: (new (init: ModelInit<Clause>) => Clause) & {
  copyOf(source: Clause, mutator: (draft: MutableModel<Clause>) => MutableModel<Clause> | void): Clause;
}

type EagerAuditLog = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<AuditLog, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly action: string;
  readonly user?: string | null;
  readonly timestamp: string;
  readonly details?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyAuditLog = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<AuditLog, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly action: string;
  readonly user?: string | null;
  readonly timestamp: string;
  readonly details?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type AuditLog = LazyLoading extends LazyLoadingDisabled ? EagerAuditLog : LazyAuditLog

export declare const AuditLog: (new (init: ModelInit<AuditLog>) => AuditLog) & {
  copyOf(source: AuditLog, mutator: (draft: MutableModel<AuditLog>) => MutableModel<AuditLog> | void): AuditLog;
}

type EagerContractGenerationLog = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<ContractGenerationLog, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly providerId: string;
  readonly contractYear: string;
  readonly templateId: string;
  readonly generatedAt: string;
  readonly generatedBy?: string | null;
  readonly outputType?: string | null;
  readonly status?: string | null;
  readonly fileUrl?: string | null;
  readonly notes?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyContractGenerationLog = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<ContractGenerationLog, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly providerId: string;
  readonly contractYear: string;
  readonly templateId: string;
  readonly generatedAt: string;
  readonly generatedBy?: string | null;
  readonly outputType?: string | null;
  readonly status?: string | null;
  readonly fileUrl?: string | null;
  readonly notes?: string | null;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type ContractGenerationLog = LazyLoading extends LazyLoadingDisabled ? EagerContractGenerationLog : LazyContractGenerationLog

export declare const ContractGenerationLog: (new (init: ModelInit<ContractGenerationLog>) => ContractGenerationLog) & {
  copyOf(source: ContractGenerationLog, mutator: (draft: MutableModel<ContractGenerationLog>) => MutableModel<ContractGenerationLog> | void): ContractGenerationLog;
}