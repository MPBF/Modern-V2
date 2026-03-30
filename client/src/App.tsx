import { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import ErrorBoundary from "./components/ErrorBoundary";

import Login from "./pages/login";
import ProtectedRoute from "./components/ProtectedRoute";
import { useTranslation } from "react-i18next";
import InstallPrompt from "./components/pwa/InstallPrompt";
import { MobileAutoRedirect } from "./hooks/use-mobile-redirect";

const Dashboard = lazy(() => import("./pages/dashboard"));
const Orders = lazy(() => import("./pages/orders"));
const Production = lazy(() => import("./pages/production"));
const ProductionOrdersManagement = lazy(() => import("./pages/ProductionOrdersManagement"));
const ProductionQueues = lazy(() => import("./pages/ProductionQueues"));
const Quality = lazy(() => import("./pages/quality"));
const Warehouse = lazy(() => import("./pages/warehouse"));
const Maintenance = lazy(() => import("./pages/maintenance"));
const HR = lazy(() => import("./pages/hr"));
const Reports = lazy(() => import("./pages/reports"));
const Settings = lazy(() => import("./pages/settings"));
const Definitions = lazy(() => import("./pages/definitions"));
const UserDashboard = lazy(() => import("./pages/user-dashboard"));
const NotFound = lazy(() => import("./pages/not-found"));
const Notifications = lazy(() => import("./pages/notifications"));
const AlertsCenter = lazy(() => import("./pages/AlertsCenter"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const ProductionMonitoring = lazy(() => import("./pages/production-monitoring"));
const MetaWhatsAppSetup = lazy(() => import("./pages/meta-whatsapp-setup"));
const WhatsAppSetup = lazy(() => import("./pages/whatsapp-setup"));
const WhatsAppTest = lazy(() => import("./pages/whatsapp-test"));
const WhatsAppTroubleshoot = lazy(() => import("./pages/whatsapp-troubleshoot"));
const WhatsAppProductionSetup = lazy(() => import("./pages/whatsapp-production-setup"));
const WhatsAppFinalSetup = lazy(() => import("./pages/whatsapp-final-setup"));
const TwilioContentTemplate = lazy(() => import("./pages/twilio-content-template"));
const WhatsAppTemplateTest = lazy(() => import("./pages/whatsapp-template-test"));
const WhatsAppWebhooks = lazy(() => import("./pages/whatsapp-webhooks"));
const ToolsPage = lazy(() => import("./pages/tools_page"));
const FilmOperatorDashboard = lazy(() => import("./pages/FilmOperatorDashboard"));
const PrintingOperatorDashboard = lazy(() => import("./pages/PrintingOperatorDashboard"));
const CuttingOperatorDashboard = lazy(() => import("./pages/CuttingOperatorDashboard"));
const ProductionDashboard = lazy(() => import("./pages/ProductionDashboard"));
const RollSearch = lazy(() => import("./pages/RollSearch"));
const ProductionReports = lazy(() => import("./pages/ProductionReports"));
const SystemMonitoring = lazy(() => import("./pages/system-monitoring"));
const AiAgent = lazy(() => import("./pages/ai-agent"));
const AiAgentSettings = lazy(() => import("./pages/ai-agent-settings"));
const FactorySimulation3D = lazy(() => import("./pages/FactorySimulation3D"));
const CompanySetup = lazy(() => import("./pages/company-setup"));
const DisplayScreen = lazy(() => import("./pages/DisplayScreen"));
const DisplayControlPanel = lazy(() => import("./pages/DisplayControlPanel"));
const FactoryFloor = lazy(() => import("./pages/FactoryFloor"));
const MaterialMixing = lazy(() => import("./pages/material-mixing"));
const WarehouseMobile = lazy(() => import("./pages/warehouse-mobile"));
const ProductionMobile = lazy(() => import("./pages/production-mobile"));
const UserDashboardMobile = lazy(() => import("./pages/user-dashboard-mobile"));
const OrdersMobile = lazy(() => import("./pages/orders-mobile"));
const ProductionDashboardMobile = lazy(() => import("./pages/production-dashboard-mobile"));

function PageLoadingFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>جاري تحميل الصفحة...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Switch>
        <Route path="/login">
          {isAuthenticated ? <Redirect to="/" /> : <Login />}
        </Route>

        <Route path="/setup">
          <CompanySetup />
        </Route>
<Route path="/tools">
  <ProtectedRoute path="/tools">
    <ToolsPage />
  </ProtectedRoute>
</Route>
     
        <Route path="/">
          <ProtectedRoute path="/">
            <Dashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/orders">
          <ProtectedRoute path="/orders">
            <MobileAutoRedirect path="/orders" />
            <Orders />
          </ProtectedRoute>
        </Route>

        <Route path="/production">
          <ProtectedRoute path="/production">
            <MobileAutoRedirect path="/production" />
            <Production />
          </ProtectedRoute>
        </Route>

        {/* Redirects from old routes to Orders page with tabs */}
        <Route path="/production-orders-management">
          <Redirect to="/orders?tab=production-orders" />
        </Route>

        <Route path="/production-queues">
          <Redirect to="/orders?tab=production-queues" />
        </Route>

        <Route path="/roll-search">
          <Redirect to="/orders?tab=roll-search" />
        </Route>

        {/* Production Dashboard - Unified operators dashboard */}
        <Route path="/production-dashboard">
          <ProtectedRoute path="/production-dashboard">
            <MobileAutoRedirect path="/production-dashboard" />
            <ProductionDashboard />
          </ProtectedRoute>
        </Route>

        {/* Redirect old operator routes to new unified dashboard */}
        <Route path="/film-operator">
          <Redirect to="/production-dashboard" />
        </Route>

        <Route path="/printing-operator">
          <Redirect to="/production-dashboard" />
        </Route>

        <Route path="/cutting-operator">
          <Redirect to="/production-dashboard" />
        </Route>

        <Route path="/quality">
          <ProtectedRoute path="/quality">
            <Quality />
          </ProtectedRoute>
        </Route>

        <Route path="/warehouse">
          <ProtectedRoute path="/warehouse">
            <MobileAutoRedirect path="/warehouse" />
            <Warehouse />
          </ProtectedRoute>
        </Route>

        <Route path="/maintenance">
          <ProtectedRoute path="/maintenance">
            <Maintenance />
          </ProtectedRoute>
        </Route>

        <Route path="/hr">
          <ProtectedRoute path="/hr">
            <HR />
          </ProtectedRoute>
        </Route>

        <Route path="/reports">
          <ProtectedRoute path="/reports">
            <Reports />
          </ProtectedRoute>
        </Route>

        <Route path="/production-reports">
          <Redirect to="/orders?tab=production-reports" />
        </Route>

        <Route path="/settings">
          <ProtectedRoute path="/settings">
            <Settings />
          </ProtectedRoute>
        </Route>

        <Route path="/definitions">
          <ProtectedRoute path="/definitions">
            <Definitions />
          </ProtectedRoute>
        </Route>

        <Route path="/user-dashboard">
          <ProtectedRoute path="/user-dashboard">
            <MobileAutoRedirect path="/user-dashboard" />
            <UserDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/notifications">
          <ProtectedRoute path="/notifications">
            <Notifications />
          </ProtectedRoute>
        </Route>

        <Route path="/alerts">
          <ProtectedRoute path="/alerts">
            <AlertsCenter />
          </ProtectedRoute>
        </Route>

        <Route path="/system-health">
          <ProtectedRoute path="/system-health">
            <SystemHealth />
          </ProtectedRoute>
        </Route>

        <Route path="/production-monitoring">
          <ProtectedRoute path="/production-monitoring">
            <ProductionMonitoring />
          </ProtectedRoute>
        </Route>

        <Route path="/meta-whatsapp-setup">
          <ProtectedRoute path="/meta-whatsapp-setup">
            <MetaWhatsAppSetup />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-setup">
          <ProtectedRoute path="/whatsapp-setup">
            <WhatsAppSetup />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-test">
          <ProtectedRoute path="/whatsapp-test">
            <WhatsAppTest />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-troubleshoot">
          <ProtectedRoute path="/whatsapp-troubleshoot">
            <WhatsAppTroubleshoot />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-production-setup">
          <ProtectedRoute path="/whatsapp-production-setup">
            <WhatsAppProductionSetup />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-final-setup">
          <ProtectedRoute path="/whatsapp-final-setup">
            <WhatsAppFinalSetup />
          </ProtectedRoute>
        </Route>

        <Route path="/twilio-content">
          <ProtectedRoute path="/twilio-content">
            <TwilioContentTemplate />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-template-test">
          <ProtectedRoute path="/whatsapp-template-test">
            <WhatsAppTemplateTest />
          </ProtectedRoute>
        </Route>

        <Route path="/whatsapp-webhooks">
          <ProtectedRoute path="/whatsapp-webhooks">
            <WhatsAppWebhooks />
          </ProtectedRoute>
        </Route>

        <Route path="/system-monitoring">
          <ProtectedRoute path="/system-monitoring">
            <SystemMonitoring />
          </ProtectedRoute>
        </Route>

        <Route path="/ai-agent">
          <ProtectedRoute path="/ai-agent">
            <AiAgent />
          </ProtectedRoute>
        </Route>

        <Route path="/ai-agent-settings">
          <ProtectedRoute path="/ai-agent-settings">
            <AiAgentSettings />
          </ProtectedRoute>
        </Route>

        <Route path="/factory-simulation">
          <ProtectedRoute path="/factory-simulation">
            <FactorySimulation3D />
          </ProtectedRoute>
        </Route>

        <Route path="/display-screen">
          <DisplayScreen />
        </Route>

        <Route path="/display-control">
          <ProtectedRoute path="/display-control">
            <DisplayControlPanel />
          </ProtectedRoute>
        </Route>

        <Route path="/factory-floor">
          <ProtectedRoute path="/factory-floor">
            <FactoryFloor />
          </ProtectedRoute>
        </Route>

        <Route path="/material-mixing">
          <ProtectedRoute path="/material-mixing">
            <MaterialMixing />
          </ProtectedRoute>
        </Route>

        <Route path="/warehouse-mobile">
          <ProtectedRoute path="/warehouse-mobile">
            <WarehouseMobile />
          </ProtectedRoute>
        </Route>

        <Route path="/production-mobile">
          <ProtectedRoute path="/production-mobile">
            <ProductionMobile />
          </ProtectedRoute>
        </Route>

        <Route path="/user-dashboard-mobile">
          <ProtectedRoute path="/user-dashboard-mobile">
            <UserDashboardMobile />
          </ProtectedRoute>
        </Route>

        <Route path="/orders-mobile">
          <ProtectedRoute path="/orders-mobile">
            <OrdersMobile />
          </ProtectedRoute>
        </Route>

        <Route path="/production-dashboard-mobile">
          <ProtectedRoute path="/production-dashboard-mobile">
            <ProductionDashboardMobile />
          </ProtectedRoute>
        </Route>

        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary fallback="page" showReload>
      <AuthProvider>
        <AppRoutes />
        <InstallPrompt />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
