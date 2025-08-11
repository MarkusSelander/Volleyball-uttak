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
  nameToRegistrationNumber: Record<string, string | undefined>;
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
  nameToRegistrationNumber,
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
      <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
        <span
          className={`w-5 h-5 ${positionColors[position]} rounded-full flex items-center justify-center text-white text-xs shadow-sm border border-white/20`}>
          {positionIcons[position]}
        </span>
        <span className="text-white text-sm font-semibold drop-shadow-sm">
          {position}
        </span>
        <span className="text-xs text-white/80 font-medium">
          ({players.length})
        </span>
      </h3>
      {players.length === 0 ? (
        <p className="text-white/70 italic">Ingen spillere valgt</p>
      ) : (
        <div className="space-y-2">
          {players.map((name, index) => (
            <DraggablePlayer
              key={name}
              name={name}
              position={position}
              registrationNumber={nameToRegistrationNumber[name]}
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
  registrationNumber?: string;
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
  registrationNumber,
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
      className={`flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg animate-slide-in shadow-sm hover:shadow-md transition-all duration-200 ${
        isDragging ? "opacity-50 scale-105 shadow-lg" : ""
      }`}
      style={{
        animationDelay: `${index * 0.1}s`,
        ...style,
      }}>
      <div className="flex items-center gap-2 min-w-0">
        {/* Drag handle */}
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          aria-label="Dra for å flytte"
          title="Dra for å flytte"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 8a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 12a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        </button>
        {(registrationNumber || rowNumber) && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200"
            title={
              registrationNumber
                ? `Registreringsnummer ${registrationNumber}`
                : `Rad ${rowNumber}`
            }>
            #{registrationNumber || (rowNumber ? rowNumber + 98 : '')}
          </span>
        )}
        <span
          className="font-semibold text-gray-800 truncate text-xs md:text-sm"
          title={name}>
          {name}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer(position, name);
          }}
          disabled={isSaving}
          className="text-red-500 hover:text-red-700 p-1.5 md:p-2 rounded-full transition-colors hover:bg-red-50 hover:scale-110"
          title="Fjern spiller"
          type="button">
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4"
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
