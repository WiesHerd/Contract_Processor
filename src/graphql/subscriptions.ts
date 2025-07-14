/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateTemplate = /* GraphQL */ `subscription OnCreateTemplate(
  $filter: ModelSubscriptionTemplateFilterInput
  $owner: String
) {
  onCreateTemplate(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateTemplateSubscriptionVariables,
  APITypes.OnCreateTemplateSubscription
>;
export const onUpdateTemplate = /* GraphQL */ `subscription OnUpdateTemplate(
  $filter: ModelSubscriptionTemplateFilterInput
  $owner: String
) {
  onUpdateTemplate(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateTemplateSubscriptionVariables,
  APITypes.OnUpdateTemplateSubscription
>;
export const onDeleteTemplate = /* GraphQL */ `subscription OnDeleteTemplate(
  $filter: ModelSubscriptionTemplateFilterInput
  $owner: String
) {
  onDeleteTemplate(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteTemplateSubscriptionVariables,
  APITypes.OnDeleteTemplateSubscription
>;
export const onCreateProvider = /* GraphQL */ `subscription OnCreateProvider(
  $filter: ModelSubscriptionProviderFilterInput
  $owner: String
) {
  onCreateProvider(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateProviderSubscriptionVariables,
  APITypes.OnCreateProviderSubscription
>;
export const onUpdateProvider = /* GraphQL */ `subscription OnUpdateProvider(
  $filter: ModelSubscriptionProviderFilterInput
  $owner: String
) {
  onUpdateProvider(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateProviderSubscriptionVariables,
  APITypes.OnUpdateProviderSubscription
>;
export const onDeleteProvider = /* GraphQL */ `subscription OnDeleteProvider(
  $filter: ModelSubscriptionProviderFilterInput
  $owner: String
) {
  onDeleteProvider(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteProviderSubscriptionVariables,
  APITypes.OnDeleteProviderSubscription
>;
export const onCreateTemplateMapping = /* GraphQL */ `subscription OnCreateTemplateMapping(
  $filter: ModelSubscriptionTemplateMappingFilterInput
  $owner: String
) {
  onCreateTemplateMapping(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateTemplateMappingSubscriptionVariables,
  APITypes.OnCreateTemplateMappingSubscription
>;
export const onUpdateTemplateMapping = /* GraphQL */ `subscription OnUpdateTemplateMapping(
  $filter: ModelSubscriptionTemplateMappingFilterInput
  $owner: String
) {
  onUpdateTemplateMapping(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateTemplateMappingSubscriptionVariables,
  APITypes.OnUpdateTemplateMappingSubscription
>;
export const onDeleteTemplateMapping = /* GraphQL */ `subscription OnDeleteTemplateMapping(
  $filter: ModelSubscriptionTemplateMappingFilterInput
  $owner: String
) {
  onDeleteTemplateMapping(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteTemplateMappingSubscriptionVariables,
  APITypes.OnDeleteTemplateMappingSubscription
>;
export const onCreateUserPreferences = /* GraphQL */ `subscription OnCreateUserPreferences(
  $filter: ModelSubscriptionUserPreferencesFilterInput
  $owner: String
) {
  onCreateUserPreferences(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUserPreferencesSubscriptionVariables,
  APITypes.OnCreateUserPreferencesSubscription
>;
export const onUpdateUserPreferences = /* GraphQL */ `subscription OnUpdateUserPreferences(
  $filter: ModelSubscriptionUserPreferencesFilterInput
  $owner: String
) {
  onUpdateUserPreferences(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUserPreferencesSubscriptionVariables,
  APITypes.OnUpdateUserPreferencesSubscription
>;
export const onDeleteUserPreferences = /* GraphQL */ `subscription OnDeleteUserPreferences(
  $filter: ModelSubscriptionUserPreferencesFilterInput
  $owner: String
) {
  onDeleteUserPreferences(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUserPreferencesSubscriptionVariables,
  APITypes.OnDeleteUserPreferencesSubscription
>;
export const onCreateMapping = /* GraphQL */ `subscription OnCreateMapping(
  $filter: ModelSubscriptionMappingFilterInput
  $owner: String
) {
  onCreateMapping(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateMappingSubscriptionVariables,
  APITypes.OnCreateMappingSubscription
>;
export const onUpdateMapping = /* GraphQL */ `subscription OnUpdateMapping(
  $filter: ModelSubscriptionMappingFilterInput
  $owner: String
) {
  onUpdateMapping(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateMappingSubscriptionVariables,
  APITypes.OnUpdateMappingSubscription
>;
export const onDeleteMapping = /* GraphQL */ `subscription OnDeleteMapping(
  $filter: ModelSubscriptionMappingFilterInput
  $owner: String
) {
  onDeleteMapping(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteMappingSubscriptionVariables,
  APITypes.OnDeleteMappingSubscription
>;
export const onCreateClause = /* GraphQL */ `subscription OnCreateClause(
  $filter: ModelSubscriptionClauseFilterInput
  $owner: String
) {
  onCreateClause(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateClauseSubscriptionVariables,
  APITypes.OnCreateClauseSubscription
>;
export const onUpdateClause = /* GraphQL */ `subscription OnUpdateClause(
  $filter: ModelSubscriptionClauseFilterInput
  $owner: String
) {
  onUpdateClause(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateClauseSubscriptionVariables,
  APITypes.OnUpdateClauseSubscription
>;
export const onDeleteClause = /* GraphQL */ `subscription OnDeleteClause(
  $filter: ModelSubscriptionClauseFilterInput
  $owner: String
) {
  onDeleteClause(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteClauseSubscriptionVariables,
  APITypes.OnDeleteClauseSubscription
>;
export const onCreateDynamicBlock = /* GraphQL */ `subscription OnCreateDynamicBlock(
  $filter: ModelSubscriptionDynamicBlockFilterInput
  $owner: String
) {
  onCreateDynamicBlock(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateDynamicBlockSubscriptionVariables,
  APITypes.OnCreateDynamicBlockSubscription
>;
export const onUpdateDynamicBlock = /* GraphQL */ `subscription OnUpdateDynamicBlock(
  $filter: ModelSubscriptionDynamicBlockFilterInput
  $owner: String
) {
  onUpdateDynamicBlock(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateDynamicBlockSubscriptionVariables,
  APITypes.OnUpdateDynamicBlockSubscription
>;
export const onDeleteDynamicBlock = /* GraphQL */ `subscription OnDeleteDynamicBlock(
  $filter: ModelSubscriptionDynamicBlockFilterInput
  $owner: String
) {
  onDeleteDynamicBlock(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteDynamicBlockSubscriptionVariables,
  APITypes.OnDeleteDynamicBlockSubscription
>;
export const onCreateAuditLog = /* GraphQL */ `subscription OnCreateAuditLog(
  $filter: ModelSubscriptionAuditLogFilterInput
  $owner: String
) {
  onCreateAuditLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateAuditLogSubscriptionVariables,
  APITypes.OnCreateAuditLogSubscription
>;
export const onUpdateAuditLog = /* GraphQL */ `subscription OnUpdateAuditLog(
  $filter: ModelSubscriptionAuditLogFilterInput
  $owner: String
) {
  onUpdateAuditLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateAuditLogSubscriptionVariables,
  APITypes.OnUpdateAuditLogSubscription
>;
export const onDeleteAuditLog = /* GraphQL */ `subscription OnDeleteAuditLog(
  $filter: ModelSubscriptionAuditLogFilterInput
  $owner: String
) {
  onDeleteAuditLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteAuditLogSubscriptionVariables,
  APITypes.OnDeleteAuditLogSubscription
>;
export const onCreateContractGenerationLog = /* GraphQL */ `subscription OnCreateContractGenerationLog(
  $filter: ModelSubscriptionContractGenerationLogFilterInput
  $owner: String
) {
  onCreateContractGenerationLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateContractGenerationLogSubscriptionVariables,
  APITypes.OnCreateContractGenerationLogSubscription
>;
export const onUpdateContractGenerationLog = /* GraphQL */ `subscription OnUpdateContractGenerationLog(
  $filter: ModelSubscriptionContractGenerationLogFilterInput
  $owner: String
) {
  onUpdateContractGenerationLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateContractGenerationLogSubscriptionVariables,
  APITypes.OnUpdateContractGenerationLogSubscription
>;
export const onDeleteContractGenerationLog = /* GraphQL */ `subscription OnDeleteContractGenerationLog(
  $filter: ModelSubscriptionContractGenerationLogFilterInput
  $owner: String
) {
  onDeleteContractGenerationLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteContractGenerationLogSubscriptionVariables,
  APITypes.OnDeleteContractGenerationLogSubscription
>;
