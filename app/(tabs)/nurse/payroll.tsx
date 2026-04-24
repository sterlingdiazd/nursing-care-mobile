import { View } from "react-native";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

// Re-export nurse payroll screen with testID wrapper for UC-012 selector contract.
import NursePayrollScreen from "@/app/nurse/payroll";

export default function NursePayrollTab() {
  return (
    <View
      testID={navigationTestIds.screens.nursePayrollRoot}
      nativeID={navigationTestIds.screens.nursePayrollRoot}
      style={{ flex: 1 }}
    >
      <NursePayrollScreen />
    </View>
  );
}
