import { Stack } from "expo-router";

export default function NurseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="payroll" />
    </Stack>
  );
}
