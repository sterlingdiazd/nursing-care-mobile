import { vi } from 'vitest';
import React from 'react';

// Mock React Native components
const createMockComponent = (name: string) => {
  const component = (props: any) => {
    // Return a React element that react-test-renderer can render
    return React.createElement(name, props, props.children);
  };
  component.displayName = name;
  return component;
};

vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: createMockComponent('View'),
  Text: createMockComponent('Text'),
  TouchableOpacity: createMockComponent('TouchableOpacity'),
  ScrollView: createMockComponent('ScrollView'),
  RefreshControl: createMockComponent('RefreshControl'),
  FlatList: createMockComponent('FlatList'),
  SectionList: createMockComponent('SectionList'),
  StatusBar: createMockComponent('StatusBar'),
  TextInput: createMockComponent('TextInput'),
  ActivityIndicator: createMockComponent('ActivityIndicator'),
  Modal: createMockComponent('Modal'),
  KeyboardAvoidingView: createMockComponent('KeyboardAvoidingView'),
  Alert: {
    alert: vi.fn(),
  },
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios,
  },
}));

// Mock Expo Router
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  },
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock React Native Safe Area Context
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock Expo Constants
vi.mock('expo-constants', () => ({
  default: {
    statusBarHeight: 0,
  },
}));

// Mock Expo Linking
vi.mock('expo-linking', () => ({
  createURL: vi.fn(),
  useURL: vi.fn(),
}));

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/src/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    token: 'mock-token',
    userId: '1',
    email: 'admin@example.com',
    roles: ['ADMIN'],
    profileType: 'ADMIN',
    requiresProfileCompletion: false,
    requiresAdminReview: false,
    isAuthenticated: true,
    isReady: true,
    isLoading: false,
    error: null,
    setSession: vi.fn(),
    completeOAuthLogin: vi.fn(),
    setTokenManually: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    completeProfile: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  })),
}));

// Mock Payroll Service
vi.mock('@/src/services/payrollService', () => ({
  getPayrollPeriods: vi.fn().mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
  getPayrollPeriodById: vi.fn().mockResolvedValue({}),
  createPayrollPeriod: vi.fn().mockResolvedValue({}),
  closePayrollPeriod: vi.fn().mockResolvedValue({}),
  getCompensationRules: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getCompensationRuleById: vi.fn().mockResolvedValue({}),
  createCompensationRule: vi.fn().mockResolvedValue({}),
  updateCompensationRule: vi.fn().mockResolvedValue({}),
  deactivateCompensationRule: vi.fn().mockResolvedValue({}),
  getDeductions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  createDeduction: vi.fn().mockResolvedValue({}),
  deleteDeduction: vi.fn().mockResolvedValue({}),
  getAdjustments: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  createAdjustment: vi.fn().mockResolvedValue({}),
  deleteAdjustment: vi.fn().mockResolvedValue({}),
}));

// Mock MobileWorkspaceShell
vi.mock('@/components/app/MobileWorkspaceShell', () => ({
  default: vi.fn(({ children }) => children),
}));

// Mock console.error to reduce noise
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});