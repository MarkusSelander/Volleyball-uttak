import { useDraggable } from "@dnd-kit/core";
import React from "react";

interface PlayerCardProps {
  player: { name: string; registrationNumber?: string; rowNumber?: number };
  positions: readonly string[];
  positionIcons: Record<string, string>;
  onSelectPosition: (position: string, player: { name: string }) => void;
  onAddPotential: (player: { name: string }) => void;
  isSaving: boolean;
  index: number;
  id: string;
}

function PlayerCard({
  player,
  positions,
  positionIcons,
  onSelectPosition,
  onAddPotential,
  isSaving,
  index,
  id,
}: PlayerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id,
      data: {
        player: player,
        type: "available-player",
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
      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover-lift animate-slide-in ${
        isDragging ? "opacity-50 scale-105 shadow-lg" : ""
      }`}
      style={{
        animationDelay: `${index * 0.1}s`,
        ...style,
      }}>
      {/* Drag handle */}
      <button
        type="button"
        className="p-1 md:p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        aria-label="Dra for å flytte"
        title="Dra for å flytte"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}>
        <svg
          className="w-3.5 h-3.5 md:w-4 md:h-4"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 8a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 12a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </button>

      {/* Star + row number stacked to save width */}
      <div className="flex flex-col items-center gap-1 mr-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddPotential(player);
          }}
          disabled={isSaving}
          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors"
          title="Legg til i potensielle"
          aria-label="Legg til i potensielle">
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
        <span
          className="text-[10px] md:text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200"
          title={
            player.registrationNumber
              ? `Registreringsnummer ${player.registrationNumber}`
              : `Rad ${player.rowNumber ? player.rowNumber + 98 : "ukjent"}`
          }>
          #
          {player.registrationNumber ||
            (player.rowNumber ? player.rowNumber + 98 : "?")}
        </span>
      </div>

      <span
        className="flex-1 min-w-0 truncate font-medium text-gray-800 text-xs md:text-sm"
        title={player.name}>
        {player.name}
      </span>

      <select
        className="border border-gray-300 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-[10px] md:text-xs font-medium text-gray-700 hover:border-blue-400 w-[80px] md:w-[100px]"
        defaultValue=""
        onChange={(e) => onSelectPosition(e.target.value, player)}
        disabled={isSaving}
        onClick={(e) => e.stopPropagation()}>
        <option value="" disabled>
          Velg
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

export default React.memo(PlayerCard);
