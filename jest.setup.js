import '@testing-library/jest-dom';
import { setImmediate as nodeSetImmediate } from 'timers';
import { TextDecoder, TextEncoder } from 'util';

// Mock localStorage
let localStorageState = {};
const localStorageMock = {
  getItem: jest.fn(key => (key in localStorageState ? localStorageState[key] : null)),
  setItem: jest.fn((key, value) => {
    localStorageState[key] = String(value);
  }),
  removeItem: jest.fn(key => {
    delete localStorageState[key];
  }),
  clear: jest.fn(() => {
    localStorageState = {};
  }),
};
global.localStorage = localStorageMock;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = nodeSetImmediate;

// Mock fetch
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
