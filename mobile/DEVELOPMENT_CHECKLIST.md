# Mobile Development Checklist

Use this checklist when starting mobile development work.

## Initial Setup

- [ ] Clone or pull latest repo
- [ ] Run `cd mobile/app && npm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Update `EXPO_PUBLIC_API_URL` if needed
- [ ] Run `npm run dev:ios` or `npm run dev:android`
- [ ] Simulator loads app successfully

## Before Starting a Feature

- [ ] Check `mobile/ARCHITECTURE.md` for patterns
- [ ] Review `mobile/INTEGRATION_POINTS.md` for available hooks
- [ ] Check existing screens in `src/screens/` for similar features
- [ ] Planning: new screen? new hook? new API endpoint?

## Implementation Checklist

### For a new screen:

- [ ] Create component in `mobile/app/src/screens/NewScreen.tsx`
- [ ] Add route to `mobile/app/src/app.tsx`
- [ ] Add navigation option (tab or button)
- [ ] Test navigation on both iOS and Android
- [ ] Handle loading and error states
- [ ] Test with real API data

### For data fetching:

- [ ] Add API method to `mobile/shared/api/apiClient.ts`
- [ ] Include Zod schema validation
- [ ] Create custom hook in `mobile/app/src/hooks/`
- [ ] Test hook with sample data
- [ ] Handle errors and loading states
- [ ] Document hook usage

### For shared state:

- [ ] Add store to `mobile/shared/store/index.ts`
- [ ] Use Zustand with persistence enabled
- [ ] Document available state and actions
- [ ] Test persistence across app restart

## Testing Checklist

- [ ] Visual inspection on iOS simulator
- [ ] Visual inspection on Android emulator
- [ ] Navigation works between screens
- [ ] Data loads without errors
- [ ] Error states display correctly
- [ ] Loading indicators appear
- [ ] Offline mode works (if applicable)
- [ ] State persists after app restart

```bash
# Run tests
npm test
npm run lint
npm run type-check
```

## Code Quality

- [ ] All TypeScript errors resolved
- [ ] ESLint passes
- [ ] No console warnings (except expected ones)
- [ ] Code follows existing patterns
- [ ] Components accept proper prop types
- [ ] Hooks have proper dependencies

## Performance

- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] API calls are memoized appropriately
- [ ] Large lists use FlatList or VirtualizedList
- [ ] Images are properly sized
- [ ] State updates are efficient

## Documentation

- [ ] Code has JSDoc comments for public APIs
- [ ] New screens documented in QUICKSTART.md
- [ ] New hooks documented with example usage
- [ ] Integration points updated if needed

## Ready to Merge

- [ ] All checklist items completed
- [ ] Tests passing
- [ ] No TypeScript errors
- [ ] Linting clean
- [ ] Code reviewed (if applicable)
- [ ] Branch up to date with main

## Deployment

- [ ] Local build works: `npm run build:ios` or `npm run build:android`
- [ ] EAS account configured (if building to cloud)
- [ ] Environment variables updated for production
- [ ] Version bumped in `package.json` and `app.json`
- [ ] Build logs checked for warnings

## Common Issues & Solutions

### "Command not found: npm"
```bash
# Make sure you're in the right directory
cd mobile/app
npm install
```

### "API connection refused"
```bash
# Check EXPO_PUBLIC_API_URL in .env.local
# Make sure backend server is running: npm run dev:api
```

### "Module not found: @shared/..."
```bash
# Ensure mobile/app/tsconfig.json has correct path mappings
# Run: npm install
```

### "Red box error in simulator"
- Check error message and trace
- Look at terminal output for stack trace
- Search ARCHITECTURE.md or QUICKSTART.md for similar issues

### "Simulator won't start"
- **iOS**: `xcode-select --install`
- **Android**: Install Android Studio + set up emulator in AVD Manager

## Quick Links

- **Architecture**: [mobile/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Quick Start**: [mobile/QUICKSTART.md](./QUICKSTART.md)
- **Integration Points**: [mobile/INTEGRATION_POINTS.md](./INTEGRATION_POINTS.md)
- **Main API Client**: [mobile/shared/api/apiClient.ts](./shared/api/apiClient.ts)
- **State Stores**: [mobile/shared/store/index.ts](./shared/store/index.ts)

## Tips for Rapid Development

1. **Reuse Patterns**: Look at `DoseGraphScreen.tsx` and `ProfilesScreen.tsx` for screen templates
2. **Share Logic**: Put calculation/validation in `shared/` folder
3. **Status Messages**: Show loading/error states consistently
4. **Hot Reload**: Changes auto-reload in simulator (fast iteration)
5. **React DevTools**: Install Expo DevTools in simulator for debugging

## After Merge

- [ ] Update CHANGELOG.md with feature summary
- [ ] Close related GitHub issues
- [ ] Update main README.md if public-facing changes
- [ ] Notify team of new features
- [ ] Monitor for user feedback
