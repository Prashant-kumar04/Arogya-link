// src/app/routes.ts — All app routes with a root layout for session restore
import { createBrowserRouter, Outlet } from "react-router";
import { useEffect } from "react";
import PhoneLoginScreen from "./pages/PhoneLoginScreen";
import OTPVerificationScreen from "./pages/OTPVerificationScreen";
import RegisterNameScreen from "./pages/RegisterNameScreen";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { useSessionRestore } from "./hooks/useSessionRestore";
import { useDeviceInit } from "./hooks/useDeviceInit";

// ✅ Root layout: runs inside router context so useNavigate/useLocation work correctly
function RootLayout() {
  // These hooks need to be called inside the router — this is the right place
  useSessionRestore();
  useDeviceInit();
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    // Root route wraps all children with session restore + device init
    element: <RootLayout />,
    children: [
      {
        path: "/",
        Component: PhoneLoginScreen,
      },
      {
        path: "/verify-otp",
        Component: OTPVerificationScreen,
      },
      {
        path: "/register-name",
        Component: RegisterNameScreen,
      },
      {
        path: "/dashboard",
        Component: Dashboard,
      },
      {
        path: "/admin",
        Component: AdminDashboard,
      },
    ],
  },
]);
