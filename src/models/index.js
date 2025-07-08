// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Template, Provider, TemplateMapping, Mapping, Clause, AuditLog, ContractGenerationLog, FTEBreakdownComponent, ProviderConnection } = initSchema(schema);

export {
  Template,
  Provider,
  TemplateMapping,
  Mapping,
  Clause,
  AuditLog,
  ContractGenerationLog,
  FTEBreakdownComponent,
  ProviderConnection
};