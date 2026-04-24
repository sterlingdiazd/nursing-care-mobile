import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="action-items" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="audit-logs" />
      <Stack.Screen name="catalog" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="shifts" />
      <Stack.Screen name="care-requests" />
      <Stack.Screen name="clients" />
      <Stack.Screen name="nurse-profiles" />
      <Stack.Screen name="users" />
      <Stack.Screen name="admin-accounts" />
      <Stack.Screen name="diagnostics" />
      <Stack.Screen name="tools" />
    </Stack>
  );
}
