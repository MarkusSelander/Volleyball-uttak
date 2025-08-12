// Server component that uses ISR for data fetching
import { Suspense } from "react";
import { StatsCardSkeleton } from "../components/SkeletonLoaders";
import DashboardServer from "./DashboardServer";

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-2 md:px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-4 md:mb-6">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Laster dashboard...</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardServer />
    </Suspense>
  );
}
