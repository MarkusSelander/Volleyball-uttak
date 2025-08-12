"use client";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function PlayerCardSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-200 rounded-lg p-3 space-y-2 min-h-[80px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
            <div className="w-8 h-4 bg-gray-300 rounded"></div>
            <div className="w-24 h-4 bg-gray-300 rounded"></div>
          </div>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white rounded-xl shadow-sm p-6 min-h-[100px]">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-20 h-4 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function PositionSectionSkeleton({
  className = "",
  count = 3,
}: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="border-l-4 border-gray-200 pl-4 py-2 min-h-[120px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
          <div className="w-16 h-4 bg-gray-300 rounded"></div>
          <div className="w-6 h-3 bg-gray-300 rounded"></div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
