import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PanelLayout } from "@/components/panel/PanelLayout";
import { AdminLayout } from "@/components/panel/AdminLayout";

import { Login, Register, Forgot, Reset, AcceptInvite } from "@/pages/auth/AuthPages";
import Dashboard from "@/pages/panel/Dashboard";
import Products from "@/pages/panel/Products";
import Categories from "@/pages/panel/Categories";
import StoreProfile from "@/pages/panel/StoreProfile";
import Appearance from "@/pages/panel/Appearance";
import Delivery from "@/pages/panel/Delivery";
import Payments from "@/pages/panel/Payments";
import Share from "@/pages/panel/Share";
import Users from "@/pages/panel/Users";
import Analytics from "@/pages/panel/Analytics";
import { Promotions, Subscription, Settings } from "@/pages/panel/Simple";
import PublicCatalog from "@/pages/public/PublicCatalog";
import { AdminOverview, AdminStores, AdminUsers, AdminPlans, AdminSubscriptions, AdminMetrics } from "@/pages/admin/AdminPages";

function RootRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "platform_admin" ? "/admin" : "/dashboard"} replace />;
}

const STORE_ROLES = ["owner", "admin", "editor"];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password" element={<Reset />} />
          <Route path="/aceitar-convite" element={<AcceptInvite />} />
          <Route path="/loja/:slug" element={<PublicCatalog />} />

          <Route element={<ProtectedRoute roles={STORE_ROLES}><PanelLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/store-profile" element={<StoreProfile />} />
            <Route path="/appearance" element={<Appearance />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/share" element={<Share />} />
            <Route path="/users" element={<Users />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route element={<ProtectedRoute roles={["platform_admin"]}><AdminLayout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/stores" element={<AdminStores />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/metrics" element={<AdminMetrics />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
