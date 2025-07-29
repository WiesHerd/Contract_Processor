/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateTemplateInput = {
  id?: string | null,
  name: string,
  description?: string | null,
  version?: string | null,
  s3Key: string,
  type?: string | null,
  contractYear?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type ModelTemplateConditionInput = {
  name?: ModelStringInput | null,
  description?: ModelStringInput | null,
  version?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  type?: ModelStringInput | null,
  contractYear?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelTemplateConditionInput | null > | null,
  or?: Array< ModelTemplateConditionInput | null > | null,
  not?: ModelTemplateConditionInput | null,
};

export type ModelStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
  _null = "_null",
}


export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type Template = {
  __typename: "Template",
  id: string,
  name: string,
  description?: string | null,
  version?: string | null,
  s3Key: string,
  type?: string | null,
  contractYear?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type UpdateTemplateInput = {
  id: string,
  name?: string | null,
  description?: string | null,
  version?: string | null,
  s3Key?: string | null,
  type?: string | null,
  contractYear?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type DeleteTemplateInput = {
  id: string,
};

export type CreateProviderInput = {
  id?: string | null,
  employeeId?: string | null,
  name: string,
  providerType?: string | null,
  specialty?: string | null,
  subspecialty?: string | null,
  fte?: number | null,
  administrativeFte?: number | null,
  administrativeRole?: string | null,
  yearsExperience?: number | null,
  hourlyWage?: number | null,
  baseSalary?: number | null,
  originalAgreementDate?: string | null,
  organizationName?: string | null,
  organizationId?: string | null,
  startDate?: string | null,
  contractTerm?: string | null,
  ptoDays?: number | null,
  holidayDays?: number | null,
  cmeDays?: number | null,
  cmeAmount?: number | null,
  signingBonus?: number | null,
  educationBonus?: number | null,
  qualityBonus?: number | null,
  compensationType?: string | null,
  conversionFactor?: number | null,
  wRVUTarget?: number | null,
  compensationYear?: string | null,
  credentials?: string | null,
  compensationModel?: string | null,
  fteBreakdown?: Array< FTEBreakdownComponentInput | null > | null,
  templateTag?: string | null,
  dynamicFields?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type FTEBreakdownComponentInput = {
  activity: string,
  percentage: number,
};

export type ModelProviderConditionInput = {
  employeeId?: ModelStringInput | null,
  name?: ModelStringInput | null,
  providerType?: ModelStringInput | null,
  specialty?: ModelStringInput | null,
  subspecialty?: ModelStringInput | null,
  fte?: ModelFloatInput | null,
  administrativeFte?: ModelFloatInput | null,
  administrativeRole?: ModelStringInput | null,
  yearsExperience?: ModelIntInput | null,
  hourlyWage?: ModelFloatInput | null,
  baseSalary?: ModelFloatInput | null,
  originalAgreementDate?: ModelStringInput | null,
  organizationName?: ModelStringInput | null,
  startDate?: ModelStringInput | null,
  contractTerm?: ModelStringInput | null,
  ptoDays?: ModelIntInput | null,
  holidayDays?: ModelIntInput | null,
  cmeDays?: ModelIntInput | null,
  cmeAmount?: ModelFloatInput | null,
  signingBonus?: ModelFloatInput | null,
  educationBonus?: ModelFloatInput | null,
  qualityBonus?: ModelFloatInput | null,
  compensationType?: ModelStringInput | null,
  conversionFactor?: ModelFloatInput | null,
  wRVUTarget?: ModelFloatInput | null,
  compensationYear?: ModelStringInput | null,
  credentials?: ModelStringInput | null,
  compensationModel?: ModelStringInput | null,
  templateTag?: ModelStringInput | null,
  dynamicFields?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelProviderConditionInput | null > | null,
  or?: Array< ModelProviderConditionInput | null > | null,
  not?: ModelProviderConditionInput | null,
};

export type ModelFloatInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
};

export type ModelIntInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
};

export type Provider = {
  __typename: "Provider",
  id: string,
  employeeId?: string | null,
  name: string,
  providerType?: string | null,
  specialty?: string | null,
  subspecialty?: string | null,
  fte?: number | null,
  administrativeFte?: number | null,
  administrativeRole?: string | null,
  yearsExperience?: number | null,
  hourlyWage?: number | null,
  baseSalary?: number | null,
  originalAgreementDate?: string | null,
  organizationName?: string | null,
  organizationId?: string | null,
  startDate?: string | null,
  contractTerm?: string | null,
  ptoDays?: number | null,
  holidayDays?: number | null,
  cmeDays?: number | null,
  cmeAmount?: number | null,
  signingBonus?: number | null,
  educationBonus?: number | null,
  qualityBonus?: number | null,
  compensationType?: string | null,
  conversionFactor?: number | null,
  wRVUTarget?: number | null,
  compensationYear?: string | null,
  credentials?: string | null,
  compensationModel?: string | null,
  fteBreakdown?:  Array<FTEBreakdownComponent | null > | null,
  templateTag?: string | null,
  dynamicFields?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type FTEBreakdownComponent = {
  __typename: "FTEBreakdownComponent",
  activity: string,
  percentage: number,
};

export type UpdateProviderInput = {
  id: string,
  employeeId?: string | null,
  name?: string | null,
  providerType?: string | null,
  specialty?: string | null,
  subspecialty?: string | null,
  fte?: number | null,
  administrativeFte?: number | null,
  administrativeRole?: string | null,
  yearsExperience?: number | null,
  hourlyWage?: number | null,
  baseSalary?: number | null,
  originalAgreementDate?: string | null,
  organizationName?: string | null,
  organizationId?: string | null,
  startDate?: string | null,
  contractTerm?: string | null,
  ptoDays?: number | null,
  holidayDays?: number | null,
  cmeDays?: number | null,
  cmeAmount?: number | null,
  signingBonus?: number | null,
  educationBonus?: number | null,
  qualityBonus?: number | null,
  compensationType?: string | null,
  conversionFactor?: number | null,
  wRVUTarget?: number | null,
  compensationYear?: string | null,
  credentials?: string | null,
  compensationModel?: string | null,
  fteBreakdown?: Array< FTEBreakdownComponentInput | null > | null,
  templateTag?: string | null,
  dynamicFields?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type DeleteProviderInput = {
  id: string,
  _version?: number | null,
};

export type CreateTemplateMappingInput = {
  id?: string | null,
  templateID: string,
  field: string,
  value?: string | null,
  notes?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type ModelTemplateMappingConditionInput = {
  templateID?: ModelIDInput | null,
  field?: ModelStringInput | null,
  value?: ModelStringInput | null,
  notes?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelTemplateMappingConditionInput | null > | null,
  or?: Array< ModelTemplateMappingConditionInput | null > | null,
  not?: ModelTemplateMappingConditionInput | null,
};

export type ModelIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export type TemplateMapping = {
  __typename: "TemplateMapping",
  id: string,
  templateID: string,
  field: string,
  value?: string | null,
  notes?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type UpdateTemplateMappingInput = {
  id: string,
  templateID?: string | null,
  field?: string | null,
  value?: string | null,
  notes?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type DeleteTemplateMappingInput = {
  id: string,
};

export type CreateUserPreferencesInput = {
  id?: string | null,
  userId: string,
  screen: string,
  preferences: string,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type ModelUserPreferencesConditionInput = {
  userId?: ModelStringInput | null,
  screen?: ModelStringInput | null,
  preferences?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelUserPreferencesConditionInput | null > | null,
  or?: Array< ModelUserPreferencesConditionInput | null > | null,
  not?: ModelUserPreferencesConditionInput | null,
};

export type UserPreferences = {
  __typename: "UserPreferences",
  id: string,
  userId: string,
  screen: string,
  preferences: string,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type UpdateUserPreferencesInput = {
  id: string,
  userId?: string | null,
  screen?: string | null,
  preferences?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type DeleteUserPreferencesInput = {
  id: string,
};

export type CreateGeneratorPreferencesInput = {
  userId: string,
  columnPreferences: string,
};

export type ModelGeneratorPreferencesConditionInput = {
  userId?: ModelStringInput | null,
  columnPreferences?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelGeneratorPreferencesConditionInput | null > | null,
  or?: Array< ModelGeneratorPreferencesConditionInput | null > | null,
  not?: ModelGeneratorPreferencesConditionInput | null,
};

export type GeneratorPreferences = {
  __typename: "GeneratorPreferences",
  id: string,
  userId: string,
  columnPreferences: string,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type UpdateGeneratorPreferencesInput = {
  id: string,
  userId?: string | null,
  columnPreferences?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type DeleteGeneratorPreferencesInput = {
  id: string,
};

export type CreateMappingInput = {
  id?: string | null,
  templateID: string,
  providerID: string,
  field: string,
  value?: string | null,
  owner?: string | null,
};

export type ModelMappingConditionInput = {
  templateID?: ModelIDInput | null,
  providerID?: ModelIDInput | null,
  field?: ModelStringInput | null,
  value?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelMappingConditionInput | null > | null,
  or?: Array< ModelMappingConditionInput | null > | null,
  not?: ModelMappingConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type Mapping = {
  __typename: "Mapping",
  id: string,
  templateID: string,
  providerID: string,
  field: string,
  value?: string | null,
  owner?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateMappingInput = {
  id: string,
  templateID?: string | null,
  providerID?: string | null,
  field?: string | null,
  value?: string | null,
  owner?: string | null,
};

export type DeleteMappingInput = {
  id: string,
};

export type CreateClauseInput = {
  id?: string | null,
  title?: string | null,
  text: string,
  tags?: Array< string | null > | null,
  condition?: string | null,
  owner?: string | null,
};

export type ModelClauseConditionInput = {
  title?: ModelStringInput | null,
  text?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  condition?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelClauseConditionInput | null > | null,
  or?: Array< ModelClauseConditionInput | null > | null,
  not?: ModelClauseConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type Clause = {
  __typename: "Clause",
  id: string,
  title?: string | null,
  text: string,
  tags?: Array< string | null > | null,
  condition?: string | null,
  owner?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateClauseInput = {
  id: string,
  title?: string | null,
  text?: string | null,
  tags?: Array< string | null > | null,
  condition?: string | null,
  owner?: string | null,
};

export type DeleteClauseInput = {
  id: string,
};

export type CreateDynamicBlockInput = {
  id?: string | null,
  name: string,
  description?: string | null,
  placeholder: string,
  outputType: string,
  format: string,
  conditions?: string | null,
  alwaysInclude?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type ModelDynamicBlockConditionInput = {
  name?: ModelStringInput | null,
  description?: ModelStringInput | null,
  placeholder?: ModelStringInput | null,
  outputType?: ModelStringInput | null,
  format?: ModelStringInput | null,
  conditions?: ModelStringInput | null,
  alwaysInclude?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelDynamicBlockConditionInput | null > | null,
  or?: Array< ModelDynamicBlockConditionInput | null > | null,
  not?: ModelDynamicBlockConditionInput | null,
};

export type DynamicBlock = {
  __typename: "DynamicBlock",
  id: string,
  name: string,
  description?: string | null,
  placeholder: string,
  outputType: string,
  format: string,
  conditions?: string | null,
  alwaysInclude?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type UpdateDynamicBlockInput = {
  id: string,
  name?: string | null,
  description?: string | null,
  placeholder?: string | null,
  outputType?: string | null,
  format?: string | null,
  conditions?: string | null,
  alwaysInclude?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  owner?: string | null,
};

export type DeleteDynamicBlockInput = {
  id: string,
};

export type CreateAuditLogInput = {
  id?: string | null,
  action: string,
  user?: string | null,
  timestamp: string,
  details?: string | null,
  owner?: string | null,
};

export type ModelAuditLogConditionInput = {
  action?: ModelStringInput | null,
  user?: ModelStringInput | null,
  timestamp?: ModelStringInput | null,
  details?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelAuditLogConditionInput | null > | null,
  or?: Array< ModelAuditLogConditionInput | null > | null,
  not?: ModelAuditLogConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type AuditLog = {
  __typename: "AuditLog",
  id: string,
  action: string,
  user?: string | null,
  timestamp: string,
  details?: string | null,
  owner?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateAuditLogInput = {
  id: string,
  action?: string | null,
  user?: string | null,
  timestamp?: string | null,
  details?: string | null,
  owner?: string | null,
};

export type DeleteAuditLogInput = {
  id: string,
};

export type CreateContractGenerationLogInput = {
  providerId: string,
  contractYear: string,
  templateId: string,
  generatedAt: string,
  generatedBy?: string | null,
  outputType?: string | null,
  status?: string | null,
  fileUrl?: string | null,
  notes?: string | null,
  owner?: string | null,
};

export type ModelContractGenerationLogConditionInput = {
  providerId?: ModelIDInput | null,
  contractYear?: ModelStringInput | null,
  templateId?: ModelIDInput | null,
  generatedAt?: ModelStringInput | null,
  generatedBy?: ModelStringInput | null,
  outputType?: ModelStringInput | null,
  status?: ModelStringInput | null,
  fileUrl?: ModelStringInput | null,
  notes?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelContractGenerationLogConditionInput | null > | null,
  or?: Array< ModelContractGenerationLogConditionInput | null > | null,
  not?: ModelContractGenerationLogConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ContractGenerationLog = {
  __typename: "ContractGenerationLog",
  id: string,
  providerId: string,
  contractYear: string,
  templateId: string,
  generatedAt: string,
  generatedBy?: string | null,
  outputType?: string | null,
  status?: string | null,
  fileUrl?: string | null,
  notes?: string | null,
  owner?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateContractGenerationLogInput = {
  id: string,
  providerId?: string | null,
  contractYear?: string | null,
  templateId?: string | null,
  generatedAt?: string | null,
  generatedBy?: string | null,
  outputType?: string | null,
  status?: string | null,
  fileUrl?: string | null,
  notes?: string | null,
  owner?: string | null,
};

export type DeleteContractGenerationLogInput = {
  id: string,
};

export type ModelTemplateFilterInput = {
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  description?: ModelStringInput | null,
  version?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  type?: ModelStringInput | null,
  contractYear?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelTemplateFilterInput | null > | null,
  or?: Array< ModelTemplateFilterInput | null > | null,
  not?: ModelTemplateFilterInput | null,
};

export type ModelTemplateConnection = {
  __typename: "ModelTemplateConnection",
  items:  Array<Template | null >,
  nextToken?: string | null,
};

export type ModelProviderFilterInput = {
  id?: ModelIDInput | null,
  employeeId?: ModelStringInput | null,
  name?: ModelStringInput | null,
  providerType?: ModelStringInput | null,
  specialty?: ModelStringInput | null,
  subspecialty?: ModelStringInput | null,
  fte?: ModelFloatInput | null,
  administrativeFte?: ModelFloatInput | null,
  administrativeRole?: ModelStringInput | null,
  yearsExperience?: ModelIntInput | null,
  hourlyWage?: ModelFloatInput | null,
  baseSalary?: ModelFloatInput | null,
  originalAgreementDate?: ModelStringInput | null,
  organizationName?: ModelStringInput | null,
  startDate?: ModelStringInput | null,
  contractTerm?: ModelStringInput | null,
  ptoDays?: ModelIntInput | null,
  holidayDays?: ModelIntInput | null,
  cmeDays?: ModelIntInput | null,
  cmeAmount?: ModelFloatInput | null,
  signingBonus?: ModelFloatInput | null,
  educationBonus?: ModelFloatInput | null,
  qualityBonus?: ModelFloatInput | null,
  compensationType?: ModelStringInput | null,
  conversionFactor?: ModelFloatInput | null,
  wRVUTarget?: ModelFloatInput | null,
  compensationYear?: ModelStringInput | null,
  credentials?: ModelStringInput | null,
  compensationModel?: ModelStringInput | null,
  templateTag?: ModelStringInput | null,
  dynamicFields?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelProviderFilterInput | null > | null,
  or?: Array< ModelProviderFilterInput | null > | null,
  not?: ModelProviderFilterInput | null,
};

export type ModelProviderConnection = {
  __typename: "ModelProviderConnection",
  items:  Array<Provider | null >,
  nextToken?: string | null,
};

export type ModelTemplateMappingFilterInput = {
  id?: ModelIDInput | null,
  templateID?: ModelIDInput | null,
  field?: ModelStringInput | null,
  value?: ModelStringInput | null,
  notes?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelTemplateMappingFilterInput | null > | null,
  or?: Array< ModelTemplateMappingFilterInput | null > | null,
  not?: ModelTemplateMappingFilterInput | null,
};

export type ModelTemplateMappingConnection = {
  __typename: "ModelTemplateMappingConnection",
  items:  Array<TemplateMapping | null >,
  nextToken?: string | null,
};

export type ModelUserPreferencesFilterInput = {
  id?: ModelIDInput | null,
  userId?: ModelStringInput | null,
  screen?: ModelStringInput | null,
  preferences?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelUserPreferencesFilterInput | null > | null,
  or?: Array< ModelUserPreferencesFilterInput | null > | null,
  not?: ModelUserPreferencesFilterInput | null,
};

export type ModelUserPreferencesConnection = {
  __typename: "ModelUserPreferencesConnection",
  items:  Array<UserPreferences | null >,
  nextToken?: string | null,
};

export type ModelGeneratorPreferencesFilterInput = {
  id?: ModelIDInput | null,
  userId?: ModelStringInput | null,
  columnPreferences?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelGeneratorPreferencesFilterInput | null > | null,
  or?: Array< ModelGeneratorPreferencesFilterInput | null > | null,
  not?: ModelGeneratorPreferencesFilterInput | null,
};

export type ModelGeneratorPreferencesConnection = {
  __typename: "ModelGeneratorPreferencesConnection",
  items:  Array<GeneratorPreferences | null >,
  nextToken?: string | null,
};

export type ModelMappingFilterInput = {
  id?: ModelIDInput | null,
  templateID?: ModelIDInput | null,
  providerID?: ModelIDInput | null,
  field?: ModelStringInput | null,
  value?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelMappingFilterInput | null > | null,
  or?: Array< ModelMappingFilterInput | null > | null,
  not?: ModelMappingFilterInput | null,
};

export type ModelMappingConnection = {
  __typename: "ModelMappingConnection",
  items:  Array<Mapping | null >,
  nextToken?: string | null,
};

export type ModelClauseFilterInput = {
  id?: ModelIDInput | null,
  title?: ModelStringInput | null,
  text?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  condition?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelClauseFilterInput | null > | null,
  or?: Array< ModelClauseFilterInput | null > | null,
  not?: ModelClauseFilterInput | null,
};

export type ModelClauseConnection = {
  __typename: "ModelClauseConnection",
  items:  Array<Clause | null >,
  nextToken?: string | null,
};

export type ModelDynamicBlockFilterInput = {
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  description?: ModelStringInput | null,
  placeholder?: ModelStringInput | null,
  outputType?: ModelStringInput | null,
  format?: ModelStringInput | null,
  conditions?: ModelStringInput | null,
  alwaysInclude?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  and?: Array< ModelDynamicBlockFilterInput | null > | null,
  or?: Array< ModelDynamicBlockFilterInput | null > | null,
  not?: ModelDynamicBlockFilterInput | null,
};

export type ModelDynamicBlockConnection = {
  __typename: "ModelDynamicBlockConnection",
  items:  Array<DynamicBlock | null >,
  nextToken?: string | null,
};

export type ModelAuditLogFilterInput = {
  id?: ModelIDInput | null,
  action?: ModelStringInput | null,
  user?: ModelStringInput | null,
  timestamp?: ModelStringInput | null,
  details?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelAuditLogFilterInput | null > | null,
  or?: Array< ModelAuditLogFilterInput | null > | null,
  not?: ModelAuditLogFilterInput | null,
};

export type ModelAuditLogConnection = {
  __typename: "ModelAuditLogConnection",
  items:  Array<AuditLog | null >,
  nextToken?: string | null,
};

export type ModelContractGenerationLogFilterInput = {
  id?: ModelIDInput | null,
  providerId?: ModelIDInput | null,
  contractYear?: ModelStringInput | null,
  templateId?: ModelIDInput | null,
  generatedAt?: ModelStringInput | null,
  generatedBy?: ModelStringInput | null,
  outputType?: ModelStringInput | null,
  status?: ModelStringInput | null,
  fileUrl?: ModelStringInput | null,
  notes?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelContractGenerationLogFilterInput | null > | null,
  or?: Array< ModelContractGenerationLogFilterInput | null > | null,
  not?: ModelContractGenerationLogFilterInput | null,
};

export type ModelContractGenerationLogConnection = {
  __typename: "ModelContractGenerationLogConnection",
  items:  Array<ContractGenerationLog | null >,
  nextToken?: string | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelIDKeyConditionInput = {
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
};

export type ModelSubscriptionTemplateFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  version?: ModelSubscriptionStringInput | null,
  s3Key?: ModelSubscriptionStringInput | null,
  type?: ModelSubscriptionStringInput | null,
  contractYear?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionTemplateFilterInput | null > | null,
  or?: Array< ModelSubscriptionTemplateFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionProviderFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  employeeId?: ModelSubscriptionStringInput | null,
  name?: ModelSubscriptionStringInput | null,
  providerType?: ModelSubscriptionStringInput | null,
  specialty?: ModelSubscriptionStringInput | null,
  subspecialty?: ModelSubscriptionStringInput | null,
  fte?: ModelSubscriptionFloatInput | null,
  administrativeFte?: ModelSubscriptionFloatInput | null,
  administrativeRole?: ModelSubscriptionStringInput | null,
  yearsExperience?: ModelSubscriptionIntInput | null,
  hourlyWage?: ModelSubscriptionFloatInput | null,
  baseSalary?: ModelSubscriptionFloatInput | null,
  originalAgreementDate?: ModelSubscriptionStringInput | null,
  organizationName?: ModelSubscriptionStringInput | null,
  startDate?: ModelSubscriptionStringInput | null,
  contractTerm?: ModelSubscriptionStringInput | null,
  ptoDays?: ModelSubscriptionIntInput | null,
  holidayDays?: ModelSubscriptionIntInput | null,
  cmeDays?: ModelSubscriptionIntInput | null,
  cmeAmount?: ModelSubscriptionFloatInput | null,
  signingBonus?: ModelSubscriptionFloatInput | null,
  educationBonus?: ModelSubscriptionFloatInput | null,
  qualityBonus?: ModelSubscriptionFloatInput | null,
  compensationType?: ModelSubscriptionStringInput | null,
  conversionFactor?: ModelSubscriptionFloatInput | null,
  wRVUTarget?: ModelSubscriptionFloatInput | null,
  compensationYear?: ModelSubscriptionStringInput | null,
  credentials?: ModelSubscriptionStringInput | null,
  compensationModel?: ModelSubscriptionStringInput | null,
  templateTag?: ModelSubscriptionStringInput | null,
  dynamicFields?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionProviderFilterInput | null > | null,
  or?: Array< ModelSubscriptionProviderFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionFloatInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  in?: Array< number | null > | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionIntInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  in?: Array< number | null > | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionTemplateMappingFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  templateID?: ModelSubscriptionIDInput | null,
  field?: ModelSubscriptionStringInput | null,
  value?: ModelSubscriptionStringInput | null,
  notes?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionTemplateMappingFilterInput | null > | null,
  or?: Array< ModelSubscriptionTemplateMappingFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionUserPreferencesFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  userId?: ModelSubscriptionStringInput | null,
  screen?: ModelSubscriptionStringInput | null,
  preferences?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionUserPreferencesFilterInput | null > | null,
  or?: Array< ModelSubscriptionUserPreferencesFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionGeneratorPreferencesFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  userId?: ModelSubscriptionStringInput | null,
  columnPreferences?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionGeneratorPreferencesFilterInput | null > | null,
  or?: Array< ModelSubscriptionGeneratorPreferencesFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionMappingFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  templateID?: ModelSubscriptionIDInput | null,
  providerID?: ModelSubscriptionIDInput | null,
  field?: ModelSubscriptionStringInput | null,
  value?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionMappingFilterInput | null > | null,
  or?: Array< ModelSubscriptionMappingFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionClauseFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  title?: ModelSubscriptionStringInput | null,
  text?: ModelSubscriptionStringInput | null,
  tags?: ModelSubscriptionStringInput | null,
  condition?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionClauseFilterInput | null > | null,
  or?: Array< ModelSubscriptionClauseFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionDynamicBlockFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  placeholder?: ModelSubscriptionStringInput | null,
  outputType?: ModelSubscriptionStringInput | null,
  format?: ModelSubscriptionStringInput | null,
  conditions?: ModelSubscriptionStringInput | null,
  alwaysInclude?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionDynamicBlockFilterInput | null > | null,
  or?: Array< ModelSubscriptionDynamicBlockFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionAuditLogFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  action?: ModelSubscriptionStringInput | null,
  user?: ModelSubscriptionStringInput | null,
  timestamp?: ModelSubscriptionStringInput | null,
  details?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionAuditLogFilterInput | null > | null,
  or?: Array< ModelSubscriptionAuditLogFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionContractGenerationLogFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  providerId?: ModelSubscriptionIDInput | null,
  contractYear?: ModelSubscriptionStringInput | null,
  templateId?: ModelSubscriptionIDInput | null,
  generatedAt?: ModelSubscriptionStringInput | null,
  generatedBy?: ModelSubscriptionStringInput | null,
  outputType?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  fileUrl?: ModelSubscriptionStringInput | null,
  notes?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionContractGenerationLogFilterInput | null > | null,
  or?: Array< ModelSubscriptionContractGenerationLogFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type CreateTemplateMutationVariables = {
  input: CreateTemplateInput,
  condition?: ModelTemplateConditionInput | null,
};

export type CreateTemplateMutation = {
  createTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateTemplateMutationVariables = {
  input: UpdateTemplateInput,
  condition?: ModelTemplateConditionInput | null,
};

export type UpdateTemplateMutation = {
  updateTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteTemplateMutationVariables = {
  input: DeleteTemplateInput,
  condition?: ModelTemplateConditionInput | null,
};

export type DeleteTemplateMutation = {
  deleteTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateProviderMutationVariables = {
  input: CreateProviderInput,
  condition?: ModelProviderConditionInput | null,
};

export type CreateProviderMutation = {
  createProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateProviderMutationVariables = {
  input: UpdateProviderInput,
  condition?: ModelProviderConditionInput | null,
};

export type UpdateProviderMutation = {
  updateProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteProviderMutationVariables = {
  input: DeleteProviderInput,
  condition?: ModelProviderConditionInput | null,
};

export type DeleteProviderMutation = {
  deleteProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateTemplateMappingMutationVariables = {
  input: CreateTemplateMappingInput,
  condition?: ModelTemplateMappingConditionInput | null,
};

export type CreateTemplateMappingMutation = {
  createTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateTemplateMappingMutationVariables = {
  input: UpdateTemplateMappingInput,
  condition?: ModelTemplateMappingConditionInput | null,
};

export type UpdateTemplateMappingMutation = {
  updateTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteTemplateMappingMutationVariables = {
  input: DeleteTemplateMappingInput,
  condition?: ModelTemplateMappingConditionInput | null,
};

export type DeleteTemplateMappingMutation = {
  deleteTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateUserPreferencesMutationVariables = {
  input: CreateUserPreferencesInput,
  condition?: ModelUserPreferencesConditionInput | null,
};

export type CreateUserPreferencesMutation = {
  createUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateUserPreferencesMutationVariables = {
  input: UpdateUserPreferencesInput,
  condition?: ModelUserPreferencesConditionInput | null,
};

export type UpdateUserPreferencesMutation = {
  updateUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteUserPreferencesMutationVariables = {
  input: DeleteUserPreferencesInput,
  condition?: ModelUserPreferencesConditionInput | null,
};

export type DeleteUserPreferencesMutation = {
  deleteUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateGeneratorPreferencesMutationVariables = {
  input: CreateGeneratorPreferencesInput,
  condition?: ModelGeneratorPreferencesConditionInput | null,
};

export type CreateGeneratorPreferencesMutation = {
  createGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateGeneratorPreferencesMutationVariables = {
  input: UpdateGeneratorPreferencesInput,
  condition?: ModelGeneratorPreferencesConditionInput | null,
};

export type UpdateGeneratorPreferencesMutation = {
  updateGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteGeneratorPreferencesMutationVariables = {
  input: DeleteGeneratorPreferencesInput,
  condition?: ModelGeneratorPreferencesConditionInput | null,
};

export type DeleteGeneratorPreferencesMutation = {
  deleteGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateMappingMutationVariables = {
  input: CreateMappingInput,
  condition?: ModelMappingConditionInput | null,
};

export type CreateMappingMutation = {
  createMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateMappingMutationVariables = {
  input: UpdateMappingInput,
  condition?: ModelMappingConditionInput | null,
};

export type UpdateMappingMutation = {
  updateMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteMappingMutationVariables = {
  input: DeleteMappingInput,
  condition?: ModelMappingConditionInput | null,
};

export type DeleteMappingMutation = {
  deleteMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateClauseMutationVariables = {
  input: CreateClauseInput,
  condition?: ModelClauseConditionInput | null,
};

export type CreateClauseMutation = {
  createClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateClauseMutationVariables = {
  input: UpdateClauseInput,
  condition?: ModelClauseConditionInput | null,
};

export type UpdateClauseMutation = {
  updateClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteClauseMutationVariables = {
  input: DeleteClauseInput,
  condition?: ModelClauseConditionInput | null,
};

export type DeleteClauseMutation = {
  deleteClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateDynamicBlockMutationVariables = {
  input: CreateDynamicBlockInput,
  condition?: ModelDynamicBlockConditionInput | null,
};

export type CreateDynamicBlockMutation = {
  createDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateDynamicBlockMutationVariables = {
  input: UpdateDynamicBlockInput,
  condition?: ModelDynamicBlockConditionInput | null,
};

export type UpdateDynamicBlockMutation = {
  updateDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteDynamicBlockMutationVariables = {
  input: DeleteDynamicBlockInput,
  condition?: ModelDynamicBlockConditionInput | null,
};

export type DeleteDynamicBlockMutation = {
  deleteDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateAuditLogMutationVariables = {
  input: CreateAuditLogInput,
  condition?: ModelAuditLogConditionInput | null,
};

export type CreateAuditLogMutation = {
  createAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateAuditLogMutationVariables = {
  input: UpdateAuditLogInput,
  condition?: ModelAuditLogConditionInput | null,
};

export type UpdateAuditLogMutation = {
  updateAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteAuditLogMutationVariables = {
  input: DeleteAuditLogInput,
  condition?: ModelAuditLogConditionInput | null,
};

export type DeleteAuditLogMutation = {
  deleteAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateContractGenerationLogMutationVariables = {
  input: CreateContractGenerationLogInput,
  condition?: ModelContractGenerationLogConditionInput | null,
};

export type CreateContractGenerationLogMutation = {
  createContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateContractGenerationLogMutationVariables = {
  input: UpdateContractGenerationLogInput,
  condition?: ModelContractGenerationLogConditionInput | null,
};

export type UpdateContractGenerationLogMutation = {
  updateContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteContractGenerationLogMutationVariables = {
  input: DeleteContractGenerationLogInput,
  condition?: ModelContractGenerationLogConditionInput | null,
};

export type DeleteContractGenerationLogMutation = {
  deleteContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListProviderYearsQueryVariables = {
};

export type ListProviderYearsQuery = {
  listProviderYears?: Array< string | null > | null,
};

export type GetTemplateQueryVariables = {
  id: string,
};

export type GetTemplateQuery = {
  getTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type ListTemplatesQueryVariables = {
  filter?: ModelTemplateFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListTemplatesQuery = {
  listTemplates?:  {
    __typename: "ModelTemplateConnection",
    items:  Array< {
      __typename: "Template",
      id: string,
      name: string,
      description?: string | null,
      version?: string | null,
      s3Key: string,
      type?: string | null,
      contractYear?: string | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetProviderQueryVariables = {
  id: string,
};

export type GetProviderQuery = {
  getProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type ListProvidersQueryVariables = {
  filter?: ModelProviderFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProvidersQuery = {
  listProviders?:  {
    __typename: "ModelProviderConnection",
    items:  Array< {
      __typename: "Provider",
      id: string,
      employeeId?: string | null,
      name: string,
      providerType?: string | null,
      specialty?: string | null,
      subspecialty?: string | null,
      fte?: number | null,
      administrativeFte?: number | null,
      administrativeRole?: string | null,
      yearsExperience?: number | null,
      hourlyWage?: number | null,
      baseSalary?: number | null,
      originalAgreementDate?: string | null,
      organizationName?: string | null,
      startDate?: string | null,
      contractTerm?: string | null,
      ptoDays?: number | null,
      holidayDays?: number | null,
      cmeDays?: number | null,
      cmeAmount?: number | null,
      signingBonus?: number | null,
      educationBonus?: number | null,
      qualityBonus?: number | null,
      compensationType?: string | null,
      conversionFactor?: number | null,
      wRVUTarget?: number | null,
      compensationYear?: string | null,
      credentials?: string | null,
      compensationModel?: string | null,
      templateTag?: string | null,
      dynamicFields?: string | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetTemplateMappingQueryVariables = {
  id: string,
};

export type GetTemplateMappingQuery = {
  getTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type ListTemplateMappingsQueryVariables = {
  filter?: ModelTemplateMappingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListTemplateMappingsQuery = {
  listTemplateMappings?:  {
    __typename: "ModelTemplateMappingConnection",
    items:  Array< {
      __typename: "TemplateMapping",
      id: string,
      templateID: string,
      field: string,
      value?: string | null,
      notes?: string | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetUserPreferencesQueryVariables = {
  id: string,
};

export type GetUserPreferencesQuery = {
  getUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type ListUserPreferencesQueryVariables = {
  filter?: ModelUserPreferencesFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListUserPreferencesQuery = {
  listUserPreferences?:  {
    __typename: "ModelUserPreferencesConnection",
    items:  Array< {
      __typename: "UserPreferences",
      id: string,
      userId: string,
      screen: string,
      preferences: string,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetGeneratorPreferencesQueryVariables = {
  id: string,
};

export type GetGeneratorPreferencesQuery = {
  getGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type ListGeneratorPreferencesQueryVariables = {
  filter?: ModelGeneratorPreferencesFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListGeneratorPreferencesQuery = {
  listGeneratorPreferences?:  {
    __typename: "ModelGeneratorPreferencesConnection",
    items:  Array< {
      __typename: "GeneratorPreferences",
      id: string,
      userId: string,
      columnPreferences: string,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetMappingQueryVariables = {
  id: string,
};

export type GetMappingQuery = {
  getMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListMappingsQueryVariables = {
  filter?: ModelMappingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListMappingsQuery = {
  listMappings?:  {
    __typename: "ModelMappingConnection",
    items:  Array< {
      __typename: "Mapping",
      id: string,
      templateID: string,
      providerID: string,
      field: string,
      value?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetClauseQueryVariables = {
  id: string,
};

export type GetClauseQuery = {
  getClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListClausesQueryVariables = {
  filter?: ModelClauseFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListClausesQuery = {
  listClauses?:  {
    __typename: "ModelClauseConnection",
    items:  Array< {
      __typename: "Clause",
      id: string,
      title?: string | null,
      text: string,
      tags?: Array< string | null > | null,
      condition?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetDynamicBlockQueryVariables = {
  id: string,
};

export type GetDynamicBlockQuery = {
  getDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type ListDynamicBlocksQueryVariables = {
  filter?: ModelDynamicBlockFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListDynamicBlocksQuery = {
  listDynamicBlocks?:  {
    __typename: "ModelDynamicBlockConnection",
    items:  Array< {
      __typename: "DynamicBlock",
      id: string,
      name: string,
      description?: string | null,
      placeholder: string,
      outputType: string,
      format: string,
      conditions?: string | null,
      alwaysInclude?: string | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetAuditLogQueryVariables = {
  id: string,
};

export type GetAuditLogQuery = {
  getAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListAuditLogsQueryVariables = {
  filter?: ModelAuditLogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListAuditLogsQuery = {
  listAuditLogs?:  {
    __typename: "ModelAuditLogConnection",
    items:  Array< {
      __typename: "AuditLog",
      id: string,
      action: string,
      user?: string | null,
      timestamp: string,
      details?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetContractGenerationLogQueryVariables = {
  id: string,
};

export type GetContractGenerationLogQuery = {
  getContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListContractGenerationLogsQueryVariables = {
  filter?: ModelContractGenerationLogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListContractGenerationLogsQuery = {
  listContractGenerationLogs?:  {
    __typename: "ModelContractGenerationLogConnection",
    items:  Array< {
      __typename: "ContractGenerationLog",
      id: string,
      providerId: string,
      contractYear: string,
      templateId: string,
      generatedAt: string,
      generatedBy?: string | null,
      outputType?: string | null,
      status?: string | null,
      fileUrl?: string | null,
      notes?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ProvidersByCompensationYearQueryVariables = {
  compensationYear: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelProviderFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ProvidersByCompensationYearQuery = {
  providersByCompensationYear?:  {
    __typename: "ModelProviderConnection",
    items:  Array< {
      __typename: "Provider",
      id: string,
      employeeId?: string | null,
      name: string,
      providerType?: string | null,
      specialty?: string | null,
      subspecialty?: string | null,
      fte?: number | null,
      administrativeFte?: number | null,
      administrativeRole?: string | null,
      yearsExperience?: number | null,
      hourlyWage?: number | null,
      baseSalary?: number | null,
      originalAgreementDate?: string | null,
      organizationName?: string | null,
      startDate?: string | null,
      contractTerm?: string | null,
      ptoDays?: number | null,
      holidayDays?: number | null,
      cmeDays?: number | null,
      cmeAmount?: number | null,
      signingBonus?: number | null,
      educationBonus?: number | null,
      qualityBonus?: number | null,
      compensationType?: string | null,
      conversionFactor?: number | null,
      wRVUTarget?: number | null,
      compensationYear?: string | null,
      credentials?: string | null,
      compensationModel?: string | null,
      templateTag?: string | null,
      dynamicFields?: string | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type TemplateMappingsByTemplateIDQueryVariables = {
  templateID: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelTemplateMappingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type TemplateMappingsByTemplateIDQuery = {
  templateMappingsByTemplateID?:  {
    __typename: "ModelTemplateMappingConnection",
    items:  Array< {
      __typename: "TemplateMapping",
      id: string,
      templateID: string,
      field: string,
      value?: string | null,
      notes?: string | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type UserPreferencesByUserIdQueryVariables = {
  userId: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelUserPreferencesFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type UserPreferencesByUserIdQuery = {
  userPreferencesByUserId?:  {
    __typename: "ModelUserPreferencesConnection",
    items:  Array< {
      __typename: "UserPreferences",
      id: string,
      userId: string,
      screen: string,
      preferences: string,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GeneratorPreferencesByUserIdQueryVariables = {
  userId: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelGeneratorPreferencesFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type GeneratorPreferencesByUserIdQuery = {
  generatorPreferencesByUserId?:  {
    __typename: "ModelGeneratorPreferencesConnection",
    items:  Array< {
      __typename: "GeneratorPreferences",
      id: string,
      userId: string,
      columnPreferences: string,
      createdAt?: string | null,
      updatedAt?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type MappingsByTemplateIDQueryVariables = {
  templateID: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelMappingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type MappingsByTemplateIDQuery = {
  mappingsByTemplateID?:  {
    __typename: "ModelMappingConnection",
    items:  Array< {
      __typename: "Mapping",
      id: string,
      templateID: string,
      providerID: string,
      field: string,
      value?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type MappingsByTemplateAndProviderQueryVariables = {
  templateID: string,
  providerID?: ModelIDKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelMappingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type MappingsByTemplateAndProviderQuery = {
  mappingsByTemplateAndProvider?:  {
    __typename: "ModelMappingConnection",
    items:  Array< {
      __typename: "Mapping",
      id: string,
      templateID: string,
      providerID: string,
      field: string,
      value?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type MappingsByProviderIDQueryVariables = {
  providerID: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelMappingFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type MappingsByProviderIDQuery = {
  mappingsByProviderID?:  {
    __typename: "ModelMappingConnection",
    items:  Array< {
      __typename: "Mapping",
      id: string,
      templateID: string,
      providerID: string,
      field: string,
      value?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GenerationLogsByProviderQueryVariables = {
  providerId: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelContractGenerationLogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type GenerationLogsByProviderQuery = {
  generationLogsByProvider?:  {
    __typename: "ModelContractGenerationLogConnection",
    items:  Array< {
      __typename: "ContractGenerationLog",
      id: string,
      providerId: string,
      contractYear: string,
      templateId: string,
      generatedAt: string,
      generatedBy?: string | null,
      outputType?: string | null,
      status?: string | null,
      fileUrl?: string | null,
      notes?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GenerationLogsByContractYearQueryVariables = {
  contractYear: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelContractGenerationLogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type GenerationLogsByContractYearQuery = {
  generationLogsByContractYear?:  {
    __typename: "ModelContractGenerationLogConnection",
    items:  Array< {
      __typename: "ContractGenerationLog",
      id: string,
      providerId: string,
      contractYear: string,
      templateId: string,
      generatedAt: string,
      generatedBy?: string | null,
      outputType?: string | null,
      status?: string | null,
      fileUrl?: string | null,
      notes?: string | null,
      owner?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreateTemplateSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateFilterInput | null,
  owner?: string | null,
};

export type OnCreateTemplateSubscription = {
  onCreateTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateTemplateSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateFilterInput | null,
  owner?: string | null,
};

export type OnUpdateTemplateSubscription = {
  onUpdateTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteTemplateSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateFilterInput | null,
  owner?: string | null,
};

export type OnDeleteTemplateSubscription = {
  onDeleteTemplate?:  {
    __typename: "Template",
    id: string,
    name: string,
    description?: string | null,
    version?: string | null,
    s3Key: string,
    type?: string | null,
    contractYear?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
  owner?: string | null,
};

export type OnCreateProviderSubscription = {
  onCreateProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
  owner?: string | null,
};

export type OnUpdateProviderSubscription = {
  onUpdateProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
  owner?: string | null,
};

export type OnDeleteProviderSubscription = {
  onDeleteProvider?:  {
    __typename: "Provider",
    id: string,
    employeeId?: string | null,
    name: string,
    providerType?: string | null,
    specialty?: string | null,
    subspecialty?: string | null,
    fte?: number | null,
    administrativeFte?: number | null,
    administrativeRole?: string | null,
    yearsExperience?: number | null,
    hourlyWage?: number | null,
    baseSalary?: number | null,
    originalAgreementDate?: string | null,
    organizationName?: string | null,
    startDate?: string | null,
    contractTerm?: string | null,
    ptoDays?: number | null,
    holidayDays?: number | null,
    cmeDays?: number | null,
    cmeAmount?: number | null,
    signingBonus?: number | null,
    educationBonus?: number | null,
    qualityBonus?: number | null,
    compensationType?: string | null,
    conversionFactor?: number | null,
    wRVUTarget?: number | null,
    compensationYear?: string | null,
    credentials?: string | null,
    compensationModel?: string | null,
    fteBreakdown?:  Array< {
      __typename: "FTEBreakdownComponent",
      activity: string,
      percentage: number,
    } | null > | null,
    templateTag?: string | null,
    dynamicFields?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateTemplateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateMappingFilterInput | null,
  owner?: string | null,
};

export type OnCreateTemplateMappingSubscription = {
  onCreateTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateTemplateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateMappingFilterInput | null,
  owner?: string | null,
};

export type OnUpdateTemplateMappingSubscription = {
  onUpdateTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteTemplateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateMappingFilterInput | null,
  owner?: string | null,
};

export type OnDeleteTemplateMappingSubscription = {
  onDeleteTemplateMapping?:  {
    __typename: "TemplateMapping",
    id: string,
    templateID: string,
    field: string,
    value?: string | null,
    notes?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateUserPreferencesSubscriptionVariables = {
  filter?: ModelSubscriptionUserPreferencesFilterInput | null,
  owner?: string | null,
};

export type OnCreateUserPreferencesSubscription = {
  onCreateUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateUserPreferencesSubscriptionVariables = {
  filter?: ModelSubscriptionUserPreferencesFilterInput | null,
  owner?: string | null,
};

export type OnUpdateUserPreferencesSubscription = {
  onUpdateUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteUserPreferencesSubscriptionVariables = {
  filter?: ModelSubscriptionUserPreferencesFilterInput | null,
  owner?: string | null,
};

export type OnDeleteUserPreferencesSubscription = {
  onDeleteUserPreferences?:  {
    __typename: "UserPreferences",
    id: string,
    userId: string,
    screen: string,
    preferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateGeneratorPreferencesSubscriptionVariables = {
  filter?: ModelSubscriptionGeneratorPreferencesFilterInput | null,
  owner?: string | null,
};

export type OnCreateGeneratorPreferencesSubscription = {
  onCreateGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateGeneratorPreferencesSubscriptionVariables = {
  filter?: ModelSubscriptionGeneratorPreferencesFilterInput | null,
  owner?: string | null,
};

export type OnUpdateGeneratorPreferencesSubscription = {
  onUpdateGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteGeneratorPreferencesSubscriptionVariables = {
  filter?: ModelSubscriptionGeneratorPreferencesFilterInput | null,
  owner?: string | null,
};

export type OnDeleteGeneratorPreferencesSubscription = {
  onDeleteGeneratorPreferences?:  {
    __typename: "GeneratorPreferences",
    id: string,
    userId: string,
    columnPreferences: string,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionMappingFilterInput | null,
  owner?: string | null,
};

export type OnCreateMappingSubscription = {
  onCreateMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionMappingFilterInput | null,
  owner?: string | null,
};

export type OnUpdateMappingSubscription = {
  onUpdateMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteMappingSubscriptionVariables = {
  filter?: ModelSubscriptionMappingFilterInput | null,
  owner?: string | null,
};

export type OnDeleteMappingSubscription = {
  onDeleteMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateClauseSubscriptionVariables = {
  filter?: ModelSubscriptionClauseFilterInput | null,
  owner?: string | null,
};

export type OnCreateClauseSubscription = {
  onCreateClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateClauseSubscriptionVariables = {
  filter?: ModelSubscriptionClauseFilterInput | null,
  owner?: string | null,
};

export type OnUpdateClauseSubscription = {
  onUpdateClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteClauseSubscriptionVariables = {
  filter?: ModelSubscriptionClauseFilterInput | null,
  owner?: string | null,
};

export type OnDeleteClauseSubscription = {
  onDeleteClause?:  {
    __typename: "Clause",
    id: string,
    title?: string | null,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateDynamicBlockSubscriptionVariables = {
  filter?: ModelSubscriptionDynamicBlockFilterInput | null,
  owner?: string | null,
};

export type OnCreateDynamicBlockSubscription = {
  onCreateDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateDynamicBlockSubscriptionVariables = {
  filter?: ModelSubscriptionDynamicBlockFilterInput | null,
  owner?: string | null,
};

export type OnUpdateDynamicBlockSubscription = {
  onUpdateDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteDynamicBlockSubscriptionVariables = {
  filter?: ModelSubscriptionDynamicBlockFilterInput | null,
  owner?: string | null,
};

export type OnDeleteDynamicBlockSubscription = {
  onDeleteDynamicBlock?:  {
    __typename: "DynamicBlock",
    id: string,
    name: string,
    description?: string | null,
    placeholder: string,
    outputType: string,
    format: string,
    conditions?: string | null,
    alwaysInclude?: string | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateAuditLogSubscriptionVariables = {
  filter?: ModelSubscriptionAuditLogFilterInput | null,
  owner?: string | null,
};

export type OnCreateAuditLogSubscription = {
  onCreateAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateAuditLogSubscriptionVariables = {
  filter?: ModelSubscriptionAuditLogFilterInput | null,
  owner?: string | null,
};

export type OnUpdateAuditLogSubscription = {
  onUpdateAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteAuditLogSubscriptionVariables = {
  filter?: ModelSubscriptionAuditLogFilterInput | null,
  owner?: string | null,
};

export type OnDeleteAuditLogSubscription = {
  onDeleteAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateContractGenerationLogSubscriptionVariables = {
  filter?: ModelSubscriptionContractGenerationLogFilterInput | null,
  owner?: string | null,
};

export type OnCreateContractGenerationLogSubscription = {
  onCreateContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateContractGenerationLogSubscriptionVariables = {
  filter?: ModelSubscriptionContractGenerationLogFilterInput | null,
  owner?: string | null,
};

export type OnUpdateContractGenerationLogSubscription = {
  onUpdateContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteContractGenerationLogSubscriptionVariables = {
  filter?: ModelSubscriptionContractGenerationLogFilterInput | null,
  owner?: string | null,
};

export type OnDeleteContractGenerationLogSubscription = {
  onDeleteContractGenerationLog?:  {
    __typename: "ContractGenerationLog",
    id: string,
    providerId: string,
    contractYear: string,
    templateId: string,
    generatedAt: string,
    generatedBy?: string | null,
    outputType?: string | null,
    status?: string | null,
    fileUrl?: string | null,
    notes?: string | null,
    owner?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};
