import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";
import Workspace from "./pages/Workspace";
import AdminPanel from "./pages/AdminPanel";
import Storefront from "./pages/Storefront";
import TrackOrder from "./pages/TrackOrder";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/store/:slug"} component={Storefront} />
      <Route path={"/track-order"} component={TrackOrder} />
      <Route path={"/dashboard"}>{() => <DashboardLayout><Workspace view="dashboard" /></DashboardLayout>}</Route>
      <Route path={"/sales"}>{() => <DashboardLayout><Workspace view="sales" /></DashboardLayout>}</Route>
      <Route path={"/orders"}>{() => <DashboardLayout><Workspace view="orders" /></DashboardLayout>}</Route>
      <Route path={"/products"}>{() => <DashboardLayout><Workspace view="products" /></DashboardLayout>}</Route>
      <Route path={"/customers"}>{() => <DashboardLayout><Workspace view="customers" /></DashboardLayout>}</Route>
      <Route path={"/expenses"}>{() => <DashboardLayout><Workspace view="expenses" /></DashboardLayout>}</Route>
      <Route path={"/reports"}>{() => <DashboardLayout><Workspace view="reports" /></DashboardLayout>}</Route>
      <Route path={"/billing"}>{() => <DashboardLayout><Workspace view="billing" /></DashboardLayout>}</Route>
      <Route path={"/settings"}>{() => <DashboardLayout><Workspace view="settings" /></DashboardLayout>}</Route>
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
