"use client";

import { memo, useCallback, useMemo, useState } from "react";
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
  batchSize = 20,
}: VirtualizedPlayerListProps) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const visiblePlayers = useMemo(() => {
    return players.slice(0, Math.min(visibleCount, players.length));
  }, [players, visibleCount]);

  const hasMore = visibleCount < players.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(prev + batchSize, players.length));
    }
  }, [hasMore, batchSize, players.length]);

  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Ingen spillere tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Rendered players */}
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

      {/* Load more button */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={isSaving}>
            Vis flere spillere ({players.length - visibleCount} igjen)
          </button>
        </div>
      )}
    </div>
  );
});

export default VirtualizedPlayerList;
