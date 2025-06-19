import { configureStore, combineReducers } from '@reduxjs/toolkit';
import templatesReducer from '@/features/templates/templatesSlice';
import providersReducer from '@/features/providers/providersSlice';
import mappingsReducer from '@/features/templates/mappingsSlice';
import generatorReducer from '@/features/generator/generatorSlice';
import clauseReducer from './slices/clauseSlice';
import auditReducer from './slices/auditSlice';
import providerReducer from './slices/providerSlice';

const rootReducer = combineReducers({
  templates: templatesReducer,
  providers: providersReducer,
  mappings: mappingsReducer,
  generator: generatorReducer,
  clauses: clauseReducer,
  audit: auditReducer,
  provider: providerReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['providers/addProvidersFromCSV'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.file'],
        // Ignore these paths in the state
        ignoredPaths: ['providers.providers'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 