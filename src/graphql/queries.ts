/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const listProviderYears = /* GraphQL */ `query ListProviderYears {
  listProviderYears
}
` as GeneratedQuery<
  APITypes.ListProviderYearsQueryVariables,
  APITypes.ListProviderYearsQuery
>;
export const getTemplate = /* GraphQL */ `query GetTemplate($id: ID!) {
  getTemplate(id: $id) {
    id
    name
    description
    version
    s3Key
    type
    contractYear
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetTemplateQueryVariables,
  APITypes.GetTemplateQuery
>;
export const listTemplates = /* GraphQL */ `query ListTemplates(
  $filter: ModelTemplateFilterInput
  $limit: Int
  $nextToken: String
) {
  listTemplates(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      name
      description
      version
      s3Key
      type
      contractYear
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListTemplatesQueryVariables,
  APITypes.ListTemplatesQuery
>;
export const getProvider = /* GraphQL */ `query GetProvider($id: ID!) {
  getProvider(id: $id) {
    id
    employeeId
    name
    providerType
    specialty
    subspecialty
    fte
    administrativeFte
    administrativeRole
    yearsExperience
    hourlyWage
    baseSalary
    originalAgreementDate
    organizationName
    startDate
    contractTerm
    ptoDays
    holidayDays
    cmeDays
    cmeAmount
    signingBonus
    educationBonus
    qualityBonus
    compensationType
    conversionFactor
    wRVUTarget
    compensationYear
    credentials
    compensationModel
    fteBreakdown {
      activity
      percentage
      __typename
    }
    templateTag
    dynamicFields
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetProviderQueryVariables,
  APITypes.GetProviderQuery
>;
export const listProviders = /* GraphQL */ `query ListProviders(
  $filter: ModelProviderFilterInput
  $limit: Int
  $nextToken: String
) {
  listProviders(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      employeeId
      name
      providerType
      specialty
      subspecialty
      fte
      administrativeFte
      administrativeRole
      yearsExperience
      hourlyWage
      baseSalary
      originalAgreementDate
      organizationName
      startDate
      contractTerm
      ptoDays
      holidayDays
      cmeDays
      cmeAmount
      signingBonus
      educationBonus
      qualityBonus
      compensationType
      conversionFactor
      wRVUTarget
      compensationYear
      credentials
      compensationModel
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProvidersQueryVariables,
  APITypes.ListProvidersQuery
>;
export const getTemplateMapping = /* GraphQL */ `query GetTemplateMapping($id: ID!) {
  getTemplateMapping(id: $id) {
    id
    templateID
    field
    value
    notes
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetTemplateMappingQueryVariables,
  APITypes.GetTemplateMappingQuery
>;
export const listTemplateMappings = /* GraphQL */ `query ListTemplateMappings(
  $filter: ModelTemplateMappingFilterInput
  $limit: Int
  $nextToken: String
) {
  listTemplateMappings(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      templateID
      field
      value
      notes
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListTemplateMappingsQueryVariables,
  APITypes.ListTemplateMappingsQuery
>;
export const getUserPreferences = /* GraphQL */ `query GetUserPreferences($id: ID!) {
  getUserPreferences(id: $id) {
    id
    userId
    screen
    preferences
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetUserPreferencesQueryVariables,
  APITypes.GetUserPreferencesQuery
>;
export const listUserPreferences = /* GraphQL */ `query ListUserPreferences(
  $filter: ModelUserPreferencesFilterInput
  $limit: Int
  $nextToken: String
) {
  listUserPreferences(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      userId
      screen
      preferences
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserPreferencesQueryVariables,
  APITypes.ListUserPreferencesQuery
>;
export const getMapping = /* GraphQL */ `query GetMapping($id: ID!) {
  getMapping(id: $id) {
    id
    templateID
    providerID
    field
    value
    owner
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetMappingQueryVariables,
  APITypes.GetMappingQuery
>;
export const listMappings = /* GraphQL */ `query ListMappings(
  $filter: ModelMappingFilterInput
  $limit: Int
  $nextToken: String
) {
  listMappings(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      templateID
      providerID
      field
      value
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMappingsQueryVariables,
  APITypes.ListMappingsQuery
>;
export const getClause = /* GraphQL */ `query GetClause($id: ID!) {
  getClause(id: $id) {
    id
    text
    tags
    condition
    owner
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetClauseQueryVariables, APITypes.GetClauseQuery>;
export const listClauses = /* GraphQL */ `query ListClauses(
  $filter: ModelClauseFilterInput
  $limit: Int
  $nextToken: String
) {
  listClauses(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      text
      tags
      condition
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListClausesQueryVariables,
  APITypes.ListClausesQuery
>;
export const getDynamicBlock = /* GraphQL */ `query GetDynamicBlock($id: ID!) {
  getDynamicBlock(id: $id) {
    id
    name
    description
    placeholder
    outputType
    format
    conditions
    alwaysInclude
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetDynamicBlockQueryVariables,
  APITypes.GetDynamicBlockQuery
>;
export const listDynamicBlocks = /* GraphQL */ `query ListDynamicBlocks(
  $filter: ModelDynamicBlockFilterInput
  $limit: Int
  $nextToken: String
) {
  listDynamicBlocks(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      name
      description
      placeholder
      outputType
      format
      conditions
      alwaysInclude
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDynamicBlocksQueryVariables,
  APITypes.ListDynamicBlocksQuery
>;
export const getAuditLog = /* GraphQL */ `query GetAuditLog($id: ID!) {
  getAuditLog(id: $id) {
    id
    action
    user
    timestamp
    details
    owner
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetAuditLogQueryVariables,
  APITypes.GetAuditLogQuery
>;
export const listAuditLogs = /* GraphQL */ `query ListAuditLogs(
  $filter: ModelAuditLogFilterInput
  $limit: Int
  $nextToken: String
) {
  listAuditLogs(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      action
      user
      timestamp
      details
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListAuditLogsQueryVariables,
  APITypes.ListAuditLogsQuery
>;
export const getContractGenerationLog = /* GraphQL */ `query GetContractGenerationLog($id: ID!) {
  getContractGenerationLog(id: $id) {
    id
    providerId
    contractYear
    templateId
    generatedAt
    generatedBy
    outputType
    status
    fileUrl
    notes
    owner
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetContractGenerationLogQueryVariables,
  APITypes.GetContractGenerationLogQuery
>;
export const listContractGenerationLogs = /* GraphQL */ `query ListContractGenerationLogs(
  $filter: ModelContractGenerationLogFilterInput
  $limit: Int
  $nextToken: String
) {
  listContractGenerationLogs(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      providerId
      contractYear
      templateId
      generatedAt
      generatedBy
      outputType
      status
      fileUrl
      notes
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListContractGenerationLogsQueryVariables,
  APITypes.ListContractGenerationLogsQuery
>;
export const providersByCompensationYear = /* GraphQL */ `query ProvidersByCompensationYear(
  $compensationYear: String!
  $sortDirection: ModelSortDirection
  $filter: ModelProviderFilterInput
  $limit: Int
  $nextToken: String
) {
  providersByCompensationYear(
    compensationYear: $compensationYear
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      employeeId
      name
      providerType
      specialty
      subspecialty
      fte
      administrativeFte
      administrativeRole
      yearsExperience
      hourlyWage
      baseSalary
      originalAgreementDate
      organizationName
      startDate
      contractTerm
      ptoDays
      holidayDays
      cmeDays
      cmeAmount
      signingBonus
      educationBonus
      qualityBonus
      compensationType
      conversionFactor
      wRVUTarget
      compensationYear
      credentials
      compensationModel
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ProvidersByCompensationYearQueryVariables,
  APITypes.ProvidersByCompensationYearQuery
>;
export const templateMappingsByTemplateID = /* GraphQL */ `query TemplateMappingsByTemplateID(
  $templateID: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelTemplateMappingFilterInput
  $limit: Int
  $nextToken: String
) {
  templateMappingsByTemplateID(
    templateID: $templateID
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      templateID
      field
      value
      notes
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.TemplateMappingsByTemplateIDQueryVariables,
  APITypes.TemplateMappingsByTemplateIDQuery
>;
export const userPreferencesByUserId = /* GraphQL */ `query UserPreferencesByUserId(
  $userId: String!
  $sortDirection: ModelSortDirection
  $filter: ModelUserPreferencesFilterInput
  $limit: Int
  $nextToken: String
) {
  userPreferencesByUserId(
    userId: $userId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      userId
      screen
      preferences
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.UserPreferencesByUserIdQueryVariables,
  APITypes.UserPreferencesByUserIdQuery
>;
export const mappingsByTemplateID = /* GraphQL */ `query MappingsByTemplateID(
  $templateID: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelMappingFilterInput
  $limit: Int
  $nextToken: String
) {
  mappingsByTemplateID(
    templateID: $templateID
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      templateID
      providerID
      field
      value
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.MappingsByTemplateIDQueryVariables,
  APITypes.MappingsByTemplateIDQuery
>;
export const mappingsByTemplateAndProvider = /* GraphQL */ `query MappingsByTemplateAndProvider(
  $templateID: ID!
  $providerID: ModelIDKeyConditionInput
  $sortDirection: ModelSortDirection
  $filter: ModelMappingFilterInput
  $limit: Int
  $nextToken: String
) {
  mappingsByTemplateAndProvider(
    templateID: $templateID
    providerID: $providerID
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      templateID
      providerID
      field
      value
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.MappingsByTemplateAndProviderQueryVariables,
  APITypes.MappingsByTemplateAndProviderQuery
>;
export const mappingsByProviderID = /* GraphQL */ `query MappingsByProviderID(
  $providerID: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelMappingFilterInput
  $limit: Int
  $nextToken: String
) {
  mappingsByProviderID(
    providerID: $providerID
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      templateID
      providerID
      field
      value
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.MappingsByProviderIDQueryVariables,
  APITypes.MappingsByProviderIDQuery
>;
export const generationLogsByProvider = /* GraphQL */ `query GenerationLogsByProvider(
  $providerId: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelContractGenerationLogFilterInput
  $limit: Int
  $nextToken: String
) {
  generationLogsByProvider(
    providerId: $providerId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      providerId
      contractYear
      templateId
      generatedAt
      generatedBy
      outputType
      status
      fileUrl
      notes
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GenerationLogsByProviderQueryVariables,
  APITypes.GenerationLogsByProviderQuery
>;
export const generationLogsByContractYear = /* GraphQL */ `query GenerationLogsByContractYear(
  $contractYear: String!
  $sortDirection: ModelSortDirection
  $filter: ModelContractGenerationLogFilterInput
  $limit: Int
  $nextToken: String
) {
  generationLogsByContractYear(
    contractYear: $contractYear
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      providerId
      contractYear
      templateId
      generatedAt
      generatedBy
      outputType
      status
      fileUrl
      notes
      owner
      createdAt
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GenerationLogsByContractYearQueryVariables,
  APITypes.GenerationLogsByContractYearQuery
>;
