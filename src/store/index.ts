import { configureStore, combineReducers } from '@reduxjs/toolkit';
import templatesReducer from '@/features/templates/templatesSlice';
import providersReducer from '@/features/providers/providersSlice';
import mappingsReducer from '@/features/templates/mappingsSlice';
import generatorReducer from '@/features/generator/generatorSlice';
import clauseReducer from './slices/clauseSlice';
import auditReducer from './slices/auditSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  templates: templatesReducer,
  providers: providersReducer,
  mappings: mappingsReducer,
  generator: generatorReducer,
  clauses: clauseReducer,
  audit: auditReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['templates', 'providers', 'mappings', 'audit'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['providers/addProvidersFromCSV', 'persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.file'],
        // Ignore these paths in the state
        ignoredPaths: ['providers.providers'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 