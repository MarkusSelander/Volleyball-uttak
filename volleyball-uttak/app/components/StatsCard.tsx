interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  description?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  color,
  description,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm hover-lift animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-xs md:text-sm">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">
            {value}
          </p>
          {description && (
            <p className="text-gray-500 text-[11px] md:text-xs mt-1">
              {description}
            </p>
          )}
        </div>
        <div
          className={`w-10 h-10 md:w-12 md:h-12 ${color} rounded-lg flex items-center justify-center`}>
          <span className="text-xl md:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
