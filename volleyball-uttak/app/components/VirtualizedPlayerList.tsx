"use client";

import { memo, useMemo } from "react";
import PlayerCard from "./PlayerCard";

interface Player {
  name: string;
  registrationNumber?: string;
  rowNumber?: number;
}

interface VirtualizedPlayerListProps {
  players: Player[];
  positions: readonly string[];
  positionIcons: Record<string, string>;
  onSelectPosition: (position: string, player: Player) => void;
  onAddPotential: (player: Player) => void;
  isSaving: boolean;
  itemHeight?: number;
  batchSize?: number;
}

const VirtualizedPlayerList = memo(function VirtualizedPlayerList({
  players,
  positions,
  positionIcons,
  onSelectPosition,
  onAddPotential,
  isSaving,
  itemHeight = 85,
  batchSize = 30, // Keep for potential future use
}: VirtualizedPlayerListProps) {
  // Show all players at once, no pagination
  const visiblePlayers = useMemo(() => {
    return players;
  }, [players]);

  if (players.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Ingen spillere tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* All players rendered at once */}
      <div className="grid gap-3">
        {visiblePlayers.map((player, index) => (
          <PlayerCard
            key={`${player.name}-${
              player.registrationNumber || player.rowNumber || index
            }`}
            player={player}
            positions={positions}
            positionIcons={positionIcons}
            onSelectPosition={onSelectPosition}
            onAddPotential={onAddPotential}
            isSaving={isSaving}
            index={index}
            id={`available-${player.name}-${
              player.registrationNumber || player.rowNumber || index
            }`}
          />
        ))}
      </div>
    </div>
  );
});

export default VirtualizedPlayerList;
