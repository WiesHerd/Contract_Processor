import { configureStore, combineReducers } from '@reduxjs/toolkit';
import templatesReducer from '@/features/templates/templatesSlice';
import mappingsReducer from '@/features/templates/mappingsSlice';
import generatorReducer from '@/features/generator/generatorSlice';
import clauseReducer from './slices/clauseSlice';
import auditReducer from './slices/auditSlice';
import providerReducer from './slices/providerSlice';
import dynamicBlockReducer from './slices/dynamicBlockSlice';
import userReducer from './slices/userSlice';
import { useDispatch } from 'react-redux';

const rootReducer = combineReducers({
  templates: templatesReducer,
  mappings: mappingsReducer,
  generator: generatorReducer,
  clauses: clauseReducer,
  audit: auditReducer,
  provider: providerReducer,
  dynamicBlocks: dynamicBlockReducer,
  users: userReducer,
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
        ignoredPaths: ['provider.providers'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch; 