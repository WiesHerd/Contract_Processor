import { configureStore } from '@reduxjs/toolkit';
import templatesReducer from '@/features/templates/templatesSlice';
import providersReducer from '@/features/providers/providersSlice';
import mappingsReducer from '@/features/templates/mappingsSlice';
import generatorReducer from '@/features/generator/generatorSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['templates', 'providers', 'mappings'] // persist mappings too
};

const persistedTemplatesReducer = persistReducer(persistConfig, templatesReducer);
const persistedProvidersReducer = persistReducer(persistConfig, providersReducer);
const persistedMappingsReducer = persistReducer(persistConfig, mappingsReducer);

export const store = configureStore({
  reducer: {
    templates: persistedTemplatesReducer,
    providers: persistedProvidersReducer,
    mappings: persistedMappingsReducer,
    generator: generatorReducer,
  },
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