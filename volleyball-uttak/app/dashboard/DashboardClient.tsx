"use client";

import { DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// Import components
import DragDropWrapper from "../components/DragDropWrapper";
import NavHeader from "../components/NavHeader";
import Notification from "../components/Notification";
import PositionSection from "../components/PositionSection";
import { StatsCardSkeleton } from "../components/SkeletonLoaders";
import StatsCard from "../components/StatsCard";
import VirtualizedPlayerList from "../components/VirtualizedPlayerList";

// Prevent double initialization in dev mode (React Strict Mode)
declare global {
  interface Window {
    __volleyInit?: boolean;
  }
}

const POSITIONS = ["Midt", "Dia", "Legger", "Libero", "Kant"] as const;

type Position = (typeof POSITIONS)[number];

interface Player {
  name: string;
  email?: string;
  phone?: number;
  gender?: string;
  birthDate?: string;
  year?: string;
  previousPositions?: string;
  desiredPositions?: string;
  desiredLevel?: string;
  experience?: string;
  previousTeam?: string;
  isStudent?: string;
  level?: string;
  attendance?: string;
  availability?: string;
  registrationNumber?: string;
  rowNumber?: number;
}

type Selection = Record<Position, string[]>;

const emptySelection: Selection = {
  Midt: [],
  Dia: [],
  Legger: [],
  Libero: [],
  Kant: [],
};

const positionColors = {
  Midt: "bg-blue-500",
  Dia: "bg-green-500",
  Legger: "bg-purple-500",
  Libero: "bg-yellow-500",
  Kant: "bg-red-500",
};

const positionIcons = {
  Midt: "🏐",
  Dia: "⚡",
  Legger: "🎯",
  Libero: "🛡️",
  Kant: "🔥",
};

// Mapping fra NTNUI posisjoner til våre posisjoner
const positionMapping: Record<string, Position[]> = {
  Midt: ["Midt"],
  Middle: ["Midt"],
  Dia: ["Dia"],
  Diagnoal: ["Dia"],
  "Opposite hitter": ["Dia"],
  Legger: ["Legger"],
  Setter: ["Legger"],
  Libero: ["Libero"],
  Kant: ["Kant"],
  "Outside hitter": ["Kant"],
};

interface DashboardClientProps {
  initialData: {
    players: Player[];
    totalRegistrations: number;
    source: string;
    fetchedAt: string;
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [players] = useState<Player[]>(initialData.players);
  const [totalRegistrations] = useState<number>(initialData.totalRegistrations);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [potentialPlayers, setPotentialPlayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [filters, setFilters] = useState({
    gender: "all",
    isStudent: "all",
    previousTeam: "all",
    desiredLevel: "all",
    desiredPosition: "all",
    ageGroup: "all",
  });

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
    isVisible: boolean;
  }>({ message: "", type: "info", isVisible: false });

  const router = useRouter();

  // Debounce search term for better performance with startTransition
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearchTerm(searchTerm);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load saved state from localStorage with dev-mode guard
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__volleyInit) return;
    window.__volleyInit = true;

    try {
      const savedSelection = localStorage.getItem("volleyball-selection");
      const savedPotential = localStorage.getItem("volleyball-potential");

      if (savedSelection) {
        setSelection(JSON.parse(savedSelection));
      }

      if (savedPotential) {
        setPotentialPlayers(JSON.parse(savedPotential));
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
  }, []);

  // Save to localStorage whenever selection or potential players change
  const saveToLocalStorage = useCallback(
    (newSelection: Selection, newPotential: string[]) => {
      try {
        localStorage.setItem(
          "volleyball-selection",
          JSON.stringify(newSelection)
        );
        localStorage.setItem(
          "volleyball-potential",
          JSON.stringify(newPotential)
        );
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    },
    []
  );

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning") => {
      // Use startTransition for non-urgent notification updates
      startTransition(() => {
        setNotification({ message, type, isVisible: true });
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        startTransition(() => {
          setNotification((prev) => ({ ...prev, isVisible: false }));
        });
      }, 3000);
    },
    []
  );

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/revalidate-dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        showNotification(
          "Dashboard oppdatert! Siden laster inn nye data...",
          "success"
        );
        // Refresh the page to get new data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error("Refresh failed");
      }
    } catch (error) {
      console.error("Manual refresh error:", error);
      showNotification("Kunne ikke oppdatere dashboard", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Hjelpefunksjon for å mappe NTNUI posisjoner til våre posisjoner
  const mapPositions = (desiredPositions: string): Position[] => {
    if (!desiredPositions) return [];

    const positions: Position[] = [];
    const lowerPositions = desiredPositions.toLowerCase();

    Object.entries(positionMapping).forEach(([ntnuiPos, ourPositions]) => {
      if (lowerPositions.includes(ntnuiPos.toLowerCase())) {
        ourPositions.forEach((pos) => {
          if (!positions.includes(pos)) {
            positions.push(pos);
          }
        });
      }
    });

    return positions;
  };

  // Type guard for Position
  const isPosition = (x: string): x is Position => {
    return (POSITIONS as readonly string[]).includes(x as Position);
  };

  // Filterfunksjon som också tar hensyn til søketerm - memoized
  const getFilteredPlayers = useCallback(
    (playerList: Player[]) => {
      return playerList.filter((player) => {
        // Søketerm filter (debounced for better performance)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          const nameMatch = player.name.toLowerCase().includes(searchLower);
          const rowMatch =
            player.registrationNumber
              ?.toString()
              .includes(debouncedSearchTerm) || false;
          if (!nameMatch && !rowMatch) return false;
        }

        // Gender filter
        if (filters.gender !== "all") {
          const genderLower = player.gender?.toLowerCase().trim() || "";
          if (filters.gender === "male" && genderLower !== "mann / male")
            return false;
          if (filters.gender === "female" && genderLower !== "kvinne / female")
            return false;
        }

        // Student filter
        if (filters.isStudent !== "all") {
          const studentLower = player.isStudent?.toLowerCase() || "";
          if (
            filters.isStudent === "yes" &&
            !studentLower.includes("ja") &&
            !studentLower.includes("yes") &&
            !studentLower.includes("y")
          )
            return false;
          if (
            filters.isStudent === "no" &&
            !studentLower.includes("nei") &&
            !studentLower.includes("no") &&
            !studentLower.includes("n")
          )
            return false;
        }

        // Previous team filter
        if (filters.previousTeam !== "all") {
          const teamLower = player.previousTeam?.toLowerCase() || "";
          const playedBefore =
            teamLower.includes("ntnui") ||
            teamLower.includes("ja") ||
            teamLower.includes("yes") ||
            teamLower.includes("y") ||
            (teamLower.length > 0 &&
              !teamLower.includes("nei") &&
              !teamLower.includes("no") &&
              !teamLower.includes("n"));
          if (filters.previousTeam === "yes" && !playedBefore) return false;
          if (filters.previousTeam === "no" && playedBefore) return false;
        }

        // Desired level/division filter
        if (filters.desiredLevel !== "all") {
          const levelLower = player.desiredLevel?.toLowerCase() || "";
          const levelNumber = player.desiredLevel?.toString() || "";
          if (
            filters.desiredLevel === "1" &&
            !levelLower.includes("1") &&
            !levelLower.includes("første") &&
            !levelLower.includes("first") &&
            !levelNumber.includes("1")
          )
            return false;
          if (
            filters.desiredLevel === "2" &&
            !levelLower.includes("2") &&
            !levelLower.includes("andre") &&
            !levelLower.includes("second") &&
            !levelNumber.includes("2")
          )
            return false;
          if (
            filters.desiredLevel === "3" &&
            !levelLower.includes("3") &&
            !levelLower.includes("tredje") &&
            !levelLower.includes("third") &&
            !levelNumber.includes("3")
          )
            return false;
          if (
            filters.desiredLevel === "4" &&
            !levelLower.includes("4") &&
            !levelLower.includes("fjerde") &&
            !levelLower.includes("fourth") &&
            !levelNumber.includes("4")
          )
            return false;
        }

        // Desired position filter
        if (filters.desiredPosition !== "all") {
          const positionsLower = player.desiredPositions?.toLowerCase() || "";
          const positionLower = filters.desiredPosition.toLowerCase();

          if (!positionsLower.includes(positionLower)) return false;
        }

        // Age group filter
        if (filters.ageGroup !== "all" && player.year) {
          const currentYear = new Date().getFullYear();
          const age = currentYear - parseInt(player.year.toString());

          if (filters.ageGroup === "under20" && age >= 20) return false;
          if (filters.ageGroup === "20-25" && (age < 20 || age > 25))
            return false;
          if (filters.ageGroup === "over25" && age <= 25) return false;
        }

        return true;
      });
    },
    [debouncedSearchTerm, filters]
  );

  // Map for quick lookup of registration numbers by player name
  const nameToRegistrationNumber = useMemo(() => {
    const m: Record<string, string | undefined> = {};
    for (const p of players) {
      if (p.registrationNumber) {
        m[p.name] = p.registrationNumber;
      }
    }
    return m;
  }, [players]);

  // Map for quick lookup of row numbers by player name (fallback)
  const nameToRow = useMemo(() => {
    const m: Record<string, number | undefined> = {};
    for (const p of players) {
      if (p.rowNumber) {
        m[p.name] = p.rowNumber;
      }
    }
    return m;
  }, [players]);

  const updateSelection = useCallback(
    async (pos: Position, player: Player) => {
      const newSel: Selection = { ...selection };

      // Fjern spilleren fra alle posisjoner først
      for (const p of POSITIONS) {
        newSel[p] = newSel[p].filter((n) => n !== player.name);
      }

      // Fjern spilleren fra potensielle spillere hvis de er der
      const newPotentialPlayers = potentialPlayers.filter(
        (name) => name !== player.name
      );

      // Batch all state updates to prevent multiple rerenders
      setPotentialPlayers(newPotentialPlayers);

      // Legg til spilleren i den valgte posisjonen
      newSel[pos] = [...newSel[pos], player.name];
      setSelection(newSel);

      // Save to localStorage
      saveToLocalStorage(newSel, newPotentialPlayers);

      showNotification(`${player.name} lagt til som ${pos}`, "success");
    },
    [selection, potentialPlayers, saveToLocalStorage, showNotification]
  );

  const removePlayer = useCallback(
    async (pos: Position, playerName: string) => {
      const newSel: Selection = { ...selection };
      newSel[pos] = newSel[pos].filter((name) => name !== playerName);

      // Batch state updates
      setSelection(newSel);
      saveToLocalStorage(newSel, potentialPlayers);

      showNotification(`${playerName} fjernet fra ${pos}`, "info");
    },
    [selection, potentialPlayers, saveToLocalStorage, showNotification]
  );

  const movePlayer = useCallback(
    async (fromPos: Position, playerName: string, toPos: Position) => {
      if (fromPos === toPos) return;

      setIsSaving(true);
      try {
        const newSel: Selection = { ...selection };
        newSel[fromPos] = newSel[fromPos].filter((n) => n !== playerName);
        if (!newSel[toPos].includes(playerName)) {
          newSel[toPos] = [...newSel[toPos], playerName];
        }

        // Batch state updates
        setSelection(newSel);
        saveToLocalStorage(newSel, potentialPlayers);

        showNotification(
          `${playerName} flyttet fra ${fromPos} til ${toPos}`,
          "success"
        );
      } catch (error) {
        console.error("Error moving player:", error);
        showNotification("Feil ved flytting av spiller", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [selection, potentialPlayers, saveToLocalStorage, showNotification]
  );

  // Memoize selected and potential player names for better performance
  const selectedPlayerNames = useMemo(() => {
    return Object.values(selection).flat();
  }, [selection]);

  const allUnavailablePlayerNames = useMemo(() => {
    return [...selectedPlayerNames, ...potentialPlayers];
  }, [selectedPlayerNames, potentialPlayers]);

  // Separate memoization for the filtering function to prevent recreation
  const filteredPlayersComputation = useMemo(() => {
    return getFilteredPlayers(players);
  }, [getFilteredPlayers, players]);

  // Optimized available players computation with better memoization
  const available = useMemo(() => {
    const filteredPlayers = filteredPlayersComputation.filter(
      (p) => !allUnavailablePlayerNames.includes(p.name)
    );

    // Pre-sort once and cache the result
    const sortedPlayers = filteredPlayers.sort((a, b) => {
      const regA = a.registrationNumber
        ? parseInt(a.registrationNumber) || Infinity
        : a.rowNumber
        ? a.rowNumber + 98
        : Infinity;
      const regB = b.registrationNumber
        ? parseInt(b.registrationNumber) || Infinity
        : b.rowNumber
        ? b.rowNumber + 98
        : Infinity;
      return regA - regB;
    });

    // Use Set for O(1) lookup instead of O(n) findIndex
    const seenNames = new Set<string>();
    const uniquePlayers = sortedPlayers.filter((player) => {
      if (seenNames.has(player.name)) {
        return false;
      }
      seenNames.add(player.name);
      return true;
    });

    return uniquePlayers;
  }, [filteredPlayersComputation, allUnavailablePlayerNames]);

  // Stateful grupper for potensielle spillere
  type PotentialGroups = Record<
    (typeof POSITIONS)[number] | "Ukjent",
    string[]
  >;
  const [potentialGroups, setPotentialGroups] = useState<PotentialGroups>({
    Midt: [],
    Dia: [],
    Legger: [],
    Libero: [],
    Kant: [],
    Ukjent: [],
  });

  // Initier grupper når data er lastet
  const initializedGroups = useMemo(() => {
    if (players.length === 0)
      return {
        Midt: [],
        Dia: [],
        Legger: [],
        Libero: [],
        Kant: [],
        Ukjent: [],
      };

    const groups: PotentialGroups = {
      Midt: [],
      Dia: [],
      Legger: [],
      Libero: [],
      Kant: [],
      Ukjent: [],
    };

    for (const name of potentialPlayers) {
      const p = players.find((pp) => pp.name === name);
      const mapped = p?.desiredPositions
        ? mapPositions(p.desiredPositions)
        : [];
      const primary = (mapped[0] as (typeof POSITIONS)[number]) || undefined;
      if (primary && groups[primary]) groups[primary].push(name);
      else groups["Ukjent"].push(name);
    }
    return groups;
  }, [players, potentialPlayers, mapPositions]);

  const flattenGroups = useCallback(
    (grps: PotentialGroups = potentialGroups) => {
      const flat = [
        ...grps.Midt,
        ...grps.Dia,
        ...grps.Legger,
        ...grps.Libero,
        ...grps.Kant,
        ...grps.Ukjent,
      ];
      return Array.from(new Set(flat));
    },
    [potentialGroups]
  );

  const addToPotential = useCallback(
    async (player: Player) => {
      const mapped = player.desiredPositions
        ? mapPositions(player.desiredPositions)
        : [];
      const target: Position | "Ukjent" =
        mapped.length > 0 ? (mapped[0] as Position) : "Ukjent";

      // Single state update to prevent double rendering
      setPotentialGroups((prev) => {
        const next: PotentialGroups = {
          Midt: prev.Midt.filter((n) => n !== player.name),
          Dia: prev.Dia.filter((n) => n !== player.name),
          Legger: prev.Legger.filter((n) => n !== player.name),
          Libero: prev.Libero.filter((n) => n !== player.name),
          Kant: prev.Kant.filter((n) => n !== player.name),
          Ukjent: prev.Ukjent.filter((n) => n !== player.name),
        };
        next[target] = [...next[target], player.name];

        // Update potentialPlayers in the same state update cycle
        const flat = flattenGroups(next);
        setPotentialPlayers(flat);
        saveToLocalStorage(selection, flat);

        return next;
      });

      const suffix = target !== "Ukjent" ? ` (${target})` : "";
      showNotification(
        `${player.name} lagt til i potensielle${suffix}`,
        "success"
      );
    },
    [
      mapPositions,
      flattenGroups,
      selection,
      saveToLocalStorage,
      showNotification,
    ]
  );

  // Move player from team selection to potential players
  const moveFromTeamToPotential = useCallback(
    async (playerName: string) => {
      // Find the player object
      const player = players.find((p) => p.name === playerName);
      if (!player) {
        showNotification("Kan ikke finne spilleren", "error");
        return;
      }

      // Remove player from all positions in selection
      const newSel: Selection = { ...selection };
      for (const pos of POSITIONS) {
        newSel[pos] = newSel[pos].filter((name) => name !== playerName);
      }

      // Add to potential players based on desired position
      const mapped = player.desiredPositions
        ? mapPositions(player.desiredPositions)
        : [];
      const target: Position | "Ukjent" =
        mapped.length > 0 ? (mapped[0] as Position) : "Ukjent";

      // Update potential groups
      setPotentialGroups((prev) => {
        const next: PotentialGroups = {
          Midt: prev.Midt.filter((n) => n !== playerName),
          Dia: prev.Dia.filter((n) => n !== playerName),
          Legger: prev.Legger.filter((n) => n !== playerName),
          Libero: prev.Libero.filter((n) => n !== playerName),
          Kant: prev.Kant.filter((n) => n !== playerName),
          Ukjent: prev.Ukjent.filter((n) => n !== playerName),
        };
        next[target] = [...next[target], playerName];

        const newPotentialPlayers = flattenGroups(next);

        // Batch state updates
        setSelection(newSel);
        setPotentialPlayers(newPotentialPlayers);
        saveToLocalStorage(newSel, newPotentialPlayers);

        return next;
      });

      const suffix = target !== "Ukjent" ? ` (${target})` : "";
      showNotification(
        `${playerName} flyttet til potensielle spillere${suffix}`,
        "success"
      );
    },
    [
      players,
      selection,
      mapPositions,
      flattenGroups,
      saveToLocalStorage,
      showNotification,
    ]
  );

  const removeFromPotential = useCallback(
    async (playerName: string) => {
      // Single state update to prevent double rendering
      setPotentialGroups((prev) => {
        const next: PotentialGroups = {
          Midt: prev.Midt.filter((n) => n !== playerName),
          Dia: prev.Dia.filter((n) => n !== playerName),
          Legger: prev.Legger.filter((n) => n !== playerName),
          Libero: prev.Libero.filter((n) => n !== playerName),
          Kant: prev.Kant.filter((n) => n !== playerName),
          Ukjent: prev.Ukjent.filter((n) => n !== playerName),
        };

        // Update potentialPlayers in the same state update cycle
        const flat = flattenGroups(next);
        setPotentialPlayers(flat);
        saveToLocalStorage(selection, flat);

        return next;
      });

      showNotification(
        `${playerName} fjernet fra potensielle spillere`,
        "info"
      );
    },
    [flattenGroups, selection, saveToLocalStorage, showNotification]
  );

  const movePotentialPlayer = useCallback(
    async (playerName: string, targetPosition: Position | "Ukjent") => {
      // Single state update to prevent double rendering
      setPotentialGroups((prev) => {
        // First remove from all positions
        const next: PotentialGroups = {
          Midt: prev.Midt.filter((n) => n !== playerName),
          Dia: prev.Dia.filter((n) => n !== playerName),
          Legger: prev.Legger.filter((n) => n !== playerName),
          Libero: prev.Libero.filter((n) => n !== playerName),
          Kant: prev.Kant.filter((n) => n !== playerName),
          Ukjent: prev.Ukjent.filter((n) => n !== playerName),
        };

        // Add to target position
        next[targetPosition] = [...next[targetPosition], playerName];

        // Update potentialPlayers in the same state update cycle
        const flat = flattenGroups(next);
        setPotentialPlayers(flat);
        saveToLocalStorage(selection, flat);

        return next;
      });

      const suffix =
        targetPosition !== "Ukjent" ? ` til ${targetPosition}` : " til Ukjent";
      showNotification(`${playerName} flyttet${suffix}`, "success");
    },
    [flattenGroups, selection, saveToLocalStorage, showNotification]
  );

  // Draggable team player component (similar to potential players)
  const DraggableTeamPlayer = ({
    playerName,
    position,
    index,
  }: {
    playerName: string;
    position: Position;
    index: number;
  }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: `team-${position}-${playerName}-${index}`,
        data: {
          type: "team-player",
          playerName,
          fromPosition: position,
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
        style={style}
        className={`bg-white/80 border border-white/30 rounded-lg p-3 hover:bg-white/90 transition-colors ${
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
            {(nameToRegistrationNumber[playerName] ||
              nameToRow[playerName]) && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                #
                {nameToRegistrationNumber[playerName] ||
                  (nameToRow[playerName] ? nameToRow[playerName] + 98 : "")}
              </span>
            )}
            <span className="font-medium text-gray-800 truncate text-sm">
              {playerName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => moveFromTeamToPotential(playerName)}
              disabled={isSaving}
              className="text-orange-500 hover:text-orange-700 p-2 md:p-1.5 rounded-full transition-colors hover:bg-orange-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
              title="Flytt til potensielle"
              type="button">
              <span className="text-sm">⭐</span>
            </button>
            <button
              onClick={() => removePlayer(position, playerName)}
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
  };

  // Draggable potential player component
  const DraggablePotentialPlayer = ({
    playerName,
    position,
    index,
  }: {
    playerName: string;
    position: string;
    index: number;
  }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: `potential-${position}-${playerName}-${index}`,
        data: {
          type: "potential-player",
          playerName,
          fromPosition: position,
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
        style={style}
        className={`bg-white/80 border border-white/30 rounded-lg p-3 hover:bg-white/90 transition-colors ${
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
            {(nameToRegistrationNumber[playerName] ||
              nameToRow[playerName]) && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                #
                {nameToRegistrationNumber[playerName] ||
                  (nameToRow[playerName] ? nameToRow[playerName] + 98 : "")}
              </span>
            )}
            <span className="font-medium text-gray-800 truncate text-sm">
              {playerName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => removeFromPotential(playerName)}
              disabled={isSaving}
              className="text-red-500 hover:text-red-700 p-2 md:p-1.5 rounded-full transition-colors hover:bg-red-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
              title="Fjern fra potensielle"
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
  };

  const totalSelected = POSITIONS.reduce(
    (sum, pos) => sum + selection[pos].length,
    0
  );

  // Beregn filtrerte potensielle spillere grupper
  const filteredPotentialGroups = useMemo(() => {
    const potentialPlayerObjects = potentialPlayers
      .map((name) => players.find((p) => p.name === name))
      .filter(Boolean) as Player[];

    const filteredPotentials = getFilteredPlayers(potentialPlayerObjects);
    const filteredNames = new Set(filteredPotentials.map((p) => p.name));

    return {
      ...potentialGroups,
      Midt: potentialGroups.Midt.filter((name) => filteredNames.has(name)),
      Dia: potentialGroups.Dia.filter((name) => filteredNames.has(name)),
      Legger: potentialGroups.Legger.filter((name) => filteredNames.has(name)),
      Libero: potentialGroups.Libero.filter((name) => filteredNames.has(name)),
      Kant: potentialGroups.Kant.filter((name) => filteredNames.has(name)),
      Ukjent: potentialGroups.Ukjent.filter((name) => filteredNames.has(name)),
    };
  }, [getFilteredPlayers, players, potentialPlayers, potentialGroups]);

  // Drag handlers (keeping existing logic intact)
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = event;

    // If no valid drop target, do nothing
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) {
      console.warn("Drag and drop: Missing data", { activeData, overData });
      return;
    }

    try {
      // Handle dragging available player to position
      if (
        activeData.type === "available-player" &&
        overData.type === "position"
      ) {
        const player = activeData.player;
        const targetPosition = overData.position as Position;
        console.log(
          "Dropping available player to position:",
          player.name,
          "→",
          targetPosition
        );
        updateSelection(targetPosition, player);
      }

      // Handle dragging available player to potential drop zone
      else if (
        activeData.type === "available-player" &&
        overData.type === "potential-drop"
      ) {
        const player = activeData.player;
        console.log("Adding player to potential:", player.name);
        addToPotential(player);
      }

      // Handle dragging team player between positions
      else if (
        activeData.type === "team-player" &&
        overData.type === "position"
      ) {
        const playerName = activeData.playerName;
        const fromPosition = activeData.fromPosition as Position;
        const toPosition = overData.position as Position;
        console.log(
          "Moving team player:",
          playerName,
          fromPosition,
          "→",
          toPosition
        );
        movePlayer(fromPosition, playerName, toPosition);
      }

      // Handle dragging team player to available drop zone
      else if (
        activeData.type === "team-player" &&
        overData.type === "available-drop"
      ) {
        const playerName = activeData.playerName;
        const fromPosition = activeData.fromPosition as Position;
        console.log("Removing team player:", playerName, "from", fromPosition);
        removePlayer(fromPosition, playerName);
      }

      // Handle dragging team player to potential drop zone
      else if (
        activeData.type === "team-player" &&
        overData.type === "potential-drop"
      ) {
        const playerName = activeData.playerName;
        const fromPosition = activeData.fromPosition as Position;
        console.log("Moving team player to potential:", playerName, "from", fromPosition);
        moveFromTeamToPotential(playerName);
      }

      // Handle dragging team player to potential position drop zone
      else if (
        activeData.type === "team-player" &&
        overData.type === "potential-position-drop"
      ) {
        const playerName = activeData.playerName;
        const fromPosition = activeData.fromPosition as Position;
        const targetPosition = overData.targetPosition;
        console.log("Moving team player to specific potential position:", playerName, "from", fromPosition, "to", targetPosition);
        moveFromTeamToPotential(playerName);
      }

      // Handle dragging potential player to position
      else if (
        activeData.type === "potential-player" &&
        overData.type === "position"
      ) {
        const playerName = activeData.playerName;
        const targetPosition = overData.position as Position;
        const player = players.find((p) => p.name === playerName);
        if (player) {
          console.log(
            "Moving potential player to position:",
            playerName,
            "→",
            targetPosition
          );
          removeFromPotential(playerName);
          updateSelection(targetPosition, player);
        }
      }

      // Handle dragging potential player to available drop zone
      else if (
        activeData.type === "potential-player" &&
        overData.type === "available-drop"
      ) {
        const playerName = activeData.playerName;
        console.log("Removing potential player:", playerName);
        removeFromPotential(playerName);
      }

      // Handle dragging potential player to potential drop zone (different position)
      else if (
        activeData.type === "potential-player" &&
        overData.type === "potential-position-drop"
      ) {
        const playerName = activeData.playerName;
        const targetPosition = overData.targetPosition;
        const fromPosition = activeData.fromPosition;

        console.log(
          "Moving potential player between positions:",
          playerName,
          fromPosition,
          "→",
          targetPosition
        );

        if (fromPosition !== targetPosition) {
          movePotentialPlayer(playerName, targetPosition);
        }
      }

      // Handle dragging potential player to potential drop zone (same area)
      else if (
        activeData.type === "potential-player" &&
        overData.type === "potential-drop"
      ) {
        const playerName = activeData.playerName;
        const player = players.find((p) => p.name === playerName);
        if (player) {
          console.log("Re-organizing potential player:", playerName);
          // Remove from current position and re-add (will place in correct position group)
          removeFromPotential(playerName);
          setTimeout(() => addToPotential(player), 100); // Small delay to ensure state update
        }
      }

      // Handle dragging available player to team drop zone
      else if (
        activeData.type === "available-player" &&
        overData.type === "team-drop"
      ) {
        const player = activeData.player;
        console.log("Moving player to team (general):", player.name);
        // Find the best position for this player and add them there
        const mapped = player.desiredPositions
          ? mapPositions(player.desiredPositions)
          : [];
        const targetPosition: Position = mapped.length > 0 ? (mapped[0] as Position) : "Midt";
        updateSelection(targetPosition, player);
      }

      // Handle dragging potential player to team drop zone  
      else if (
        activeData.type === "potential-player" &&
        overData.type === "team-drop"
      ) {
        const playerName = activeData.playerName;
        const player = players.find((p) => p.name === playerName);
        if (player) {
          console.log("Moving potential player to team (general):", playerName);
          removeFromPotential(playerName);
          // Find the best position for this player and add them there
          const mapped = player.desiredPositions
            ? mapPositions(player.desiredPositions)
            : [];
          const targetPosition: Position = mapped.length > 0 ? (mapped[0] as Position) : "Midt";
          updateSelection(targetPosition, player);
        }
      } else {
        console.log("Unhandled drag operation:", {
          activeType: activeData.type,
          overType: overData.type,
        });
      }
    } catch (error) {
      console.error("Error handling drag and drop:", error);
      showNotification("Feil ved drag and drop-operasjon", "error");
    }
  };

  // Drop zone components (keeping existing styling)
  const PotentialDropZone = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: "potential-drop",
      data: {
        type: "potential-drop",
      },
    });

    return (
      <div
        ref={setNodeRef}
        className={`min-h-[100px] transition-all duration-200 ${
          isOver
            ? "bg-orange-100 border-2 border-orange-300 border-dashed rounded-lg"
            : ""
        }`}>
        {children}
      </div>
    );
  };

  const TeamDropZone = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: "team-drop",
      data: {
        type: "team-drop",
      },
    });

    return (
      <div
        ref={setNodeRef}
        className={`min-h-[100px] transition-all duration-200 ${
          isOver
            ? "bg-purple-100 border-2 border-purple-300 border-dashed rounded-lg"
            : ""
        }`}>
        {children}
      </div>
    );
  };

  const TeamPositionDropZone = ({
    children,
    targetPosition,
  }: {
    children: React.ReactNode;
    targetPosition: Position;
  }) => {
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
        className={`min-h-[50px] transition-all duration-200 ${
          isOver
            ? "bg-pink-100 border-2 border-pink-300 border-dashed rounded-lg p-1"
            : ""
        }`}>
        {children}
      </div>
    );
  };

  const PotentialPositionDropZone = ({
    children,
    targetPosition,
  }: {
    children: React.ReactNode;
    targetPosition: Position | "Ukjent";
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `potential-position-${targetPosition}`,
      data: {
        type: "potential-position-drop",
        targetPosition,
      },
    });

    return (
      <div
        ref={setNodeRef}
        className={`min-h-[50px] transition-all duration-200 ${
          isOver
            ? "bg-yellow-100 border-2 border-yellow-300 border-dashed rounded-lg p-1"
            : ""
        }`}>
        {children}
      </div>
    );
  };

  const AvailableDropZone = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: "available-drop",
      data: { type: "available-drop" },
    });
    return (
      <div
        ref={setNodeRef}
        className={`transition-all duration-200 ${
          isOver
            ? "bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg"
            : ""
        }`}>
        {children}
      </div>
    );
  };

  return (
    <DragDropWrapper onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50" data-dnd-context="true">
        <NavHeader
          title="NTNUI Volleyball Uttak"
          subtitle="Lagadministrasjon"
          refreshButton={{
            onRefresh: handleManualRefresh,
            isRefreshing: isRefreshing,
          }}
        />

        <div className="w-full px-2 md:px-4 py-8">
          {/* Statistikk with fixed height to prevent CLS */}
          <div className="stats-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-4 md:mb-6">
            {isLoading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
                <StatsCard
                  title="Totalt påmeldt"
                  value={totalRegistrations}
                  icon="👥"
                  color="bg-blue-100"
                />
                <StatsCard
                  title="Valgt til lag"
                  value={totalSelected}
                  icon="✅"
                  color="bg-green-100"
                />
                <StatsCard
                  title="Tilgjengelige"
                  value={available.length}
                  icon="⏳"
                  color="bg-yellow-100"
                />
                <StatsCard
                  title="Potensielle"
                  value={potentialPlayers.length}
                  icon="⭐"
                  color="bg-orange-100"
                />
              </>
            )}
          </div>

          {/* Filters - keeping exact same styling */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mr-2">
                Filtrer spillere:
              </h3>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="gender-filter"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kjønn:
                </label>
                <select
                  id="gender-filter"
                  value={filters.gender}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      gender: e.target.value,
                    }))
                  }
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">Alle</option>
                  <option value="male">Menn</option>
                  <option value="female">Kvinner</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="student-filter"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Student:
                </label>
                <select
                  id="student-filter"
                  value={filters.isStudent}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      isStudent: e.target.value,
                    }))
                  }
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">Alle</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nei</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="previous-team-filter"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  NTNUI i fjor:
                </label>
                <select
                  id="previous-team-filter"
                  value={filters.previousTeam}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      previousTeam: e.target.value,
                    }))
                  }
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">Alle</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nei</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="desired-level-filter"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Divisjon:
                </label>
                <select
                  id="desired-level-filter"
                  value={filters.desiredLevel}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      desiredLevel: e.target.value,
                    }))
                  }
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">Alle</option>
                  <option value="1">1. div</option>
                  <option value="2">2. div</option>
                  <option value="3">3. div</option>
                  <option value="4">4. div</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="desired-position-filter"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Posisjon:
                </label>
                <select
                  id="desired-position-filter"
                  value={filters.desiredPosition}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      desiredPosition: e.target.value,
                    }))
                  }
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">Alle</option>
                  <option value="libero">Libero</option>
                  <option value="setter">Setter</option>
                  <option value="outside">Outside</option>
                  <option value="middle">Middle</option>
                  <option value="opposite">Opposite</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="age-group-filter"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alder:
                </label>
                <select
                  id="age-group-filter"
                  value={filters.ageGroup}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      ageGroup: e.target.value,
                    }))
                  }
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">Alle</option>
                  <option value="under20">&lt;20</option>
                  <option value="20-25">20-25</option>
                  <option value="over25">&gt;25</option>
                </select>
              </div>

              <button
                onClick={() =>
                  setFilters({
                    gender: "all",
                    isStudent: "all",
                    previousTeam: "all",
                    desiredLevel: "all",
                    desiredPosition: "all",
                    ageGroup: "all",
                  })
                }
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Nullstill
              </button>
            </div>
          </div>

          {/* Main grid layout - keeping exact same styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:repeat(14,minmax(0,1fr))] gap-6">
            {/* Tilgjengelige spillere - keeping exact same styling */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-1 md:col-span-1 lg:col-span-5">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>👥</span>
                  Tilgjengelige spillere
                </h2>
              </div>
              <div className="p-6">
                {/* Søkefelt */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Søk etter navn eller radnummer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                    <svg
                      className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  {searchTerm && (
                    <p className="text-sm text-gray-600 mt-2">
                      {debouncedSearchTerm === searchTerm
                        ? `Viser ${
                            available.slice(
                              0,
                              searchTerm ? available.length : 50
                            ).length
                          } av ${available.length} spillere`
                        : `Søker...`}
                    </p>
                  )}
                </div>

                {/* Scrollable list with virtualization */}
                <AvailableDropZone>
                  <div
                    className="player-card-container mt-2 max-h-[100vh] overflow-y-auto overflow-x-hidden pr-2"
                    style={{ WebkitOverflowScrolling: "touch" }}>
                    <VirtualizedPlayerList
                      players={available}
                      positions={POSITIONS}
                      positionIcons={positionIcons}
                      onSelectPosition={(
                        pos: string,
                        player: { name: string }
                      ) => updateSelection(pos as Position, player)}
                      onAddPotential={(p) => addToPotential(p as Player)}
                      isSaving={isSaving}
                      batchSize={20}
                    />
                  </div>
                </AvailableDropZone>
              </div>
            </div>

            {/* Rest of the UI - keeping exact same styling and functionality */}

            {/* Potensielle spillere */}
            <div
              className="bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-500 rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-3 md:col-span-2 lg:col-span-4"
              style={{ animationDelay: "0.1s" }}>
              <div className="bg-black/10 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>⭐</span>
                  Potensielle spillere
                </h2>
              </div>
              <div className="p-6 bg-white/20 backdrop-blur-sm">
                <PotentialDropZone>
                  {potentialPlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-4 block">⭐</span>
                      <p className="text-gray-700">
                        Ingen potensielle spillere valgt
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Dra spillere hit eller klikk ⭐ for å legge til
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {POSITIONS.map((pos) => (
                        <div key={pos}>
                          <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
                            <span
                              className={`w-6 h-6 ${positionColors[pos]} rounded-full flex items-center justify-center text-white text-xs`}>
                              {positionIcons[pos]}
                            </span>
                            <span>{pos}</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                              {filteredPotentialGroups[pos].length}
                            </span>
                          </h3>
                          <PotentialPositionDropZone targetPosition={pos}>
                            {filteredPotentialGroups[pos].length === 0 ? (
                              <p className="text-gray-500 italic min-h-[50px] flex items-center">
                                Ingen potensielle - dra hit for å endre posisjon
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {filteredPotentialGroups[pos].map(
                                  (playerName, index) => (
                                    <DraggablePotentialPlayer
                                      key={`potential-${pos}-${playerName}-${
                                        nameToRegistrationNumber[playerName] ||
                                        nameToRow[playerName] ||
                                        `idx-${index}`
                                      }`}
                                      playerName={playerName}
                                      position={pos}
                                      index={index}
                                    />
                                  )
                                )}
                              </div>
                            )}
                          </PotentialPositionDropZone>
                        </div>
                      ))}

                      {filteredPotentialGroups["Ukjent"].length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                              ?
                            </span>
                            <span>Ukjent</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                              {filteredPotentialGroups["Ukjent"].length}
                            </span>
                          </h3>
                          <PotentialPositionDropZone targetPosition="Ukjent">
                            <div className="space-y-2">
                              {filteredPotentialGroups["Ukjent"].map(
                                (playerName, index) => (
                                  <DraggablePotentialPlayer
                                    key={`potential-ukjent-${playerName}-${
                                      nameToRegistrationNumber[playerName] ||
                                      nameToRow[playerName] ||
                                      `idx-${index}`
                                    }`}
                                    playerName={playerName}
                                    position="Ukjent"
                                    index={index}
                                  />
                                )
                              )}
                            </div>
                          </PotentialPositionDropZone>
                        </div>
                      )}

                      {/* Always show Ukjent drop zone if not already shown */}
                      {filteredPotentialGroups["Ukjent"].length === 0 && (
                        <div>
                          <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                              ?
                            </span>
                            <span>Ukjent</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                              0
                            </span>
                          </h3>
                          <PotentialPositionDropZone targetPosition="Ukjent">
                            <p className="text-gray-500 italic min-h-[50px] flex items-center">
                              Dra spillere hit for ukjent posisjon
                            </p>
                          </PotentialPositionDropZone>
                        </div>
                      )}
                    </div>
                  )}
                </PotentialDropZone>
              </div>
            </div>

            {/* Laguttak */}
            <div
              className="bg-gradient-to-br from-purple-500 via-purple-400 to-pink-500 rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-2 md:col-span-1 lg:col-span-5"
              style={{ animationDelay: "0.2s" }}>
              <div className="bg-black/10 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>🏆</span>
                  Laguttak
                </h2>
              </div>
              <div className="p-6 bg-white/20 backdrop-blur-sm">
                <TeamDropZone>
                  <div className="space-y-6">
                    {POSITIONS.map((pos) => {
                      const teamPlayers = selection[pos] || [];
                      return (
                        <div key={pos}>
                          <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
                            <span
                              className={`w-6 h-6 ${positionColors[pos]} rounded-full flex items-center justify-center text-white text-xs`}>
                              {positionIcons[pos]}
                            </span>
                            <span>{pos}</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                              {teamPlayers.length}
                            </span>
                          </h3>
                          <TeamPositionDropZone targetPosition={pos}>
                            {teamPlayers.length === 0 ? (
                              <p className="text-gray-500 italic min-h-[50px] flex items-center">
                                Ingen spillere valgt - dra hit for å legge til
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {teamPlayers.map((playerName, index) => (
                                  <DraggableTeamPlayer
                                    key={`team-${pos}-${playerName}-${
                                      nameToRegistrationNumber[playerName] ||
                                      nameToRow[playerName] ||
                                      `idx-${index}`
                                    }`}
                                    playerName={playerName}
                                    position={pos}
                                    index={index}
                                  />
                                ))}
                              </div>
                            )}
                          </TeamPositionDropZone>
                        </div>
                      );
                    })}
                  </div>
                </TeamDropZone>
              </div>
            </div>
          </div>

          {/* Spillere etter posisjon - keeping exact same functionality */}
          <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📋</span>
                Spillere etter ønsket posisjon
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {POSITIONS.map((position) => {
                  const positionPlayers = players
                    .filter((player) => {
                      const positions =
                        player.desiredPositions?.toLowerCase() || "";
                      return positions.includes(position.toLowerCase());
                    })
                    .filter((player) => {
                      // Apply same filters as available players
                      return getFilteredPlayers([player]).length > 0;
                    });

                  return (
                    <div key={position} className="space-y-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b border-gray-200">
                        <span
                          className={`w-5 h-5 ${positionColors[position]} rounded-full flex items-center justify-center text-white text-xs`}>
                          {positionIcons[position]}
                        </span>
                        <span className="text-gray-800 text-sm">
                          {position}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({positionPlayers.length})
                        </span>
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {positionPlayers.length === 0 ? (
                          <p className="text-gray-500 italic text-sm">
                            Ingen spillere ønsker denne posisjonen
                          </p>
                        ) : (
                          positionPlayers.map((player) => {
                            const isAvailable = available.some(
                              (p) => p.name === player.name
                            );
                            const isInTeam = POSITIONS.some((pos) =>
                              selection[pos].includes(player.name)
                            );
                            const isPotential = potentialPlayers.includes(
                              player.name
                            );

                            let statusColor = "";
                            let statusText = "";
                            let statusIcon = "";

                            if (isInTeam) {
                              statusColor =
                                "bg-green-100 text-green-800 border-green-200";
                              statusText = "I lag";
                              statusIcon = "✅";
                            } else if (isPotential) {
                              statusColor =
                                "bg-orange-100 text-orange-800 border-orange-200";
                              statusText = "Potensiell";
                              statusIcon = "⭐";
                            } else if (isAvailable) {
                              statusColor =
                                "bg-blue-100 text-blue-800 border-blue-200";
                              statusText = "Tilgjengelig";
                              statusIcon = "👤";
                            } else {
                              statusColor =
                                "bg-gray-100 text-gray-600 border-gray-200";
                              statusText = "Ukjent";
                              statusIcon = "❓";
                            }

                            return (
                              <div
                                key={`position-overview-${position}-${
                                  player.name
                                }-${
                                  player.registrationNumber ||
                                  player.rowNumber ||
                                  `idx-${positionPlayers.indexOf(player)}`
                                }`}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  {(player.registrationNumber ||
                                    player.rowNumber) && (
                                    <span
                                      className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0"
                                      title={
                                        player.registrationNumber
                                          ? `Registreringsnummer ${player.registrationNumber}`
                                          : `Rad ${player.rowNumber}`
                                      }>
                                      #
                                      {player.registrationNumber ||
                                        (player.rowNumber
                                          ? player.rowNumber + 98
                                          : "")}
                                    </span>
                                  )}
                                  <span
                                    className="font-medium text-gray-800 truncate text-sm"
                                    title={player.name}>
                                    {player.name}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full border shrink-0 ${statusColor}`}
                                  title={statusText}>
                                  {statusIcon}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notification */}
          <Notification
            message={notification.message}
            type={notification.type}
            isVisible={notification.isVisible}
            onClose={() =>
              setNotification((prev) => ({ ...prev, isVisible: false }))
            }
          />
        </div>
      </div>
    </DragDropWrapper>
  );
}
