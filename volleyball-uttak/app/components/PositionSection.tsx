import { useDraggable, useDroppable } from "@dnd-kit/core";

interface PositionSectionProps {
  position: string;
  players: string[];
  positionColors: Record<string, string>;
  positionIcons: Record<string, string>;
  onRemovePlayer: (position: string, playerName: string) => void;
  onMovePlayer: (
    fromPosition: string,
    playerName: string,
    toPosition: string
  ) => void;
  positions: readonly string[];
  isSaving: boolean;
  nameToRow: Record<string, number | undefined>;
}

export default function PositionSection({
  position,
  players,
  positionColors,
  positionIcons,
  onRemovePlayer,
  onMovePlayer,
  positions,
  isSaving,
  nameToRow,
}: PositionSectionProps) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `position-${position}`,
    data: {
      type: "position",
      position: position,
    },
  });

  return (
    <div
      ref={setDroppableRef}
      className={`border-l-4 pl-4 transition-all duration-200 ${
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
      }`}>
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <span
          className={`w-6 h-6 ${positionColors[position]} rounded-full flex items-center justify-center text-white text-sm`}>
          {positionIcons[position]}
        </span>
        <span className="text-gray-800">{position}</span>
        <span className="text-sm text-gray-600">({players.length})</span>
      </h3>
      {players.length === 0 ? (
        <p className="text-gray-500 italic">Ingen spillere valgt</p>
      ) : (
        <div className="space-y-2">
          {players.map((name, index) => (
            <DraggablePlayer
              key={name}
              name={name}
              position={position}
              rowNumber={nameToRow[name]}
              positionIcons={positionIcons}
              positions={positions}
              onRemovePlayer={onRemovePlayer}
              onMovePlayer={onMovePlayer}
              isSaving={isSaving}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DraggablePlayerProps {
  name: string;
  position: string;
  rowNumber?: number;
  positionIcons: Record<string, string>;
  positions: readonly string[];
  onRemovePlayer: (position: string, playerName: string) => void;
  onMovePlayer: (
    fromPosition: string,
    playerName: string,
    toPosition: string
  ) => void;
  isSaving: boolean;
  index: number;
}

function DraggablePlayer({
  name,
  position,
  rowNumber,
  positionIcons,
  positions,
  onRemovePlayer,
  onMovePlayer,
  isSaving,
  index,
}: DraggablePlayerProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `player-${position}-${name}`,
      data: {
        playerName: name,
        fromPosition: position,
        type: "team-player",
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg animate-slide-in shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 scale-105 shadow-lg" : ""
      }`}
      style={{
        animationDelay: `${index * 0.1}s`,
        ...style,
      }}>
      <div className="flex items-center gap-2">
        {typeof rowNumber === "number" && (
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200"
            title={`Rad ${rowNumber}`}>
            #{rowNumber}
          </span>
        )}
        <span className="font-semibold text-gray-800">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm font-medium text-gray-700 hover:border-blue-400"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value && e.target.value !== position) {
              onMovePlayer(position, name, e.target.value);
            }
          }}
          disabled={isSaving}
          onClick={(e) => e.stopPropagation()}>
          <option value="" disabled>
            Flytt til
          </option>
          {positions.map((pos) => (
            <option key={pos} value={pos} disabled={pos === position}>
              {positionIcons[pos]} {pos}
            </option>
          ))}
        </select>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer(position, name);
          }}
          disabled={isSaving}
          className="text-red-500 hover:text-red-700 p-2 rounded-full transition-colors hover:bg-red-50 hover:scale-110"
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
    </div>
  );
}
