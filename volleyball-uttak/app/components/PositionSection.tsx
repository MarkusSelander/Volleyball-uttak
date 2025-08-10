interface PositionSectionProps {
  position: string;
  players: string[];
  positionColors: Record<string, string>;
  positionIcons: Record<string, string>;
  onRemovePlayer: (position: string, playerName: string) => void;
  isSaving: boolean;
}

export default function PositionSection({
  position,
  players,
  positionColors,
  positionIcons,
  onRemovePlayer,
  isSaving,
}: PositionSectionProps) {
  return (
    <div className="border-l-4 border-gray-200 pl-4">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <span
          className={`w-6 h-6 ${positionColors[position]} rounded-full flex items-center justify-center text-white text-sm`}>
          {positionIcons[position]}
        </span>
        {position}
        <span className="text-sm text-gray-500">({players.length})</span>
      </h3>
      {players.length === 0 ? (
        <p className="text-gray-500 italic">Ingen spillere valgt</p>
      ) : (
        <div className="space-y-2">
          {players.map((name, index) => (
            <div
              key={name}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}>
              <span className="font-medium">{name}</span>
              <button
                onClick={() => onRemovePlayer(position, name)}
                disabled={isSaving}
                className="text-red-500 hover:text-red-700 p-1 rounded transition-colors hover:bg-red-50"
                title="Fjern spiller">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
