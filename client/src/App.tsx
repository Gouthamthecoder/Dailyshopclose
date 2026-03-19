import { Router, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DailyClosingPage from "@/pages/daily-closing";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import { appBasePath } from "@/lib/base-path";

function AuthenticatedRouter() {
  const { isAdmin } = useAuth();

  return (
    <Switch>
      {isAdmin && <Route path="/" component={Dashboard} />}
      <Route path="/closing" component={DailyClosingPage} />
      {isAdmin && <Route path="/settings" component={SettingsPage} />}
      <Route path="/">{isAdmin ? <Dashboard /> : <DailyClosingPage />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b shrink-0 sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground" data-testid="text-user-info">
                {user?.username} ({user?.role})
              </span>
              <ThemeToggle />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => logout.mutate()}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <Skeleton className="h-14 w-14 rounded-md mx-auto" />
          <Skeleton className="h-5 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router base={appBasePath}>
            <AppContent />
            <Toaster />
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
