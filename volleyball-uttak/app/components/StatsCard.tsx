import { memo } from "react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  description?: string;
}

const StatsCard = memo(function StatsCard({
  title,
  value,
  icon,
  color,
  description,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm hover-lift animate-fade-in min-h-[100px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-[10px] md:text-xs">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="text-gray-500 text-[10px] md:text-xs mt-1">
              {description}
            </p>
          )}
        </div>
        <div
          className={`w-8 h-8 md:w-10 md:h-10 ${color} rounded-lg flex items-center justify-center`}>
          <span className="text-lg md:text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
});

export default StatsCard;
