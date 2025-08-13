"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { memo } from "react";

interface TeamSelectionSectionProps {
  positions: readonly string[];
  selection: Record<string, string[]>;
  positionColors: Record<string, string>;
  positionIcons: Record<string, string>;
  onRemovePlayer: (position: string, playerName: string) => void;
  onMovePlayer: (fromPosition: string, playerName: string, toPosition: string) => void;
  onAddToPotential?: (playerName: string) => void;
  isSaving: boolean;
  nameToRegistrationNumber: Record<string, string | undefined>;
  nameToRow: Record<string, number | undefined>;
}

// Drop zone for entire team section
function TeamDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "team-drop-zone",
    data: {
      type: "team-drop",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-lg ${
        isOver ? "bg-white/30 border-2 border-dashed border-white/50" : ""
      }`}
      data-drop-target={isOver}>
      {children}
    </div>
  );
}

// Drop zone for specific position in team
function TeamPositionDropZone({
  targetPosition,
  children,
}: {
  targetPosition: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `team-position-${targetPosition}`,
    data: {
      type: "position",
      position: targetPosition,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-lg min-h-[60px] ${
        isOver ? "bg-white/20 border-2 border-dashed border-white/60" : ""
      }`}
      data-drop-target={isOver}>
      {children}
    </div>
  );
}

// Draggable player in team selection
function DraggableTeamPlayer({
  playerName,
  position,
  registrationNumber,
  rowNumber,
  onRemovePlayer,
  onAddToPotential,
  isSaving,
  index,
}: {
  playerName: string;
  position: string;
  registrationNumber?: string;
  rowNumber?: number;
  onRemovePlayer: (position: string, playerName: string) => void;
  onAddToPotential?: (playerName: string) => void;
  isSaving: boolean;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `team-player-${position}-${playerName}`,
    data: {
      playerName: playerName,
      fromPosition: position,
      type: "team-player",
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/80 border border-white/30 rounded-lg p-3 hover:bg-white/90 transition-colors animate-slide-in ${
        isDragging
          ? "opacity-70 shadow-xl z-50 bg-white border-2 border-blue-300"
          : ""
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag handle */}
          <button
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-manipulation select-none min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-gray-200/50 active:bg-gray-300/50 transition-colors"
            aria-label="Dra for å flytte"
            title="Dra for å flytte"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}>
            <svg
              className="w-4 h-4 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 8a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 12a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </button>
          
          {/* Registration number */}
          {(registrationNumber || rowNumber) && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
              #{registrationNumber || (rowNumber ? rowNumber + 98 : "")}
            </span>
          )}
          
          {/* Player name */}
          <span className="font-medium text-gray-800 truncate text-sm">
            {playerName}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Star button - move to potential */}
          {onAddToPotential && (
            <button
              onClick={() => onAddToPotential(playerName)}
              disabled={isSaving}
              className="text-yellow-500 hover:text-yellow-600 p-2 md:p-1.5 rounded-full transition-colors hover:bg-yellow-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
              title="Flyttet til potensielle spillere"
              type="button">
              <svg
                className="w-4 h-4 md:w-4 md:h-4 pointer-events-none"
                fill="currentColor"
                viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          )}
          
          {/* Remove button */}
          <button
            onClick={() => onRemovePlayer(position, playerName)}
            disabled={isSaving}
            className="text-red-500 hover:text-red-700 p-2 md:p-1.5 rounded-full transition-colors hover:bg-red-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
            title="Fjern fra lag"
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
    </div>
  );
}

const TeamSelectionSection = memo(function TeamSelectionSection({
  positions,
  selection,
  positionColors,
  positionIcons,
  onRemovePlayer,
  onMovePlayer,
  onAddToPotential,
  isSaving,
  nameToRegistrationNumber,
  nameToRow,
}: TeamSelectionSectionProps) {
  return (
    <TeamDropZone>
      <div className="space-y-6">
        {positions.map((pos) => (
          <div key={pos}>
            <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
              <span
                className={`w-6 h-6 ${positionColors[pos]} rounded-full flex items-center justify-center text-white text-xs shadow-sm border border-white/20`}>
                {positionIcons[pos]}
              </span>
              <span>{pos}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {selection[pos].length}
              </span>
            </h3>
            <TeamPositionDropZone targetPosition={pos}>
              {selection[pos].length === 0 ? (
                <p className="text-white/60 italic min-h-[60px] flex items-center">
                  Ingen spillere - dra hit for å legge til
                </p>
              ) : (
                <div className="space-y-2">
                  {selection[pos].map((playerName, index) => (
                    <DraggableTeamPlayer
                      key={`team-${pos}-${playerName}-${
                        nameToRegistrationNumber[playerName] ||
                        nameToRow[playerName] ||
                        `idx-${index}`
                      }`}
                      playerName={playerName}
                      position={pos}
                      registrationNumber={nameToRegistrationNumber[playerName]}
                      rowNumber={nameToRow[playerName]}
                      onRemovePlayer={onRemovePlayer}
                      onAddToPotential={onAddToPotential}
                      isSaving={isSaving}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </TeamPositionDropZone>
          </div>
        ))}
      </div>
    </TeamDropZone>
  );
});

export default TeamSelectionSection;
