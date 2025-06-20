/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

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
    createdAt
    updatedAt
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
      createdAt
      updatedAt
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
export const getMapping = /* GraphQL */ `query GetMapping($id: ID!) {
  getMapping(id: $id) {
    id
    templateID
    providerID
    field
    value
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
export const getAuditLog = /* GraphQL */ `query GetAuditLog($id: ID!) {
  getAuditLog(id: $id) {
    id
    action
    user
    timestamp
    details
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
