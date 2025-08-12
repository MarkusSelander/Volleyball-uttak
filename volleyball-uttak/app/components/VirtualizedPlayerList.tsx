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
  batchSize = 30, // Increased batch size for better initial LCP
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
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Ingen spillere tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Rendered players */}
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

      {/* Load more button */}
      {hasMore && (
        <div className="text-center py-3">
          <button
            onClick={loadMore}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={isSaving}>
            Vis flere ({players.length - visibleCount} igjen)
          </button>
        </div>
      )}
    </div>
  );
});

export default VirtualizedPlayerList;
