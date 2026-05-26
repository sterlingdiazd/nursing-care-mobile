import { vi } from 'vitest';
import React from 'react';

// Pin the suite to the Dominican Republic timezone (UTC-4, no DST). The date tests assert
// the exact local rendering of UTC instants and date-only strings; without this they would
// silently pass on a DR/negative-offset machine yet fail on a UTC CI runner. Set before any
// Date is constructed so V8 resolves the offset from this value.
process.env.TZ = "America/Santo_Domingo";

Object.defineProperty(globalThis, "__DEV__", {
  value: false,
  writable: true,
  configurable: true,
});

// Mock React Native components
const createMockComponent = (name: string) => {
  const component = (props: any) => {
    // Return a React element that react-test-renderer can render
    return React.createElement(name, props, props.children);
  };
  component.displayName = name;
  return component;
};

const mockExpoRouter = {
  push: vi.fn(),
  back: vi.fn(),
  canGoBack: vi.fn(() => false),
  replace: vi.fn(),
};

vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: createMockComponent('View'),
  Text: createMockComponent('Text'),
  Image: createMockComponent('Image'),
  TouchableOpacity: createMockComponent('TouchableOpacity'),
  Pressable: createMockComponent('Pressable'),
  ScrollView: createMockComponent('ScrollView'),
  RefreshControl: createMockComponent('RefreshControl'),
  FlatList: createMockComponent('FlatList'),
  SectionList: createMockComponent('SectionList'),
  StatusBar: createMockComponent('StatusBar'),
  SafeAreaView: createMockComponent('SafeAreaView'),
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
  Animated: {
    Value: class {
      constructor(_v: number) {}
      setValue(_v: number) {}
      interpolate(_config: any) { return this; }
    },
    timing: (_value: any, _config: any) => ({ start: vi.fn() }),
    spring: (_value: any, _config: any) => ({ start: vi.fn() }),
    parallel: (_animations: any[]) => ({ start: vi.fn() }),
    sequence: (_animations: any[]) => ({ start: vi.fn() }),
    View: createMockComponent('Animated.View'),
    Text: createMockComponent('Animated.Text'),
    Image: createMockComponent('Animated.Image'),
    createAnimatedComponent: (comp: any) => comp,
  },
  PanResponder: {
    create: (_config: any) => ({ panHandlers: {} }),
  },
}));

// Mock Expo Router
vi.mock('expo-router', () => ({
  router: mockExpoRouter,
  useRouter: () => mockExpoRouter,
  useLocalSearchParams: () => ({}),
}));

vi.mock('expo-router/src/layouts/Stack', () => {
  const Stack = createMockComponent('Stack') as any;
  Stack.Screen = createMockComponent('Stack.Screen');
  return { default: Stack };
});

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
  parse: vi.fn(() => ({ queryParams: {} })),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  openURL: vi.fn(),
}));

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  impactAsync: vi.fn(),
  selectionAsync: vi.fn(),
  NotificationFeedbackType: {
    Success: 'Success',
    Error: 'Error',
  },
  ImpactFeedbackStyle: {
    Light: 'Light',
  },
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  default: createMockComponent('DateTimePicker'),
}));

vi.mock('@react-native-community/slider', () => ({
  default: createMockComponent('Slider'),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: '/mock-documents/',
  writeAsStringAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}));

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock-documents/',
  downloadAsync: vi.fn().mockResolvedValue({ status: 200, uri: '/mock-documents/export.csv' }),
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
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
// @expo/vector-icons loads a .ttf via its index that rollup can't parse at import time,
// which breaks any screen test that imports a FontAwesome-using component (mobile-refactoring rule 10).
vi.mock('@expo/vector-icons/FontAwesome', () => ({ default: () => null }));
vi.mock('@expo/vector-icons', () => ({ FontAwesome: () => null }));

vi.mock('@/src/services/payrollService', () => ({
  getPayrollPeriods: vi.fn().mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
  getPayrollPeriodById: vi.fn().mockResolvedValue({}),
  createPayrollPeriod: vi.fn().mockResolvedValue({}),
  updatePayrollPeriod: vi.fn().mockResolvedValue(undefined),
  deletePayrollPeriod: vi.fn().mockResolvedValue(undefined),
  closePayrollPeriod: vi.fn().mockResolvedValue({}),
  getCompensationRules: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getCompensationRuleById: vi.fn().mockResolvedValue({}),
  createCompensationRule: vi.fn().mockResolvedValue({}),
  updateCompensationRule: vi.fn().mockResolvedValue({}),
  deactivateCompensationRule: vi.fn().mockResolvedValue({}),
  reactivateCompensationRule: vi.fn().mockResolvedValue({}),
  getDeductions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  createDeduction: vi.fn().mockResolvedValue({}),
  updateDeduction: vi.fn().mockResolvedValue({}),
  deleteDeduction: vi.fn().mockResolvedValue({}),
  getAdjustments: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  createAdjustment: vi.fn().mockResolvedValue({}),
  deleteAdjustment: vi.fn().mockResolvedValue({}),
  recalculatePayroll: vi.fn().mockResolvedValue({
    auditId: "audit-1",
    linesAffected: 0,
    totalOldNet: 0,
    totalNewNet: 0,
    triggeredAtUtc: "2026-04-20T00:00:00Z",
  }),
  getAdminMobilePayrollSummary: vi.fn().mockResolvedValue({
    openPeriodsCount: 0,
    closedPeriodsCount: 0,
    totalCompensationCurrentPeriod: 0,
    activeNursesCount: 0,
    recentPeriods: [],
  }),
  getScheduledDeductions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getScheduledDeductionById: vi.fn().mockResolvedValue({ plan: {}, installments: [] }),
  createScheduledDeduction: vi.fn().mockResolvedValue({ id: "sd-1" }),
  payoffScheduledDeduction: vi.fn().mockResolvedValue({}),
  rescheduleScheduledDeduction: vi.fn().mockResolvedValue({}),
  skipScheduledInstallment: vi.fn().mockResolvedValue({}),
  cancelScheduledDeduction: vi.fn().mockResolvedValue({}),
  submitPayrollLineOverride: vi.fn().mockResolvedValue({}),
  approvePayrollLineOverride: vi.fn().mockResolvedValue({}),
  getPayrollPeriodExportUrl: vi.fn(() => "https://test.local/export.csv"),
  getPayrollPeriodReportPdfUrl: vi.fn(() => "https://test.local/report.pdf"),
  getPayrollPeriodReportXlsxUrl: vi.fn(() => "https://test.local/report.xlsx"),
  getAdminPayrollVoucherUrl: vi.fn(() => "https://test.local/voucher.pdf"),
  getAdminPayrollBulkVouchersUrl: vi.fn(() => "https://test.local/vouchers.zip"),
}));

// Mock Catalog Options Service
vi.mock('@/src/services/catalogOptionsService', () => ({
  getCareRequestOptions: vi.fn().mockResolvedValue({}),
  getNurseProfileOptions: vi.fn().mockResolvedValue({}),
  getAvailableNurses: vi.fn().mockResolvedValue([]),
}));

// Mock MobileWorkspaceShell
const _mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  canGoBack: vi.fn(() => false),
  replace: vi.fn(),
};

vi.mock('@/components/app/MobileWorkspaceShell', () => ({
  default: vi.fn(({ children, actions, footer, testID, nativeID, primaryReturnLabel, onPrimaryReturn, primaryReturnPath, workflowActions, systemActions }) => {
    const returnButton =
      primaryReturnLabel || primaryReturnPath || onPrimaryReturn
        ? React.createElement(
            'Pressable',
            {
              testID: 'nav-shell-primary-return-button',
              nativeID: 'nav-shell-primary-return-button',
              onPress: onPrimaryReturn ?? (() => _mockRouter.replace(primaryReturnPath)),
            },
            primaryReturnLabel ?? 'Volver',
          )
        : null;
    // Mirror AppFooter: render structured workflow/system actions as pressables
    // carrying their testID so footer-action-based tests can find them.
    const renderActions = (list: any[] | undefined) =>
      (list ?? []).map((action, idx) =>
        React.createElement(
          'Pressable',
          {
            key: action.testID ?? idx,
            testID: action.testID,
            nativeID: action.testID,
            disabled: action.disabled,
            onPress: action.onPress,
          },
          action.label,
        ),
      );
    return React.createElement(
      'View',
      { testID, nativeID },
      returnButton,
      actions,
      ...renderActions(workflowActions),
      ...renderActions(systemActions),
      children,
      footer,
    );
  }),
}));

// Mock Admin Shifts Service
vi.mock('@/src/services/adminShiftsService', () => ({
  listAdminSettings: vi.fn().mockResolvedValue([]),
  updateAdminSetting: vi.fn().mockResolvedValue({}),
  listAdminShifts: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getAdminShiftDetail: vi.fn().mockResolvedValue({}),
  getAdminShiftChanges: vi.fn().mockResolvedValue([]),
}));

// Mock Admin Portal Service — use importOriginal so all exports are available.
// Individual test files that need specific return values mock httpClient.requestJson directly.
vi.mock('@/src/services/adminPortalService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/services/adminPortalService')>()),
}));

// Mock console.error to reduce noise
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
