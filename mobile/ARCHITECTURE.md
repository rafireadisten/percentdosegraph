# Mobile App Architecture

## Structure

```
mobile/
├── app/                          # React Native Expo app
│   ├── src/
│   │   ├── screens/             # Screen components
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── navigation/          # Navigation config
│   │   └── app.tsx              # Root navigation
│   ├── app.json                 # Expo configuration
│   ├── package.json             # App dependencies
│   └── tsconfig.json
├── shared/                       # Shared code between web & mobile
│   ├── api/
│   │   └── apiClient.ts         # API client (Zod validated)
│   └── store/
│       └── index.ts             # Zustand stores (auth, workspace)
├── ios/                          # iOS-specific native code
└── android/                      # Android-specific native code
```

## Rapid Development Setup

### 1. Install and Run
```bash
cd mobile/app
npm install
npm run dev:ios    # or dev:android
```

### 2. Key Plug Points

**API Client** (`mobile/shared/api/apiClient.ts`)
- Add new API methods here
- Same schemas as web API (Zod validated)
- Automatically available to React Native screens

**State Management** (`mobile/shared/store/index.ts`)
- Global stores using Zustand
- Persisted to device storage
- Share auth state across app

**Screens** (`mobile/app/src/screens/`)
- Start new screens here
- Use hooks for data fetching
- Reference: `DoseGraphScreen.tsx`, `ProfilesScreen.tsx`

**Hooks** (`mobile/app/src/hooks/`)
- Custom hooks for reusable logic
- Examples: `useDoseData`, `useProfiles`
- Follow web app patterns

### 3. Reuse from Web

**Business Logic**
- Validation schemas (Zod) are shared
- API response types match web
- Same drug/dose/profile data structures

**Navigation**
- Expo Router (similar to Next.js App Router)
- Tab-based navigation skeleton ready
- Modal support for detail screens

### 4. Chart Integration

Replace placeholder in `DoseGraphScreen.tsx`:
- `react-native-svg-charts` - lightweight for mobile
- `react-native-chart-kit` - full-featured
- `skia-react-native` - high-performance

### 5. Build for Production

```bash
npm run build:ios      # Apple TestFlight / App Store
npm run build:android  # Google Play
```

Requires EAS (Expo Application Services) account.

### 6. Testing

```bash
npm test               # Run Jest tests
npm run lint           # Type check & linting
npm run type-check     # TypeScript check
```

## Common Tasks

**Add a new screen:**
1. Create component in `src/screens/NewScreen.tsx`
2. Add route to `src/app.tsx`
3. Use data from shared hooks or stores

**Add API endpoint:**
1. Add method to `shared/api/apiClient.ts`
2. Define Zod schema validation
3. Use in hooks or component

**Share state:**
1. Create store in `shared/store/index.ts`
2. Import with `useWorkspaceStore()` or `useAuthStore()`
3. Available everywhere

## Web Sync

Mobile app uses same backend API as web. Profiles and doses sync automatically when authenticated.

Local data persists when offline and syncs when reconnected.
