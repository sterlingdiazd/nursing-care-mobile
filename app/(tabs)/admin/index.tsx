import { View } from "react-native";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

import AdminDashboardScreen from "@/app/admin/index";

export default function AdminTab() {
  return (
    <View
      testID={navigationTestIds.screens.adminHomeRoot}
      nativeID={navigationTestIds.screens.adminHomeRoot}
      style={{ flex: 1 }}
    >
      <AdminDashboardScreen />
    </View>
  );
}
