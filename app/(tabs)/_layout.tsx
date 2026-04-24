import { Tabs } from "expo-router";
import AppTabBar from "@/src/components/navigation/AppTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="care-requests" />
      <Tabs.Screen name="nurse" />
      <Tabs.Screen name="admin" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
