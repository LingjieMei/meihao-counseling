import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import CaseList from "./pages/CaseList";
import CaseDetail from "./pages/CaseDetail";
import CaseCreate from "./pages/CaseCreate";
import SessionCreate from "./pages/SessionCreate";
import SessionDetail from "./pages/SessionDetail";
import PersonalityProfiles from "./pages/PersonalityProfiles";
import GrowthCenter from "./pages/GrowthCenter";
import ParentReport from "./pages/ParentReport";
import AdminManage from "./pages/AdminManage";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/cases"}>
        <DashboardLayout>
          <CaseList />
        </DashboardLayout>
      </Route>
      <Route path={"/cases/new"}>
        <DashboardLayout>
          <CaseCreate />
        </DashboardLayout>
      </Route>
      <Route path={"/cases/:id"}>
        {(params) => (
          <DashboardLayout>
            <CaseDetail id={Number(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/cases/:caseId/sessions/new"}>
        {(params) => (
          <DashboardLayout>
            <SessionCreate caseId={Number(params.caseId)} />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/sessions/:id"}>
        {(params) => (
          <DashboardLayout>
            <SessionDetail id={Number(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/personality-profiles"}>
        <DashboardLayout>
          <PersonalityProfiles />
        </DashboardLayout>
      </Route>
      <Route path={"/growth"}>
        <DashboardLayout>
          <GrowthCenter />
        </DashboardLayout>
      </Route>
      <Route path={"/admin"}>
        <DashboardLayout>
          <AdminManage />
        </DashboardLayout>
      </Route>
      <Route path={"/cases/:caseId/report"}>
        {(params) => (
          <DashboardLayout>
            <ParentReport caseId={Number(params.caseId)} />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
