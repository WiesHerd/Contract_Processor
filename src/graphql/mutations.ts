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
    owner
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
    owner
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
    owner
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
    yearsExperience
    hourlyWage
    baseSalary
    originalAgreementDate
    organizationName
    organizationId
    startDate
    contractTerm
    ptoDays
    holidayDays
    cmeDays
    cmeAmount
    signingBonus
    qualityBonus
    educationBonus
    compensationType
    conversionFactor
    wRVUTarget
    compensationYear
    credentials
    compensationModel
    administrativeFte
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
    positionTitle
    yearsExperience
    hourlyWage
    baseSalary
    originalAgreementDate
    organizationName
    organizationId
    startDate
    contractTerm
    ptoDays
    holidayDays
    cmeDays
    cmeAmount
    signingBonus
    relocationBonus
    qualityBonus
    educationBonus
    compensationType
    conversionFactor
    wRVUTarget
    compensationYear
    credentials
    compensationModel
    clinicalFTE
    medicalDirectorFTE
    divisionChiefFTE
    researchFTE
    teachingFTE
    totalFTE
    administrativeFte
    administrativeRole
    templateTag
    dynamicFields
    createdAt
    updatedAt
    owner
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
    positionTitle
    yearsExperience
    hourlyWage
    baseSalary
    originalAgreementDate
    organizationName
    organizationId
    startDate
    contractTerm
    ptoDays
    holidayDays
    cmeDays
    cmeAmount
    signingBonus
    relocationBonus
    qualityBonus
    educationBonus
    compensationType
    conversionFactor
    wRVUTarget
    compensationYear
    credentials
    compensationModel
    clinicalFTE
    medicalDirectorFTE
    divisionChiefFTE
    researchFTE
    teachingFTE
    totalFTE
    administrativeFte
    administrativeRole
    templateTag
    dynamicFields
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteProviderMutationVariables,
  APITypes.DeleteProviderMutation
>;

export const deleteProviderCustom = /* GraphQL */ `mutation DeleteProviderCustom(
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
    yearsExperience
    hourlyWage
    baseSalary
    originalAgreementDate
    organizationName
    organizationId
    startDate
    contractTerm
    ptoDays
    holidayDays
    cmeDays
    cmeAmount
    signingBonus
    qualityBonus
    educationBonus
    compensationType
    conversionFactor
    wRVUTarget
    compensationYear
    credentials
    compensationModel
    administrativeFte
    administrativeRole
    totalFTE
    templateTag
    dynamicFields
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteProviderMutationVariables,
  APITypes.DeleteProviderMutation
>;
export const createTemplateMapping = /* GraphQL */ `mutation CreateTemplateMapping(
  $input: CreateTemplateMappingInput!
  $condition: ModelTemplateMappingConditionInput
) {
  createTemplateMapping(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateTemplateMappingMutationVariables,
  APITypes.CreateTemplateMappingMutation
>;
export const updateTemplateMapping = /* GraphQL */ `mutation UpdateTemplateMapping(
  $input: UpdateTemplateMappingInput!
  $condition: ModelTemplateMappingConditionInput
) {
  updateTemplateMapping(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateTemplateMappingMutationVariables,
  APITypes.UpdateTemplateMappingMutation
>;
export const deleteTemplateMapping = /* GraphQL */ `mutation DeleteTemplateMapping(
  $input: DeleteTemplateMappingInput!
  $condition: ModelTemplateMappingConditionInput
) {
  deleteTemplateMapping(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteTemplateMappingMutationVariables,
  APITypes.DeleteTemplateMappingMutation
>;
export const createUserPreferences = /* GraphQL */ `mutation CreateUserPreferences(
  $input: CreateUserPreferencesInput!
  $condition: ModelUserPreferencesConditionInput
) {
  createUserPreferences(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateUserPreferencesMutationVariables,
  APITypes.CreateUserPreferencesMutation
>;
export const updateUserPreferences = /* GraphQL */ `mutation UpdateUserPreferences(
  $input: UpdateUserPreferencesInput!
  $condition: ModelUserPreferencesConditionInput
) {
  updateUserPreferences(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateUserPreferencesMutationVariables,
  APITypes.UpdateUserPreferencesMutation
>;
export const deleteUserPreferences = /* GraphQL */ `mutation DeleteUserPreferences(
  $input: DeleteUserPreferencesInput!
  $condition: ModelUserPreferencesConditionInput
) {
  deleteUserPreferences(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteUserPreferencesMutationVariables,
  APITypes.DeleteUserPreferencesMutation
>;
export const createGeneratorPreferences = /* GraphQL */ `mutation CreateGeneratorPreferences(
  $input: CreateGeneratorPreferencesInput!
  $condition: ModelGeneratorPreferencesConditionInput
) {
  createGeneratorPreferences(input: $input, condition: $condition) {
    id
    userId
    columnPreferences
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateGeneratorPreferencesMutationVariables,
  APITypes.CreateGeneratorPreferencesMutation
>;
export const updateGeneratorPreferences = /* GraphQL */ `mutation UpdateGeneratorPreferences(
  $input: UpdateGeneratorPreferencesInput!
  $condition: ModelGeneratorPreferencesConditionInput
) {
  updateGeneratorPreferences(input: $input, condition: $condition) {
    id
    userId
    columnPreferences
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateGeneratorPreferencesMutationVariables,
  APITypes.UpdateGeneratorPreferencesMutation
>;
export const deleteGeneratorPreferences = /* GraphQL */ `mutation DeleteGeneratorPreferences(
  $input: DeleteGeneratorPreferencesInput!
  $condition: ModelGeneratorPreferencesConditionInput
) {
  deleteGeneratorPreferences(input: $input, condition: $condition) {
    id
    userId
    columnPreferences
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteGeneratorPreferencesMutationVariables,
  APITypes.DeleteGeneratorPreferencesMutation
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
    owner
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
    owner
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
    owner
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
    title
    text
    tags
    condition
    owner
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
    title
    text
    tags
    condition
    owner
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
    title
    text
    tags
    condition
    owner
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteClauseMutationVariables,
  APITypes.DeleteClauseMutation
>;
export const createDynamicBlock = /* GraphQL */ `mutation CreateDynamicBlock(
  $input: CreateDynamicBlockInput!
  $condition: ModelDynamicBlockConditionInput
) {
  createDynamicBlock(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateDynamicBlockMutationVariables,
  APITypes.CreateDynamicBlockMutation
>;
export const updateDynamicBlock = /* GraphQL */ `mutation UpdateDynamicBlock(
  $input: UpdateDynamicBlockInput!
  $condition: ModelDynamicBlockConditionInput
) {
  updateDynamicBlock(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateDynamicBlockMutationVariables,
  APITypes.UpdateDynamicBlockMutation
>;
export const deleteDynamicBlock = /* GraphQL */ `mutation DeleteDynamicBlock(
  $input: DeleteDynamicBlockInput!
  $condition: ModelDynamicBlockConditionInput
) {
  deleteDynamicBlock(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteDynamicBlockMutationVariables,
  APITypes.DeleteDynamicBlockMutation
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
    owner
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
    owner
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
    owner
    createdAt
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteAuditLogMutationVariables,
  APITypes.DeleteAuditLogMutation
>;
export const createContractGenerationLog = /* GraphQL */ `mutation CreateContractGenerationLog(
  $input: CreateContractGenerationLogInput!
  $condition: ModelContractGenerationLogConditionInput
) {
  createContractGenerationLog(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateContractGenerationLogMutationVariables,
  APITypes.CreateContractGenerationLogMutation
>;
export const updateContractGenerationLog = /* GraphQL */ `mutation UpdateContractGenerationLog(
  $input: UpdateContractGenerationLogInput!
  $condition: ModelContractGenerationLogConditionInput
) {
  updateContractGenerationLog(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateContractGenerationLogMutationVariables,
  APITypes.UpdateContractGenerationLogMutation
>;
export const deleteContractGenerationLog = /* GraphQL */ `mutation DeleteContractGenerationLog(
  $input: DeleteContractGenerationLogInput!
  $condition: ModelContractGenerationLogConditionInput
) {
  deleteContractGenerationLog(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteContractGenerationLogMutationVariables,
  APITypes.DeleteContractGenerationLogMutation
>;

export const createProviderCustom = /* GraphQL */ `
  mutation CreateProviderCustom($input: CreateProviderInput!) {
    createProvider(input: $input) {
      id
      employeeId
      name
      providerType
      specialty
      subspecialty
      yearsExperience
      hourlyWage
      baseSalary
      originalAgreementDate
      organizationName
      organizationId
      startDate
      contractTerm
      ptoDays
      holidayDays
      cmeDays
      cmeAmount
      signingBonus
      qualityBonus
      educationBonus
      compensationType
      conversionFactor
      wRVUTarget
      compensationYear
      credentials
      compensationModel
      administrativeFte
      administrativeRole
      totalFTE
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
    }
  }
`;
