import { Suspense } from "react";
import DashboardLoadingScreen from "@/modules/dashboard/components/DashboardLoadingScreen";
import DashboardPageClient from "./DashboardPageClient";

function DashboardFallback() {
  return <DashboardLoadingScreen />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardPageClient />
    </Suspense>
  );
}
