# PercentDoseGraph Mobile Quick Start

## One-Command Setup

```bash
bash mobile/setup.sh
```

Or manually:

```bash
cd mobile/app
npm install
```

## Run on Simulator

**iOS:**
```bash
npm run dev:ios
```

**Android:**
```bash
npm run dev:android
```

**Both (interactive):**
```bash
npm run dev
```

## Project Structure at a Glance

```
mobile/
├── app/                    # React Native Expo app - START HERE
│   ├── src/
│   │   ├── screens/       # Add new feature screens here
│   │   ├── hooks/         # Add data fetching hooks here
│   │   └── components/    # Reusable UI components
│   └── package.json       # Dependencies and scripts
│
├── shared/                # Shared code with web
│   ├── api/              # API client - extends to new endpoints
│   └── store/            # State management (Zustand)
│
└── ARCHITECTURE.md        # Full architecture guide
```

## Development Workflow

### Add a New Feature

1. **Create a screen** in `app/src/screens/`:
   ```tsx
   // Example: MyFeatureScreen.tsx
   import React from 'react';
   import { View, Text } from 'react-native';
   
   export default function MyFeatureScreen() {
     return <View><Text>My Feature</Text></View>;
   }
   ```

2. **Add a route** in `app/src/app.tsx`:
   ```tsx
   <Stack.Screen name="my-feature" />
   ```

3. **Add data fetching** in `app/src/hooks/`:
   ```ts
   export function useMyFeature() {
     return useQuery(() => apiClient.myEndpoint());
   }
   ```

### Add an API Endpoint

1. Edit `mobile/shared/api/apiClient.ts`:
   ```ts
   async myEndpoint() {
     const response = await this.client.get('/my-endpoint');
     return MySchema.parse(response.data);
   }
   ```

2. Use in a hook or component:
   ```ts
   const data = await apiClient.myEndpoint();
   ```

## Key Dependencies

- **React Native** - Mobile UI framework
- **Expo** - Build/run tools and native module plugins
- **Zustand** - Lightweight state management
- **Axios** - HTTP client
- **Zod** - Runtime type validation
- **Expo Router** - Navigation (like Next.js for mobile)

## Environment Variables

Create `.env.local` in `mobile/app/`:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Common Issues

**"Command not found: npm"**
- Install Node.js from nodejs.org

**"Error: ENOENT: no such file or directory"**
- Make sure you're in `mobile/app/` directory
- Run `npm install` first

**Simulator won't start**
- For iOS: Install Xcode, run `xcode-select --install`
- For Android: Set up Android Studio + emulator

## For Full Details

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- Detailed structure explanation
- State management patterns
- Chart library integration options
- Production build process
- Testing setup

## Next Steps

1. ✅ Run: `npm run dev:ios` or `npm run dev:android`
2. 📱 Experiment with the sample screens
3. 📚 Read ARCHITECTURE.md for patterns
4. 🚀 Build your feature
5. 🔗 Connect to your backend API
