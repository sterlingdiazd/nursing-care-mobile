import { Stack } from "expo-router";

// (tabs) is a file-system grouping; the actual BottomBar lives at the root
// layout so it persists across every authenticated route including
// non-(tabs) admin sub-routes like /admin/payroll.
export default function TabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
