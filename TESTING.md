# Testing Guide

This guide covers the comprehensive testing setup for PercentDoseGraph, including unit tests, integration tests, API tests, and performance monitoring.

## Table of Contents

- [Testing Overview](#testing-overview)
- [Unit Testing](#unit-testing)
- [API Testing](#api-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Test Coverage](#test-coverage)
- [CI/CD Testing](#cicd-testing)
- [Debugging Tests](#debugging-tests)

## Testing Overview

PercentDoseGraph uses a multi-layered testing approach:

- **Jest** for unit and integration testing
- **Vitest** as an alternative fast testing framework
- **Supertest** for API endpoint testing
- **Testing Library** for React component testing
- **Lighthouse** for performance monitoring
- **Storybook** for component documentation and visual testing

## Unit Testing

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run Vitest instead
npm run test:vitest
npm run test:vitest:ui  # With UI
```

### Writing Unit Tests

#### React Component Tests

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Utility Function Tests

```javascript
import { calculateDosePercentage } from './utils';

describe('calculateDosePercentage', () => {
  test('calculates percentage correctly', () => {
    expect(calculateDosePercentage(50, 100)).toBe(50);
    expect(calculateDosePercentage(25, 200)).toBe(12.5);
  });

  test('handles edge cases', () => {
    expect(calculateDosePercentage(0, 100)).toBe(0);
    expect(calculateDosePercentage(100, 0)).toBe(Infinity);
  });
});
```

## API Testing

### Running API Tests

```bash
# Run API tests only
npm run test:api

# Run API tests with coverage
npm run test:api -- --coverage
```

### Writing API Tests

```javascript
import request from 'supertest';
import app from '../app';

describe('Auth API', () => {
  test('POST /api/auth/register creates new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });

  test('POST /api/auth/login authenticates user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
  });
});
```

## Integration Testing

### Database Integration Tests

```javascript
import { createClient } from '@libsql/client';
import { migrate } from './db/migrate';

describe('Database Integration', () => {
  let db;

  beforeAll(async () => {
    db = createClient({ url: ':memory:' });
    await migrate(db);
  });

  afterAll(async () => {
    await db.close();
  });

  test('creates and retrieves profiles', async () => {
    const profile = { name: 'Test Profile', maxDose: 100 };
    const id = await createProfile(db, profile);
    const retrieved = await getProfile(db, id);

    expect(retrieved.name).toBe(profile.name);
    expect(retrieved.maxDose).toBe(profile.maxDose);
  });
});
```

## End-to-End Testing

### Using Playwright (Recommended)

```bash
npm install --save-dev @playwright/test
npx playwright install
```

```javascript
import { test, expect } from '@playwright/test';

test('complete user workflow', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Register new user
  await page.click('text=Register');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password123');
  await page.click('button[type=submit]');

  // Add medication profile
  await page.click('text=Add Profile');
  await page.fill('[name=medicationName]', 'Warfarin');
  await page.fill('[name=maxDose]', '10');
  await page.click('text=Save');

  // Verify profile appears
  await expect(page.locator('text=Warfarin')).toBeVisible();
});
```

## Performance Testing

### Lighthouse Performance Monitoring

```bash
# Run Lighthouse audit
npm run lighthouse

# Or run manually
npx lighthouse http://localhost:8080 --output html --output-path ./reports/lighthouse.html
```

### Performance Test Configuration

```javascript
// lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run dev:web',
      startServerReadyPattern: 'ready on http://localhost:8080',
      url: ['http://localhost:8080'],
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

## Test Coverage

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,ts,jsx,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Coverage Reports

```bash
npm run test:coverage
# Opens coverage report in browser
open coverage/lcov-report/index.html
```

## CI/CD Testing

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

### Pre-commit Hooks

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname --/husky.sh"

npm run lint
npm run test
npm run build
```

## Debugging Tests

### Common Issues

1. **Async Tests**: Always await async operations
2. **Mock Cleanup**: Clear mocks between tests
3. **DOM Testing**: Use `screen` from Testing Library
4. **API Testing**: Mock external API calls

### Debugging Tips

```javascript
// Debug component rendering
const { debug } = render(<Component />);
debug(); // Prints component tree

// Debug API calls
const mockFetch = jest.spyOn(global, 'fetch');
expect(mockFetch).toHaveBeenCalledWith('/api/data');

// Debug async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### Test Utilities

```javascript
// test-utils.js
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const AllTheProviders = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## Best Practices

1. **Test Behavior, Not Implementation**
2. **Keep Tests Simple and Focused**
3. **Use Descriptive Test Names**
4. **Mock External Dependencies**
5. **Test Error Conditions**
6. **Maintain Test Coverage Above 80%**
7. **Run Tests in CI/CD Pipeline**
8. **Use Test Utilities for Common Patterns**

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
