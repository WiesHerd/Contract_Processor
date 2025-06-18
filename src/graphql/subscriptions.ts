/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateTemplate = /* GraphQL */ `subscription OnCreateTemplate($filter: ModelSubscriptionTemplateFilterInput) {
  onCreateTemplate(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateTemplateSubscriptionVariables,
  APITypes.OnCreateTemplateSubscription
>;
export const onUpdateTemplate = /* GraphQL */ `subscription OnUpdateTemplate($filter: ModelSubscriptionTemplateFilterInput) {
  onUpdateTemplate(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateTemplateSubscriptionVariables,
  APITypes.OnUpdateTemplateSubscription
>;
export const onDeleteTemplate = /* GraphQL */ `subscription OnDeleteTemplate($filter: ModelSubscriptionTemplateFilterInput) {
  onDeleteTemplate(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteTemplateSubscriptionVariables,
  APITypes.OnDeleteTemplateSubscription
>;
export const onCreateProvider = /* GraphQL */ `subscription OnCreateProvider($filter: ModelSubscriptionProviderFilterInput) {
  onCreateProvider(filter: $filter) {
    id
    name
    specialty
    fte
    baseSalary
    startDate
    contractTerm
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateProviderSubscriptionVariables,
  APITypes.OnCreateProviderSubscription
>;
export const onUpdateProvider = /* GraphQL */ `subscription OnUpdateProvider($filter: ModelSubscriptionProviderFilterInput) {
  onUpdateProvider(filter: $filter) {
    id
    name
    specialty
    fte
    baseSalary
    startDate
    contractTerm
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateProviderSubscriptionVariables,
  APITypes.OnUpdateProviderSubscription
>;
export const onDeleteProvider = /* GraphQL */ `subscription OnDeleteProvider($filter: ModelSubscriptionProviderFilterInput) {
  onDeleteProvider(filter: $filter) {
    id
    name
    specialty
    fte
    baseSalary
    startDate
    contractTerm
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteProviderSubscriptionVariables,
  APITypes.OnDeleteProviderSubscription
>;
export const onCreateMapping = /* GraphQL */ `subscription OnCreateMapping($filter: ModelSubscriptionMappingFilterInput) {
  onCreateMapping(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateMappingSubscriptionVariables,
  APITypes.OnCreateMappingSubscription
>;
export const onUpdateMapping = /* GraphQL */ `subscription OnUpdateMapping($filter: ModelSubscriptionMappingFilterInput) {
  onUpdateMapping(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateMappingSubscriptionVariables,
  APITypes.OnUpdateMappingSubscription
>;
export const onDeleteMapping = /* GraphQL */ `subscription OnDeleteMapping($filter: ModelSubscriptionMappingFilterInput) {
  onDeleteMapping(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteMappingSubscriptionVariables,
  APITypes.OnDeleteMappingSubscription
>;
export const onCreateClause = /* GraphQL */ `subscription OnCreateClause($filter: ModelSubscriptionClauseFilterInput) {
  onCreateClause(filter: $filter) {
    id
    text
    tags
    condition
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateClauseSubscriptionVariables,
  APITypes.OnCreateClauseSubscription
>;
export const onUpdateClause = /* GraphQL */ `subscription OnUpdateClause($filter: ModelSubscriptionClauseFilterInput) {
  onUpdateClause(filter: $filter) {
    id
    text
    tags
    condition
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateClauseSubscriptionVariables,
  APITypes.OnUpdateClauseSubscription
>;
export const onDeleteClause = /* GraphQL */ `subscription OnDeleteClause($filter: ModelSubscriptionClauseFilterInput) {
  onDeleteClause(filter: $filter) {
    id
    text
    tags
    condition
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteClauseSubscriptionVariables,
  APITypes.OnDeleteClauseSubscription
>;
export const onCreateAuditLog = /* GraphQL */ `subscription OnCreateAuditLog($filter: ModelSubscriptionAuditLogFilterInput) {
  onCreateAuditLog(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateAuditLogSubscriptionVariables,
  APITypes.OnCreateAuditLogSubscription
>;
export const onUpdateAuditLog = /* GraphQL */ `subscription OnUpdateAuditLog($filter: ModelSubscriptionAuditLogFilterInput) {
  onUpdateAuditLog(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateAuditLogSubscriptionVariables,
  APITypes.OnUpdateAuditLogSubscription
>;
export const onDeleteAuditLog = /* GraphQL */ `subscription OnDeleteAuditLog($filter: ModelSubscriptionAuditLogFilterInput) {
  onDeleteAuditLog(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteAuditLogSubscriptionVariables,
  APITypes.OnDeleteAuditLogSubscription
>;
