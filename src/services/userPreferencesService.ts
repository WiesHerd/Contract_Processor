import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

// Manual GraphQL operations for UserPreferences (until Amplify generates them)
const createUserPreferences = /* GraphQL */ `
  mutation CreateUserPreferences(
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
`;

const updateUserPreferences = /* GraphQL */ `
  mutation UpdateUserPreferences(
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
`;

const userPreferencesByUserId = /* GraphQL */ `
  query UserPreferencesByUserId(
    $userId: String!
    $sortDirection: ModelSortDirection
    $filter: ModelUserPreferencesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userPreferencesByUserId(
      userId: $userId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userId
        screen
        preferences
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export interface ProviderScreenPreferences {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnPinning: { left?: string[]; right?: string[] };
  savedViews: Record<string, {
    name: string;
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
    columnPinning: { left?: string[]; right?: string[] };
    filters?: Record<string, any>;
    createdAt: string;
  }>;
  activeView: string;
  defaultView?: string;
  filters: {
    specialty: string;
    adminRole: string;
    subspecialty: string;
    agreementDateFrom: string;
    agreementDateTo: string;
    compensationYear: string;
  };
  displaySettings: {
    rowsPerPage: number;
    compactMode: boolean;
    showSummaryStats: boolean;
  };
}

export interface UserPreferencesData {
  providers?: ProviderScreenPreferences;
  templates?: Record<string, any>;
  generator?: Record<string, any>;
  audit?: Record<string, any>;
  // Add more screen preferences as needed
}

class UserPreferencesService {
  private cache = new Map<string, UserPreferencesData>();
  private currentUserId: string | null = null;

  async getCurrentUserId(): Promise<string> {
    if (this.currentUserId) return this.currentUserId;
    
    try {
      const user = await getCurrentUser();
      this.currentUserId = user.userId;
      return user.userId;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw new Error('User not authenticated');
    }
  }

  async getPreferences(screen: string): Promise<UserPreferencesData[keyof UserPreferencesData] | null> {
    try {
      const userId = await this.getCurrentUserId();
      const cacheKey = `${userId}:${screen}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        return cached?.[screen as keyof UserPreferencesData] || null;
      }

      // Fetch from DynamoDB
      const result = await client.graphql({
        query: userPreferencesByUserId,
        variables: { userId, filter: { screen: { eq: screen } } }
      }) as any;

      const preferences = result.data?.userPreferencesByUserId?.items?.[0];
      if (preferences && preferences.preferences) {
        const parsedPreferences = JSON.parse(preferences.preferences);
        this.cache.set(cacheKey, { [screen]: parsedPreferences });
        return parsedPreferences;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  async savePreferences(screen: string, preferences: UserPreferencesData[keyof UserPreferencesData]): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const cacheKey = `${userId}:${screen}`;

      // Check if preferences already exist
      const existing = await client.graphql({
        query: userPreferencesByUserId,
        variables: { userId, filter: { screen: { eq: screen } } }
      }) as any;

      const existingPreference = existing.data?.userPreferencesByUserId?.items?.[0];
      const preferencesJson = JSON.stringify(preferences);

      if (existingPreference) {
        // Update existing preferences
        await client.graphql({
          query: updateUserPreferences,
          variables: {
            input: {
              id: existingPreference.id,
              preferences: preferencesJson
            }
          }
        });
      } else {
        // Create new preferences
        await client.graphql({
          query: createUserPreferences,
          variables: {
            input: {
              userId,
              screen,
              preferences: preferencesJson
            }
          }
        });
      }

      // Update cache
      this.cache.set(cacheKey, { [screen]: preferences });
      
      console.log(`Saved preferences for ${screen}:`, preferences);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error;
    }
  }

  async getProviderPreferences(): Promise<ProviderScreenPreferences | null> {
    return await this.getPreferences('providers') as ProviderScreenPreferences | null;
  }

  async saveProviderPreferences(preferences: ProviderScreenPreferences): Promise<void> {
    await this.savePreferences('providers', preferences);
  }

  // Helper method to create a new saved view
  async createSavedView(
    viewName: string,
    columnVisibility: Record<string, boolean>,
    columnOrder: string[],
    columnPinning: { left?: string[]; right?: string[] },
    filters?: Record<string, any>
  ): Promise<void> {
    const currentPreferences = await this.getProviderPreferences();
    const updatedPreferences: ProviderScreenPreferences = {
      columnVisibility: currentPreferences?.columnVisibility || {},
      columnOrder: currentPreferences?.columnOrder || [],
      columnPinning: currentPreferences?.columnPinning || {},
      activeView: currentPreferences?.activeView || 'default',
      filters: currentPreferences?.filters || {
        specialty: '__all__',
        adminRole: '__all__',
        subspecialty: '__all__',
        agreementDateFrom: '',
        agreementDateTo: '',
        compensationYear: ''
      },
      displaySettings: currentPreferences?.displaySettings || {
        rowsPerPage: 25,
        compactMode: false,
        showSummaryStats: true
      },
      savedViews: {
        ...currentPreferences?.savedViews,
        [viewName]: {
          name: viewName,
          columnVisibility,
          columnOrder,
          columnPinning,
          filters,
          createdAt: new Date().toISOString()
        }
      }
    };

    await this.saveProviderPreferences(updatedPreferences);
  }

  // Helper method to set active view
  async setActiveView(viewName: string): Promise<void> {
    const currentPreferences = await this.getProviderPreferences();
    if (currentPreferences) {
      const updatedPreferences: ProviderScreenPreferences = {
        ...currentPreferences,
        activeView: viewName
      };
      await this.saveProviderPreferences(updatedPreferences);
    }
  }

  // Helper method to delete a saved view
  async deleteSavedView(viewName: string): Promise<void> {
    const currentPreferences = await this.getProviderPreferences();
    if (currentPreferences?.savedViews?.[viewName]) {
      const { [viewName]: deleted, ...remainingViews } = currentPreferences.savedViews;
      const updatedPreferences: ProviderScreenPreferences = {
        ...currentPreferences,
        savedViews: remainingViews,
        activeView: currentPreferences.activeView === viewName ? 'default' : currentPreferences.activeView
      };
      await this.saveProviderPreferences(updatedPreferences);
    }
  }

  // Clear cache when user signs out
  clearCache(): void {
    this.cache.clear();
    this.currentUserId = null;
  }
}

export const userPreferencesService = new UserPreferencesService(); 