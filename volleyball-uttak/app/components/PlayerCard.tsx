interface PlayerCardProps {
  player: { name: string };
  positions: readonly string[];
  positionIcons: Record<string, string>;
  onSelectPosition: (position: string, player: { name: string }) => void;
  isSaving: boolean;
  index: number;
}

export default function PlayerCard({
  player,
  positions,
  positionIcons,
  onSelectPosition,
  isSaving,
  index,
}: PlayerCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover-lift animate-slide-in"
      style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
        {player.name.charAt(0)}
      </div>
      <span className="flex-1 font-medium">{player.name}</span>
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        defaultValue=""
        onChange={(e) => onSelectPosition(e.target.value, player)}
        disabled={isSaving}>
        <option value="" disabled>
          Velg posisjon
        </option>
        {positions.map((pos) => (
          <option key={pos} value={pos}>
            {positionIcons[pos]} {pos}
          </option>
        ))}
      </select>
    </div>
  );
}
