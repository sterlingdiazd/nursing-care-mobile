import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react-native";
import AdminDashboard from "./index";

vi.mock("@components/app/MobileWorkspaceShell", () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    roles: ["ADMIN"],
    email: "admin@test.com",
    isReady: true,
  }),
}));

describe("Admin Dashboard Navigation", () => {
  it("should render the 'Abrir reportes' button", () => {
    // We mock the screen to just check the labels
    render(<AdminDashboard />);
    expect(screen.getByText("Abrir reportes")).toBeTruthy();
  });
});
