import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StartScreen } from "@/pages/StartScreen";
import { Terminal } from "@/pages/Terminal";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AvailabilityProvider } from "@/availability/AvailabilityContext";

// Sekundär-Routes lazy laden (kleineres Haupt-Bundle, schnellerer Start).
const OrderSuccess = lazy(() => import("@/pages/OrderSuccess").then((m) => ({ default: m.OrderSuccess })));
const OrderCancel = lazy(() => import("@/pages/OrderCancel").then((m) => ({ default: m.OrderCancel })));
const OrderQR = lazy(() => import("@/pages/OrderQR").then((m) => ({ default: m.OrderQR })));

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path="/success" component={OrderSuccess} />
        <Route path="/cancel" component={OrderCancel} />
        <Route path="/order" component={Terminal} />
        <Route path="/nr/:orderNo" component={OrderQR} />
        <Route path="/" component={StartScreen} />
        <Route path="*" component={StartScreen} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AvailabilityProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </WouterRouter>
          </AvailabilityProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
