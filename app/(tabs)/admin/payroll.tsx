import { View } from "react-native";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

import AdminPayrollScreen from "@/app/admin/payroll";

export default function AdminPayrollTab() {
  return (
    <View
      testID={navigationTestIds.screens.adminPayrollRoot}
      nativeID={navigationTestIds.screens.adminPayrollRoot}
      style={{ flex: 1 }}
    >
      <AdminPayrollScreen />
    </View>
  );
}
