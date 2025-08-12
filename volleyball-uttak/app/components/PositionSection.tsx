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
  onAddToPotential?: (playerName: string) => void;
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
  onAddToPotential,
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
      className={`border-l-4 pl-4 py-2 transition-all duration-200 min-h-[80px] ${
        isOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200"
      }`}
      data-drop-target={isOver}>
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
        <div
          className={`text-white/70 italic p-4 rounded-lg border-2 border-dashed transition-all ${
            isOver ? "border-blue-300 bg-blue-100/50" : "border-white/30"
          }`}>
          {isOver ? "Slipp spilleren her" : "Ingen spillere valgt"}
        </div>
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
              onAddToPotential={onAddToPotential}
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
  onAddToPotential?: (playerName: string) => void;
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
  onAddToPotential,
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
      className={`flex items-center justify-between p-3 md:p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg animate-slide-in shadow-sm hover:shadow-md transition-all duration-200 touch-none ${
        isDragging
          ? "opacity-70 shadow-xl z-50 bg-white border-2 border-blue-300"
          : ""
      }`}
      style={{
        animationDelay: `${index * 0.1}s`,
        ...style,
      }}>
      <div className="flex items-center gap-2 min-w-0">
        {/* Drag handle - Larger touch target */}
        <button
          type="button"
          className="p-2 md:p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-manipulation select-none min-w-[44px] min-h-[44px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
          aria-label="Dra for å flytte"
          title="Dra for å flytte"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}>
          <svg
            className="w-5 h-5 md:w-4 md:h-4 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 8a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 12a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        </button>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200"
          title={
            registrationNumber
              ? `Registreringsnummer ${registrationNumber}`
              : `Rad ${rowNumber ? rowNumber + 98 : "ukjent"}`
          }>
          #{registrationNumber || (rowNumber ? rowNumber + 98 : "?")}
        </span>
        <span
          className="font-semibold text-gray-800 truncate text-xs md:text-sm"
          title={name}>
          {name}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Add to potential button (star) - only show if onAddToPotential is provided */}
        {onAddToPotential && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToPotential(name);
            }}
            disabled={isSaving}
            className="text-yellow-500 hover:text-yellow-600 p-2 md:p-1.5 rounded-full transition-colors hover:bg-yellow-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
            title="Legg til som potensiell spiller"
            type="button">
            <svg
              className="w-4 h-4 md:w-4 md:h-4 pointer-events-none"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer(position, name);
          }}
          disabled={isSaving}
          className="text-red-500 hover:text-red-700 p-2 md:p-1.5 rounded-full transition-colors hover:bg-red-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
          title="Fjern spiller"
          type="button">
          <svg
            className="w-4 h-4 md:w-4 md:h-4 pointer-events-none"
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
