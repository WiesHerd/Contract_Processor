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
};

export type DeleteTemplateInput = {
  id: string,
};

export type CreateProviderInput = {
  id?: string | null,
  name: string,
  specialty?: string | null,
  fte?: number | null,
  baseSalary?: number | null,
  startDate?: string | null,
  contractTerm?: string | null,
};

export type ModelProviderConditionInput = {
  name?: ModelStringInput | null,
  specialty?: ModelStringInput | null,
  fte?: ModelFloatInput | null,
  baseSalary?: ModelFloatInput | null,
  startDate?: ModelStringInput | null,
  contractTerm?: ModelStringInput | null,
  and?: Array< ModelProviderConditionInput | null > | null,
  or?: Array< ModelProviderConditionInput | null > | null,
  not?: ModelProviderConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
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

export type Provider = {
  __typename: "Provider",
  id: string,
  name: string,
  specialty?: string | null,
  fte?: number | null,
  baseSalary?: number | null,
  startDate?: string | null,
  contractTerm?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateProviderInput = {
  id: string,
  name?: string | null,
  specialty?: string | null,
  fte?: number | null,
  baseSalary?: number | null,
  startDate?: string | null,
  contractTerm?: string | null,
};

export type DeleteProviderInput = {
  id: string,
};

export type CreateMappingInput = {
  id?: string | null,
  templateID: string,
  providerID: string,
  field: string,
  value?: string | null,
};

export type ModelMappingConditionInput = {
  templateID?: ModelIDInput | null,
  providerID?: ModelIDInput | null,
  field?: ModelStringInput | null,
  value?: ModelStringInput | null,
  and?: Array< ModelMappingConditionInput | null > | null,
  or?: Array< ModelMappingConditionInput | null > | null,
  not?: ModelMappingConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
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

export type Mapping = {
  __typename: "Mapping",
  id: string,
  templateID: string,
  providerID: string,
  field: string,
  value?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateMappingInput = {
  id: string,
  templateID?: string | null,
  providerID?: string | null,
  field?: string | null,
  value?: string | null,
};

export type DeleteMappingInput = {
  id: string,
};

export type CreateClauseInput = {
  id?: string | null,
  text: string,
  tags?: Array< string | null > | null,
  condition?: string | null,
};

export type ModelClauseConditionInput = {
  text?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  condition?: ModelStringInput | null,
  and?: Array< ModelClauseConditionInput | null > | null,
  or?: Array< ModelClauseConditionInput | null > | null,
  not?: ModelClauseConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type Clause = {
  __typename: "Clause",
  id: string,
  text: string,
  tags?: Array< string | null > | null,
  condition?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateClauseInput = {
  id: string,
  text?: string | null,
  tags?: Array< string | null > | null,
  condition?: string | null,
};

export type DeleteClauseInput = {
  id: string,
};

export type CreateAuditLogInput = {
  id?: string | null,
  action: string,
  user?: string | null,
  timestamp: string,
  details?: string | null,
};

export type ModelAuditLogConditionInput = {
  action?: ModelStringInput | null,
  user?: ModelStringInput | null,
  timestamp?: ModelStringInput | null,
  details?: ModelStringInput | null,
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
  createdAt: string,
  updatedAt: string,
};

export type UpdateAuditLogInput = {
  id: string,
  action?: string | null,
  user?: string | null,
  timestamp?: string | null,
  details?: string | null,
};

export type DeleteAuditLogInput = {
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
  name?: ModelStringInput | null,
  specialty?: ModelStringInput | null,
  fte?: ModelFloatInput | null,
  baseSalary?: ModelFloatInput | null,
  startDate?: ModelStringInput | null,
  contractTerm?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelProviderFilterInput | null > | null,
  or?: Array< ModelProviderFilterInput | null > | null,
  not?: ModelProviderFilterInput | null,
};

export type ModelProviderConnection = {
  __typename: "ModelProviderConnection",
  items:  Array<Provider | null >,
  nextToken?: string | null,
};

export type ModelMappingFilterInput = {
  id?: ModelIDInput | null,
  templateID?: ModelIDInput | null,
  providerID?: ModelIDInput | null,
  field?: ModelStringInput | null,
  value?: ModelStringInput | null,
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
  text?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  condition?: ModelStringInput | null,
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

export type ModelAuditLogFilterInput = {
  id?: ModelIDInput | null,
  action?: ModelStringInput | null,
  user?: ModelStringInput | null,
  timestamp?: ModelStringInput | null,
  details?: ModelStringInput | null,
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
  name?: ModelSubscriptionStringInput | null,
  specialty?: ModelSubscriptionStringInput | null,
  fte?: ModelSubscriptionFloatInput | null,
  baseSalary?: ModelSubscriptionFloatInput | null,
  startDate?: ModelSubscriptionStringInput | null,
  contractTerm?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionProviderFilterInput | null > | null,
  or?: Array< ModelSubscriptionProviderFilterInput | null > | null,
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
};

export type ModelSubscriptionClauseFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  text?: ModelSubscriptionStringInput | null,
  tags?: ModelSubscriptionStringInput | null,
  condition?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionClauseFilterInput | null > | null,
  or?: Array< ModelSubscriptionClauseFilterInput | null > | null,
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
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
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
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
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
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
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
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
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
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
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
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    createdAt: string,
    updatedAt: string,
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
    createdAt: string,
    updatedAt: string,
  } | null,
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
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
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
      name: string,
      specialty?: string | null,
      fte?: number | null,
      baseSalary?: number | null,
      startDate?: string | null,
      contractTerm?: string | null,
      createdAt: string,
      updatedAt: string,
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
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
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
      text: string,
      tags?: Array< string | null > | null,
      condition?: string | null,
      createdAt: string,
      updatedAt: string,
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
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreateTemplateSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateFilterInput | null,
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
  } | null,
};

export type OnUpdateTemplateSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateFilterInput | null,
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
  } | null,
};

export type OnDeleteTemplateSubscriptionVariables = {
  filter?: ModelSubscriptionTemplateFilterInput | null,
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
  } | null,
};

export type OnCreateProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
};

export type OnCreateProviderSubscription = {
  onCreateProvider?:  {
    __typename: "Provider",
    id: string,
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
};

export type OnUpdateProviderSubscription = {
  onUpdateProvider?:  {
    __typename: "Provider",
    id: string,
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteProviderSubscriptionVariables = {
  filter?: ModelSubscriptionProviderFilterInput | null,
};

export type OnDeleteProviderSubscription = {
  onDeleteProvider?:  {
    __typename: "Provider",
    id: string,
    name: string,
    specialty?: string | null,
    fte?: number | null,
    baseSalary?: number | null,
    startDate?: string | null,
    contractTerm?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionMappingFilterInput | null,
};

export type OnCreateMappingSubscription = {
  onCreateMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateMappingSubscriptionVariables = {
  filter?: ModelSubscriptionMappingFilterInput | null,
};

export type OnUpdateMappingSubscription = {
  onUpdateMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteMappingSubscriptionVariables = {
  filter?: ModelSubscriptionMappingFilterInput | null,
};

export type OnDeleteMappingSubscription = {
  onDeleteMapping?:  {
    __typename: "Mapping",
    id: string,
    templateID: string,
    providerID: string,
    field: string,
    value?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateClauseSubscriptionVariables = {
  filter?: ModelSubscriptionClauseFilterInput | null,
};

export type OnCreateClauseSubscription = {
  onCreateClause?:  {
    __typename: "Clause",
    id: string,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateClauseSubscriptionVariables = {
  filter?: ModelSubscriptionClauseFilterInput | null,
};

export type OnUpdateClauseSubscription = {
  onUpdateClause?:  {
    __typename: "Clause",
    id: string,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteClauseSubscriptionVariables = {
  filter?: ModelSubscriptionClauseFilterInput | null,
};

export type OnDeleteClauseSubscription = {
  onDeleteClause?:  {
    __typename: "Clause",
    id: string,
    text: string,
    tags?: Array< string | null > | null,
    condition?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateAuditLogSubscriptionVariables = {
  filter?: ModelSubscriptionAuditLogFilterInput | null,
};

export type OnCreateAuditLogSubscription = {
  onCreateAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateAuditLogSubscriptionVariables = {
  filter?: ModelSubscriptionAuditLogFilterInput | null,
};

export type OnUpdateAuditLogSubscription = {
  onUpdateAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteAuditLogSubscriptionVariables = {
  filter?: ModelSubscriptionAuditLogFilterInput | null,
};

export type OnDeleteAuditLogSubscription = {
  onDeleteAuditLog?:  {
    __typename: "AuditLog",
    id: string,
    action: string,
    user?: string | null,
    timestamp: string,
    details?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};
