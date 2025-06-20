/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createTemplate = /* GraphQL */ `mutation CreateTemplate(
  $input: CreateTemplateInput!
  $condition: ModelTemplateConditionInput
) {
  createTemplate(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateTemplateMutationVariables,
  APITypes.CreateTemplateMutation
>;
export const updateTemplate = /* GraphQL */ `mutation UpdateTemplate(
  $input: UpdateTemplateInput!
  $condition: ModelTemplateConditionInput
) {
  updateTemplate(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateTemplateMutationVariables,
  APITypes.UpdateTemplateMutation
>;
export const deleteTemplate = /* GraphQL */ `mutation DeleteTemplate(
  $input: DeleteTemplateInput!
  $condition: ModelTemplateConditionInput
) {
  deleteTemplate(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteTemplateMutationVariables,
  APITypes.DeleteTemplateMutation
>;
export const createProvider = /* GraphQL */ `mutation CreateProvider(
  $input: CreateProviderInput!
  $condition: ModelProviderConditionInput
) {
  createProvider(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateProviderMutationVariables,
  APITypes.CreateProviderMutation
>;
export const updateProvider = /* GraphQL */ `mutation UpdateProvider(
  $input: UpdateProviderInput!
  $condition: ModelProviderConditionInput
) {
  updateProvider(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateProviderMutationVariables,
  APITypes.UpdateProviderMutation
>;
export const deleteProvider = /* GraphQL */ `mutation DeleteProvider(
  $input: DeleteProviderInput!
  $condition: ModelProviderConditionInput
) {
  deleteProvider(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteProviderMutationVariables,
  APITypes.DeleteProviderMutation
>;
export const createMapping = /* GraphQL */ `mutation CreateMapping(
  $input: CreateMappingInput!
  $condition: ModelMappingConditionInput
) {
  createMapping(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateMappingMutationVariables,
  APITypes.CreateMappingMutation
>;
export const updateMapping = /* GraphQL */ `mutation UpdateMapping(
  $input: UpdateMappingInput!
  $condition: ModelMappingConditionInput
) {
  updateMapping(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateMappingMutationVariables,
  APITypes.UpdateMappingMutation
>;
export const deleteMapping = /* GraphQL */ `mutation DeleteMapping(
  $input: DeleteMappingInput!
  $condition: ModelMappingConditionInput
) {
  deleteMapping(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteMappingMutationVariables,
  APITypes.DeleteMappingMutation
>;
export const createClause = /* GraphQL */ `mutation CreateClause(
  $input: CreateClauseInput!
  $condition: ModelClauseConditionInput
) {
  createClause(input: $input, condition: $condition) {
    id
    text
    tags
    condition
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateClauseMutationVariables,
  APITypes.CreateClauseMutation
>;
export const updateClause = /* GraphQL */ `mutation UpdateClause(
  $input: UpdateClauseInput!
  $condition: ModelClauseConditionInput
) {
  updateClause(input: $input, condition: $condition) {
    id
    text
    tags
    condition
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateClauseMutationVariables,
  APITypes.UpdateClauseMutation
>;
export const deleteClause = /* GraphQL */ `mutation DeleteClause(
  $input: DeleteClauseInput!
  $condition: ModelClauseConditionInput
) {
  deleteClause(input: $input, condition: $condition) {
    id
    text
    tags
    condition
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteClauseMutationVariables,
  APITypes.DeleteClauseMutation
>;
export const createAuditLog = /* GraphQL */ `mutation CreateAuditLog(
  $input: CreateAuditLogInput!
  $condition: ModelAuditLogConditionInput
) {
  createAuditLog(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateAuditLogMutationVariables,
  APITypes.CreateAuditLogMutation
>;
export const updateAuditLog = /* GraphQL */ `mutation UpdateAuditLog(
  $input: UpdateAuditLogInput!
  $condition: ModelAuditLogConditionInput
) {
  updateAuditLog(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateAuditLogMutationVariables,
  APITypes.UpdateAuditLogMutation
>;
export const deleteAuditLog = /* GraphQL */ `mutation DeleteAuditLog(
  $input: DeleteAuditLogInput!
  $condition: ModelAuditLogConditionInput
) {
  deleteAuditLog(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteAuditLogMutationVariables,
  APITypes.DeleteAuditLogMutation
>;
