# Integration Points for Mobile App

This document outlines the key plug points for rapid mobile development.

## API Client Integration

**Location:** `mobile/shared/api/apiClient.ts`

All API calls go through this single client. Add methods as endpoints are needed:

```typescript
// Already implemented
apiClient.getDrugs()          // GET /drugs
apiClient.getDoses()          // GET /doses
apiClient.getProfiles()       // GET /profiles
apiClient.createProfile()     // POST /profiles
apiClient.createDose()        // POST /doses
apiClient.login()             // POST /auth/login
apiClient.register()          // POST /auth/register

// To add new endpoints:
async myNewEndpoint(param: string) {
  const response = await this.client.get(`/my-endpoint/${param}`);
  return MySchema.parse(response.data);  // Zod validation
}
```

## State Management

**Location:** `mobile/shared/store/index.ts`

Global state stored in Zustand + device persistence:

```typescript
// Already available
useAuthStore()          // Auth token + user data
useWorkspaceStore()     // Patient name, route, timeframe, selected drugs

// To add global state:
export const myStore = create<MyState>()(
  persist(
    (set) => ({
      // state here
      setValue: (val) => set({ value: val }),
    }),
    { name: 'my-storage' }
  )
);
```

## Screens

**Location:** `mobile/app/src/screens/`

Create screens here, automatically routable:

### Example: New feature screen

`mobile/app/src/screens/NewFeatureScreen.tsx`:
```typescript
import { useMyHook } from '@/hooks/useMyHook';

export default function NewFeatureScreen() {
  const { data, loading, error } = useMyHook();
  
  return (
    <View>
      {/* UI here */}
    </View>
  );
}
```

Add route in `mobile/app/src/app.tsx`:
```typescript
<Stack.Screen name="new-feature" />
```

Navigate from other screens:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/new-feature');
```

## Hooks (Data Fetching)

**Location:** `mobile/app/src/hooks/`

Pattern: React hook that manages API calls + loading/error states

```typescript
export function useMyData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const result = await apiClient.myEndpoint();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, loading, error };
}
```

Use in any screen:
```typescript
const { data, loading, error } = useMyData();
```

## Components

**Location:** `mobile/app/src/components/`

Reusable UI components (buttons, cards, lists, etc.)

Example: `mobile/app/src/components/DrugCard.tsx`
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function DrugCard({ drug, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Text style={styles.name}>{drug.name}</Text>
    </TouchableOpacity>
  );
}
```

Use across screens:
```typescript
import { DrugCard } from '@/components/DrugCard';

<DrugCard drug={drugItem} onPress={handlePress} />
```

## Navigation

**Location:** `mobile/app/src/app.tsx` and `mobile/app/src/navigation/`

Current setup: Expo Router with tab-based layout

Add simple screens:
```typescript
<Stack.Screen 
  name="my-screen"
  options={{ title: 'My Screen' }}
/>
```

Add modals (detail screens):
```typescript
<Stack.Screen 
  name="profile-detail"
  options={{ 
    presentation: 'modal',
    title: 'Profile Details'
  }}
/>
```

Navigate with params:
```typescript
router.push({
  pathname: '/profile-detail',
  params: { id: '123' }
});
```

Receive params:
```typescript
import { useLocalSearchParams } from 'expo-router';

const { id } = useLocalSearchParams();
```

## Environment & Configuration

**Location:** `mobile/app/app.json`

Expo configuration:
- App name, icon, splash screen, colors
- iOS/Android package names
- Plugins for native modules

**Location:** `mobile/app/.env.local`

Runtime environment (create this file):
```
EXPO_PUBLIC_API_URL=http://your-api.com/api
```

Access in code:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL;
```

## Testing

**Location:** `mobile/app/src/**/*.test.ts(x)`

Jest + React Native Testing Library

Example: `mobile/app/src/hooks/useDoseData.test.ts`
```typescript
jest.mock('@shared/api/apiClient');

describe('useDoseData', () => {
  it('fetches drugs and doses', async () => {
    // test implementation
  });
});
```

Run:
```bash
npm test
npm run lint
npm run type-check
```

## Quick Checklist

- [ ] `chmod +x mobile/setup.sh && bash mobile/setup.sh`
- [ ] `npm run dev:ios` or `npm run dev:android`
- [ ] Explore `mobile/app/src/screens/DoseGraphScreen.tsx`
- [ ] Add new screen to `mobile/app/src/screens/`
- [ ] Use hook pattern for data fetching
- [ ] Connect to backend API via `apiClient`
- [ ] Test with `npm test`
- [ ] Build with `npm run build:ios` or `npm run build:android`

## Sync with Web App

The mobile app shares:
- Same backend API endpoints
- Same validation schemas (Zod)
- Same data models (Drug, Dose, Profile)
- Same auth flow

Profile data, doses, and user auth all sync bidirectionally between web and mobile.
