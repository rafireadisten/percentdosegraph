# Mobile App Setup Complete ✅

Your React Native mobile app skeleton is ready for rapid development. All plug points are configured to share code with the existing web backend.

## What Was Created

```
mobile/
├── app/                                 # React Native Expo app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── DoseGraphScreen.tsx    # Sample: Dose timeline
│   │   │   └── ProfilesScreen.tsx     # Sample: Saved profiles
│   │   ├── hooks/
│   │   │   ├── useDoseData.ts         # Fetch drugs & doses
│   │   │   └── useProfiles.ts         # Manage profiles
│   │   └── app.tsx                    # Root navigation (Expo Router)
│   ├── app.json                        # Expo config (app icon, name, etc)
│   ├── package.json                    # Dependencies & scripts
│   ├── tsconfig.json                   # TypeScript config
│   ├── .env.example                    # Environment template
│   └── .gitignore
│
├── shared/                              # Shared code between web & mobile
│   ├── api/
│   │   └── apiClient.ts               # API client (Zod validated)
│   └── store/
│       └── index.ts                   # Zustand stores (Auth, Workspace)
│
├── ios/                                 # iOS-specific (placeholder)
├── android/                             # Android-specific (placeholder)
│
├── setup.sh                             # One-command setup script
├── QUICKSTART.md                        # Get started in 5 minutes
├── ARCHITECTURE.md                      # Detailed architecture guide
├── INTEGRATION_POINTS.md               # Plug points for development
└── DEVELOPMENT_CHECKLIST.md            # Development checklist

```

## Next Steps (Do These Now)

### 1. Install and Run

```bash
# One command:
bash mobile/setup.sh

# Or manually:
cd mobile/app
npm install
npm run dev:ios    # or dev:android
```

### 2. Explore the Sample Screens

- `DoseGraphScreen.tsx` - Shows how to fetch and display data
- `ProfilesScreen.tsx` - Shows how to navigate between screens
- Both follow the same patterns, ready to clone for new features

### 3. Read the Quick Start

```bash
# Open in your editor:
mobile/QUICKSTART.md
```

Takes 5 minutes, covers the most common tasks.

### 4. Create Your First Feature

**Add a new screen:**
1. Copy `mobile/app/src/screens/DoseGraphScreen.tsx`
2. Modify it for your feature
3. Add route to `mobile/app/src/app.tsx`
4. Run in simulator - it will hot-reload

**Add API data:**
1. Add method to `mobile/shared/api/apiClient.ts`
2. Create hook in `mobile/app/src/hooks/`
3. Use hook in your screen

## Development Commands

```bash
# From mobile/app directory:

npm run dev:ios              # Start iOS simulator (hot reload enabled)
npm run dev:android          # Start Android emulator
npm run dev                  # Interactive mode (choose platform)

npm test                     # Run Jest tests
npm run lint                 # Check code style
npm run type-check           # TypeScript check

npm run build:ios            # Build for Apple TestFlight / App Store
npm run build:android        # Build for Google Play
```

## Architecture Highlights

### API Client (`mobile/shared/api/apiClient.ts`)
- Single source of truth for all API calls
- Zod validation on responses
- Same endpoints as web app
- Add methods as you need

### Custom Hooks (`mobile/app/src/hooks/`)
- Pattern: fetch data + manage loading/error
- Used in screens for decoupled data logic
- Easy to test and reuse

### Global State (`mobile/shared/store/`)
- Zustand for lightweight state management
- Persists to device storage automatically
- Auth and workspace state included

### Screens (`mobile/app/src/screens/`)
- Expo Router for navigation (Next.js-like)
- Tab-based layout ready to customize
- Modal support for detail views

## Key Files to Know

| File | Purpose |
|------|---------|
| `mobile/app/app.json` | App name, icon, colors, build config |
| `mobile/app/src/app.tsx` | Navigation structure |
| `mobile/app/package.json` | Dependencies and dev scripts |
| `mobile/shared/api/apiClient.ts` | All API calls go here |
| `mobile/shared/store/index.ts` | Global state (auth, workspace) |
| `.env.local` | API URL and other environment vars |

## Common Patterns

### Fetch Data in a Screen

```typescript
import { useDoseData } from '@/hooks/useDoseData';

export default function MyScreen() {
  const { data, loading, error } = useDoseData();
  
  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error}</Text>;
  
  return <View>{/* render data */}</View>;
}
```

### Navigate to a New Screen

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/new-screen');  // Replace with your screen name
```

### Access Global State

```typescript
import { useAuthStore, useWorkspaceStore } from '@shared/store';

const { token, isAuthenticated } = useAuthStore();
const { patientName, setPatientName } = useWorkspaceStore();
```

## What's Shared with Web

✅ Same backend API
✅ Same validation schemas (Zod)
✅ Same data models (Drug, Dose, Profile)
✅ Same authentication flow
✅ Automatic sync of profiles & doses

The mobile app talks to the exact same API server, so data syncs seamlessly between web and mobile.

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute overview (start here)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Full architecture deep-dive
- **[INTEGRATION_POINTS.md](./INTEGRATION_POINTS.md)** - Detailed plug points
- **[DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md)** - Feature development workflow

## Performance is Built In

- Hot reload in simulator (< 1 second)
- TypeScript for type safety
- Lazy-import components/screens
- FlatList for efficient lists
- Zustand for minimal re-renders

## Support

All patterns follow React Native best practices and match your existing web app's architecture.

For questions:
1. Check relevant `.md` file above
2. Look at sample screens for patterns
3. Search `mobile/shared/api/apiClient.ts` for similar endpoints

## Ready?

```bash
cd mobile/app
npm install
npm run dev:ios
```

Your app will be running in the simulator in about 30 seconds.

---

**Built for rapid development.** Clone screens, add hooks, deploy. No wasted cycles.
