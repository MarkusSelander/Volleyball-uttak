"use client";

import { DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import type { Selection as HeroUISelection } from "@heroui/react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import dynamic from "next/dynamic";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Components (No SSR for VirtualizedPlayerList to avoid hydration mismatch)
import DragDropWrapper from "../components/DragDropWrapper";
import NavHeader from "../components/NavHeader";
import Notification from "../components/Notification";
import { StatsCardSkeleton } from "../components/SkeletonLoaders";
import StatsCard from "../components/StatsCard";
const VirtualizedPlayerListNoSSR = dynamic(
  () => import("../components/VirtualizedPlayerList"),
  { ssr: false }
);

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
  selectedForTeam?: string;
}

// Utvidet Player interface med forhåndsnormaliserte felt for performance
interface NormalizedPlayer extends Player {
  __sortKey: number; // For stabil sortering
  __name_lc: string;
  __desired_lc: string;
  __gender_lc: string;
  __student_lc: string;
  __prevteam_lc: string;
}

// Unngå navnekonflikt med HeroUI sin Selection
type TeamSelection = Record<Position, string[]>;
type PotentialGroups = Record<(typeof POSITIONS)[number] | "Ukjent", string[]>;

const emptySelection: TeamSelection = {
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
  // Normaliser og sorter spillere én gang ved initialisering
  const [players] = useState<NormalizedPlayer[]>(() => {
    const normalizedPlayers = initialData.players.map(
      (player): NormalizedPlayer => {
        // Beregn sorteringsnøkkel - bruk bare registreringsnummer fra spreadsheet
        const sortKey = player.registrationNumber
          ? parseInt(player.registrationNumber) || Infinity
          : Infinity;

        return {
          ...player,
          __sortKey: sortKey,
          __name_lc: player.name.toLowerCase(),
          __desired_lc: (player.desiredPositions || "").toLowerCase(),
          __gender_lc: (player.gender || "").toLowerCase().trim(),
          __student_lc: (player.isStudent || "").toLowerCase(),
          __prevteam_lc: (player.previousTeam || "").toLowerCase(),
        };
      }
    );

    // Sorter en gang ved initialisering
    normalizedPlayers.sort((a, b) => a.__sortKey - b.__sortKey);
    return normalizedPlayers;
  });

  const [totalRegistrations] = useState<number>(initialData.totalRegistrations);
  const [selection, setSelection] = useState<TeamSelection>(emptySelection);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data function
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Force a hard refresh by calling the revalidate API
      const response = await fetch("/api/revalidate-dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Refresh the page to get new data
        window.location.reload();
      } else {
        console.error("Failed to refresh data");
        alert("Kunne ikke oppdatere data. Prøv igjen senere.");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      alert("Kunne ikke oppdatere data. Sjekk internetttilkoblingen.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 🔎 Enkel søkefunksjon uten kompliserte optimalisieringer
  const [searchTerm, setSearchTerm] = useState<string>("");

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

  // Hydration gate to avoid UI flash before we've read from localStorage
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Stable mapper
  const mapPositions = useCallback((desiredPositions: string): Position[] => {
    if (!desiredPositions) return [];
    const positions: Position[] = [];
    const lowerPositions = desiredPositions.toLowerCase();
    Object.entries(positionMapping).forEach(([ntnuiPos, ourPositions]) => {
      if (lowerPositions.includes(ntnuiPos.toLowerCase())) {
        ourPositions.forEach((pos) => {
          if (!positions.includes(pos)) positions.push(pos);
        });
      }
    });
    return positions;
  }, []);

  // --- Potential players state (single source of truth) ---
  const [potentialGroups, setPotentialGroups] = useState<PotentialGroups>({
    Midt: [],
    Dia: [],
    Legger: [],
    Libero: [],
    Kant: [],
    Ukjent: [],
  });

  const flattenGroups = useCallback((grps: PotentialGroups) => {
    return Array.from(
      new Set([
        ...grps.Midt,
        ...grps.Dia,
        ...grps.Legger,
        ...grps.Libero,
        ...grps.Kant,
        ...grps.Ukjent,
      ])
    );
  }, []);

  const potentialPlayers = useMemo(
    () => flattenGroups(potentialGroups),
    [potentialGroups, flattenGroups]
  );

  // -------- Persistence --------
  const didLoadRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    try {
      const savedSelection = localStorage.getItem("volleyball-selection");
      const savedPotentialGroups = localStorage.getItem(
        "volleyball-potential-groups"
      );
      const legacyFlat = localStorage.getItem("volleyball-potential");

      if (savedSelection) {
        const parsed: TeamSelection = JSON.parse(savedSelection);
        setSelection(parsed);
      }

      if (savedPotentialGroups) {
        const groups: PotentialGroups = JSON.parse(savedPotentialGroups);
        setPotentialGroups(groups);
      } else if (legacyFlat) {
        const names: string[] = JSON.parse(legacyFlat);
        const groups: PotentialGroups = {
          Midt: [],
          Dia: [],
          Legger: [],
          Libero: [],
          Kant: [],
          Ukjent: [],
        };
        const seen = new Set<string>();
        for (const name of names) {
          if (seen.has(name)) continue;
          seen.add(name);
          const p = players.find((pp) => pp.name === name);
          const mapped = p?.desiredPositions
            ? mapPositions(p.desiredPositions)
            : [];
          const primary = (mapped[0] as Position) ?? undefined;
          if (primary) groups[primary].push(name);
          else groups.Ukjent.push(name);
        }
        setPotentialGroups(groups);
        localStorage.setItem(
          "volleyball-potential-groups",
          JSON.stringify(groups)
        );
        localStorage.removeItem("volleyball-potential");
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
  }, [hydrated, players, mapPositions]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("volleyball-selection", JSON.stringify(selection));
      localStorage.setItem(
        "volleyball-potential-groups",
        JSON.stringify(potentialGroups)
      );
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [selection, potentialGroups, hydrated]);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning") => {
      startTransition(() =>
        setNotification({ message, type, isVisible: true })
      );
      setTimeout(() => {
        startTransition(() =>
          setNotification((prev) => ({ ...prev, isVisible: false }))
        );
      }, 3000);
    },
    []
  );

  // --- Optimalisert søkefunksjon (med registreringsnummer) ---
  const getFilteredPlayers = useCallback(
    (playerList: NormalizedPlayer[]) => {
      // Early return hvis ingen søk eller filter
      if (!searchTerm && Object.values(filters).every((v) => v === "all")) {
        return playerList.filter((player) => {
          // Filtrer bare ut spillere som allerede er tatt ut til et lag
          return !(player.selectedForTeam && player.selectedForTeam.trim());
        });
      }

      // Forberegn søkeverdier for bedre ytelse
      const searchRaw = searchTerm;
      const searchLower = searchRaw?.toLowerCase().trim() || "";
      const searchDigits = searchRaw?.replace(/\s/g, "") || "";
      const hasSearch = !!searchTerm;
      const searchIsNumeric = hasSearch && /^\d+$/.test(searchDigits);

      return playerList.filter((player) => {
        // Filtrer bort spillere som allerede er tatt ut til et lag
        if (player.selectedForTeam && player.selectedForTeam.trim()) {
          return false;
        }

        // Optimalisert søk
        if (hasSearch) {
          // Navn søk (mest vanlig)
          const nameMatch = player.__name_lc.includes(searchLower);

          // Registreringsnummer søk (bare hvis det finnes tall i søket)
          let numberMatch = false;
          if (searchDigits) {
            const regNumStr = (player.registrationNumber ?? "")
              .toString()
              .trim();
            if (regNumStr) {
              if (searchIsNumeric) {
                // Eksakt match eller starts-with for numerisk søk
                numberMatch =
                  regNumStr === searchDigits ||
                  regNumStr.startsWith(searchDigits);
              } else {
                // Substring match for blandet søk
                numberMatch = regNumStr.includes(searchDigits);
              }
            }
          }

          if (!nameMatch && !numberMatch) return false;
        }

        if (filters.gender !== "all") {
          // Bruk forhåndsnormalisert felt
          if (filters.gender === "male" && player.__gender_lc !== "mann / male")
            return false;
          if (
            filters.gender === "female" &&
            player.__gender_lc !== "kvinne / female"
          )
            return false;
        }

        if (filters.isStudent !== "all") {
          // Bruk forhåndsnormalisert felt
          if (
            filters.isStudent === "yes" &&
            !/^(ja|yes|y)/.test(player.__student_lc)
          )
            return false;
          if (
            filters.isStudent === "no" &&
            !/^(nei|no|n)/.test(player.__student_lc)
          )
            return false;
        }

        if (filters.previousTeam !== "all") {
          // Bruk forhåndsnormalisert felt
          const playedBefore =
            player.__prevteam_lc.includes("ntnui") ||
            /^(ja|yes|y)/.test(player.__prevteam_lc) ||
            (player.__prevteam_lc.length > 0 &&
              !/^(nei|no|n)/.test(player.__prevteam_lc));
          if (filters.previousTeam === "yes" && !playedBefore) return false;
          if (filters.previousTeam === "no" && playedBefore) return false;
        }

        if (filters.desiredLevel !== "all") {
          const levelLower = player.desiredLevel?.toLowerCase() || "";
          const levelNumber = player.desiredLevel?.toString() || "";
          const want = filters.desiredLevel;
          const ok =
            levelLower.includes(want) ||
            (want === "1" &&
              (levelLower.includes("første") ||
                levelLower.includes("first"))) ||
            (want === "2" &&
              (levelLower.includes("andre") ||
                levelLower.includes("second"))) ||
            (want === "3" &&
              (levelLower.includes("tredje") ||
                levelLower.includes("third"))) ||
            (want === "4" &&
              (levelLower.includes("fjerde") ||
                levelLower.includes("fourth"))) ||
            levelNumber.includes(want);
          if (!ok) return false;
        }

        if (filters.desiredPosition !== "all") {
          // Bruk forhåndsnormalisert felt
          const desiredPosLower = filters.desiredPosition.toLowerCase();
          if (!player.__desired_lc.includes(desiredPosLower)) return false;
        }

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
    [filters, searchTerm]
  );

  // --- Lookup maps ---
  const nameToRegistrationNumber = useMemo(() => {
    const m: Record<string, string | undefined> = {};
    for (const p of players)
      if (p.registrationNumber) m[p.name] = p.registrationNumber;
    return m;
  }, [players]);

  const nameToRow = useMemo(() => {
    const m: Record<string, number | undefined> = {};
    for (const p of players) if (p.rowNumber) m[p.name] = p.rowNumber;
    return m;
  }, [players]);

  // --- Selection mutators ---
  const updateSelection = useCallback(
    async (pos: Position, player: NormalizedPlayer) => {
      const newSel: TeamSelection = { ...selection };
      for (const p of POSITIONS)
        newSel[p] = newSel[p].filter((n) => n !== player.name);
      newSel[pos] = [...newSel[pos], player.name];

      startTransition(() => {
        setSelection(newSel);
        setPotentialGroups((prev) => ({
          Midt: prev.Midt.filter((n) => n !== player.name),
          Dia: prev.Dia.filter((n) => n !== player.name),
          Legger: prev.Legger.filter((n) => n !== player.name),
          Libero: prev.Libero.filter((n) => n !== player.name),
          Kant: prev.Kant.filter((n) => n !== player.name),
          Ukjent: prev.Ukjent.filter((n) => n !== player.name),
        }));
      });

      showNotification(`${player.name} lagt til som ${pos}`, "success");
    },
    [selection, showNotification]
  );

  const removePlayer = useCallback(
    async (pos: Position, playerName: string) => {
      const newSel: TeamSelection = { ...selection };
      newSel[pos] = newSel[pos].filter((name) => name !== playerName);
      startTransition(() => setSelection(newSel));
      showNotification(`${playerName} fjernet fra ${pos}`, "info");
    },
    [selection, showNotification]
  );

  const movePlayer = useCallback(
    async (fromPos: Position, playerName: string, toPos: Position) => {
      if (fromPos === toPos) return;
      setIsSaving(true);
      try {
        const newSel: TeamSelection = { ...selection };
        newSel[fromPos] = newSel[fromPos].filter((n) => n !== playerName);
        if (!newSel[toPos].includes(playerName))
          newSel[toPos] = [...newSel[toPos], playerName];
        startTransition(() => setSelection(newSel));
        showNotification(
          `${playerName} flyttet fra ${fromPos} til ${toPos}`,
          "success"
        );
      } catch (error) {
        console.error("Error moving player:", error);
        showNotification("Feil ved flytting av spiller", "error");
      } finally {
        setTimeout(() => setIsSaving(false), 100);
      }
    },
    [selection, showNotification]
  );

  // --- Derived sets ---
  const selectedPlayerNames = useMemo(
    () => Object.values(selection).flat(),
    [selection]
  );
  const allUnavailablePlayerNames = useMemo(
    () => [...selectedPlayerNames, ...potentialPlayers],
    [selectedPlayerNames, potentialPlayers]
  );

  // Memoize filtered players computation for better performance
  const filteredPlayersComputation = useMemo(() => {
    // Early return optimization for empty search and no filters
    if (!searchTerm && Object.values(filters).every((v) => v === "all")) {
      return players.filter((player) => {
        return !(player.selectedForTeam && player.selectedForTeam.trim());
      });
    }

    return getFilteredPlayers(players);
  }, [getFilteredPlayers, players, searchTerm, filters]);

  // For å vise riktig antall i søkemeldingen
  const searchResultCount = useMemo(() => {
    if (!searchTerm) return 0;
    return filteredPlayersComputation.length;
  }, [searchTerm, filteredPlayersComputation]);

  const available = useMemo(() => {
    const filteredPlayers = filteredPlayersComputation.filter(
      (p) => !allUnavailablePlayerNames.includes(p.name)
    );

    // Spillerne er allerede sortert ved initialisering, så vi trenger bare å fjerne duplikater
    const seenNames = new Set<string>();
    const uniquePlayers = filteredPlayers.filter((player) => {
      if (seenNames.has(player.name)) return false;
      seenNames.add(player.name);
      return true;
    });

    return uniquePlayers;
  }, [filteredPlayersComputation, allUnavailablePlayerNames]);

  // --- Potential view: filtered groups ---
  const filteredPotentialGroups = useMemo(() => {
    const potentialPlayerObjects = potentialPlayers
      .map((name) => players.find((p) => p.name === name))
      .filter(Boolean) as NormalizedPlayer[];

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

  // --- Potential groups mutators ---
  const addToPotential = useCallback(
    async (player: NormalizedPlayer) => {
      const mapped = player.desiredPositions
        ? mapPositions(player.desiredPositions)
        : [];
      const target: Position | "Ukjent" =
        mapped.length > 0 ? (mapped[0] as Position) : "Ukjent";

      startTransition(() => {
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
          return next;
        });
      });

      const suffix = target !== "Ukjent" ? ` (${target})` : "";
      showNotification(
        `${player.name} lagt til i potensielle${suffix}`,
        "success"
      );
    },
    [mapPositions, showNotification]
  );

  const moveFromTeamToPotential = useCallback(
    async (playerName: string) => {
      const player = players.find((p) => p.name === playerName);
      if (!player) {
        showNotification("Kan ikke finne spilleren", "error");
        return;
      }

      startTransition(() => {
        setSelection((prevSel) => {
          const newSel: TeamSelection = { ...prevSel };
          for (const pos of POSITIONS)
            newSel[pos] = newSel[pos].filter((n) => n !== playerName);
          return newSel;
        });

        const mapped = player.desiredPositions
          ? mapPositions(player.desiredPositions)
          : [];
        const target: Position | "Ukjent" =
          mapped.length > 0 ? (mapped[0] as Position) : "Ukjent";

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
          return next;
        });
      });

      const mapped = player.desiredPositions
        ? mapPositions(player.desiredPositions)
        : [];
      const target: Position | "Ukjent" =
        mapped.length > 0 ? (mapped[0] as Position) : "Ukjent";
      showNotification(
        `${playerName} flyttet til potensielle spillere${
          target !== "Ukjent" ? ` (${target})` : ""
        }`,
        "success"
      );
    },
    [players, mapPositions, showNotification]
  );

  const removeFromPotential = useCallback(
    async (playerName: string) => {
      startTransition(() => {
        setPotentialGroups((prev) => ({
          Midt: prev.Midt.filter((n) => n !== playerName),
          Dia: prev.Dia.filter((n) => n !== playerName),
          Legger: prev.Legger.filter((n) => n !== playerName),
          Libero: prev.Libero.filter((n) => n !== playerName),
          Kant: prev.Kant.filter((n) => n !== playerName),
          Ukjent: prev.Ukjent.filter((n) => n !== playerName),
        }));
      });
      showNotification(
        `${playerName} fjernet fra potensielle spillere`,
        "info"
      );
    },
    [showNotification]
  );

  const movePotentialPlayer = useCallback(
    async (playerName: string, targetPosition: Position | "Ukjent") => {
      startTransition(() => {
        setPotentialGroups((prev) => {
          const next: PotentialGroups = {
            Midt: prev.Midt.filter((n) => n !== playerName),
            Dia: prev.Dia.filter((n) => n !== playerName),
            Legger: prev.Legger.filter((n) => n !== playerName),
            Libero: prev.Libero.filter((n) => n !== playerName),
            Kant: prev.Kant.filter((n) => n !== playerName),
            Ukjent: prev.Ukjent.filter((n) => n !== playerName),
          };
          next[targetPosition] = [...next[targetPosition], playerName];
          return next;
        });
      });
      showNotification(
        `${playerName} flyttet${
          targetPosition !== "Ukjent" ? ` til ${targetPosition}` : " til Ukjent"
        }`,
        "success"
      );
    },
    [showNotification]
  );

  // --- DnD drop zones helpers ---
  const PotentialDropZone = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: "potential-drop",
      data: { type: "potential-drop" },
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
      data: { type: "team-drop" },
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

  const AvailableDropZone = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: "available-drop",
      data: { type: "available-drop" },
    });
    return (
      <div
        ref={setNodeRef}
        className={`min-h-[100px] transition-all duration-200 ${
          isOver
            ? "bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg"
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
      data: { type: "position", position: targetPosition },
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
      data: { type: "potential-position-drop", targetPosition },
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

  // --- Drag end handler ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || !overData) return;

    try {
      if (
        activeData.type === "available-player" &&
        overData.type === "position"
      ) {
        const player = activeData.player as NormalizedPlayer;
        const targetPosition = overData.position as Position;
        updateSelection(targetPosition, player);
      } else if (
        activeData.type === "available-player" &&
        overData.type === "potential-drop"
      ) {
        const player = activeData.player as NormalizedPlayer;
        addToPotential(player);
      } else if (
        activeData.type === "team-player" &&
        overData.type === "position"
      ) {
        const playerName = activeData.playerName as string;
        const fromPosition = activeData.fromPosition as Position;
        const toPosition = overData.position as Position;
        movePlayer(fromPosition, playerName, toPosition);
      } else if (
        activeData.type === "team-player" &&
        overData.type === "available-drop"
      ) {
        const playerName = activeData.playerName as string;
        const fromPosition = activeData.fromPosition as Position;
        removePlayer(fromPosition, playerName);
      } else if (
        activeData.type === "team-player" &&
        overData.type === "potential-drop"
      ) {
        const playerName = activeData.playerName as string;
        moveFromTeamToPotential(playerName);
      } else if (
        activeData.type === "team-player" &&
        overData.type === "potential-position-drop"
      ) {
        const playerName = activeData.playerName as string;
        const targetPosition = overData.targetPosition as Position | "Ukjent";
        moveFromTeamToPotential(playerName);
        if (targetPosition !== "Ukjent")
          movePotentialPlayer(playerName, targetPosition);
      } else if (
        activeData.type === "potential-player" &&
        overData.type === "position"
      ) {
        const playerName = activeData.playerName as string;
        const targetPosition = overData.position as Position;
        const player = players.find((p) => p.name === playerName);
        if (player) {
          removeFromPotential(playerName);
          updateSelection(targetPosition, player);
        }
      } else if (
        activeData.type === "potential-player" &&
        overData.type === "available-drop"
      ) {
        const playerName = activeData.playerName as string;
        removeFromPotential(playerName);
      } else if (
        activeData.type === "potential-player" &&
        overData.type === "potential-position-drop"
      ) {
        const playerName = activeData.playerName as string;
        const targetPosition = overData.targetPosition as Position | "Ukjent";
        const fromPosition = activeData.fromPosition;
        if (fromPosition !== targetPosition)
          movePotentialPlayer(playerName, targetPosition);
      } else if (
        activeData.type === "available-player" &&
        overData.type === "team-drop"
      ) {
        const player = activeData.player as NormalizedPlayer;
        const mapped = player.desiredPositions
          ? mapPositions(player.desiredPositions)
          : [];
        const targetPosition: Position =
          mapped.length > 0 ? (mapped[0] as Position) : "Midt";
        updateSelection(targetPosition, player);
      } else if (
        activeData.type === "potential-player" &&
        overData.type === "team-drop"
      ) {
        const playerName = activeData.playerName as string;
        const player = players.find((p) => p.name === playerName);
        if (player) {
          removeFromPotential(playerName);
          const mapped = player.desiredPositions
            ? mapPositions(player.desiredPositions)
            : [];
          const targetPosition: Position =
            mapped.length > 0 ? (mapped[0] as Position) : "Midt";
          updateSelection(targetPosition, player);
        }
      }
    } catch (error) {
      console.error("Error handling drag and drop:", error);
      showNotification("Feil ved drag and drop-operasjon", "error");
    }
  };

  // --- Render ---
  if (!hydrated) {
    return <div className="min-h-screen bg-gray-50" />;
  }

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
        data: { type: "team-player", playerName, fromPosition: position },
      });

    const style = transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
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
                  nameToRegistrationNumber[playerName]}
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
        data: { type: "potential-player", playerName, fromPosition: position },
      });

    const style = transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
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
          <div className="flex items-center gap-0 min-w-0">
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
                  nameToRegistrationNumber[playerName]}
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

  const DraggableAvailablePlayer = ({
    player,
    index,
  }: {
    player: NormalizedPlayer;
    index: number;
  }) => {
    const [selectedKeys, setSelectedKeys] = useState(new Set<string>());

    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: `available-${player.name}-${
          player.registrationNumber || player.rowNumber || index
        }`,
        data: { type: "available-player", player, fromPosition: "available" },
      });

    const style = transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : undefined;

    const selectedValue = useMemo(() => {
      if (selectedKeys.size > 0) {
        return Array.from(selectedKeys)[0] as string;
      }
      return "Velg";
    }, [selectedKeys]);

    const handleSelectionChange = (keys: HeroUISelection) => {
      if (keys === "all") return;
      if (keys instanceof Set) {
        const s = keys as Set<string>;
        setSelectedKeys(s);
        if (s.size > 0) {
          const selectedPosition = Array.from(s)[0] as Position;
          if (selectedPosition && POSITIONS.includes(selectedPosition)) {
            updateSelection(selectedPosition, player);
          }
        }
      }
    };

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
          <div className="flex items-center gap-0 min-w-0">
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
            {(player.registrationNumber || player.rowNumber) && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                #{player.registrationNumber || "?"}
              </span>
            )}
            <span className="font-medium text-gray-800 truncate text-sm">
              {player.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="text-orange-500 hover:text-orange-700 p-2 md:p-1.5 rounded-full transition-colors hover:bg-orange-50 hover:scale-110 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
              title="Flytt til potensielle"
              type="button"
              onClick={() => addToPotential(player)}>
              <span className="text-sm">⭐</span>
            </button>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  className="bg-gray-800 hover:bg-gray-700 text-white border-0 rounded-lg md:rounded-full text-xs min-w-[40px] md:min-w-[70px] px-1.5 md:px-4 py-0.5 md:py-2 shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
                  variant="solid"
                  size="sm"
                  isDisabled={isSaving}>
                  {selectedValue}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Position selection"
                selectedKeys={selectedKeys}
                selectionMode="single"
                variant="flat"
                className="min-w-[120px] bg-gray-800 shadow-xl border-0 rounded-2xl p-2"
                itemClasses={{
                  base: "rounded-xl data-[hover=true]:bg-blue-600 data-[hover=true]:text-white data-[selected=true]:bg-blue-500 data-[selected=true]:text-white transition-all duration-200 ease-in-out text-white mb-1",
                  title: "font-medium",
                }}
                onSelectionChange={handleSelectionChange}>
                {POSITIONS.map((pos) => (
                  <DropdownItem
                    key={pos}
                    value={pos}
                    className="hover:bg-blue-600 hover:text-white transition-all duration-200 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{positionIcons[pos]}</span>
                      <span className="font-medium">{pos}</span>
                    </div>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DragDropWrapper onDragStart={() => {}} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50" data-dnd-context="true">
        <NavHeader
          title="NTNUI Volleyball Uttak"
          subtitle="Lagadministrasjon"
        />

        <div className="w-full px-2 md:px-4 py-8">
          {/* Statistikk */}
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
                  value={selectedPlayerNames.length}
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

          {/* Filters */}
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
                    setFilters((prev) => ({ ...prev, gender: e.target.value }))
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

              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed border border-blue-600 rounded-lg transition-colors flex items-center gap-2">
                {isRefreshing ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Oppdaterer...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Oppdater data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:repeat(14,minmax(0,1fr))] gap-2">
            {/* Tilgjengelige spillere */}
            <div
              className="bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-500 rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-1 md:col-span-1 lg:col-span-5"
              style={{ animationDelay: "0s" }}>
              <div className="bg-black/10 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>👥</span>
                  Tilgjengelige spillere
                </h2>
              </div>
              <div className="p-6 bg-white/20 backdrop-blur-sm">
                <AvailableDropZone>
                  {/* Search */}
                  <div className="mb-4">
                    <div className="mb-2">
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="search"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          placeholder="Søk etter navn eller registreringsnummer..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setSearchTerm("");
                            }
                          }}
                          className="w-full px-4 py-2 pl-10 border border-white/30 bg-white/80 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-gray-900 placeholder-gray-600 transition-all duration-200"
                        />
                        <svg
                          className="absolute left-3 top-2.5 h-5 w-5 text-gray-500"
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

                        {searchTerm && (
                          <button
                            type="button"
                            aria-label="Tøm søk"
                            title="Tøm søk"
                            onClick={() => setSearchTerm("")}
                            className="absolute right-2 top-2.5 px-3 py-1 text-xs font-medium rounded-md bg-gray-800 hover:bg-gray-900 text-white shadow-lg border border-gray-700 transition-all duration-200 hover:shadow-xl">
                            Tøm
                          </button>
                        )}
                      </div>
                      {searchTerm && (
                        <div className="flex items-center justify-between text-sm text-white/80 mt-2">
                          <span>Viser {searchResultCount} spillere</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {available.length === 0 ? (
                    <div className="text-center py-8 text-white/80">
                      <span className="text-4xl mb-4 block">👥</span>
                      <p className="text-white">
                        {searchTerm
                          ? "Ingen spillere funnet"
                          : "Laster spillere..."}
                      </p>
                      {searchTerm && (
                        <p className="text-sm text-white/70 mt-2">
                          Prøv å endre søkekriteriene
                        </p>
                      )}
                    </div>
                  ) : (
                    <div
                      className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden pr-2 scroll-smooth"
                      style={{ WebkitOverflowScrolling: "touch" }}>
                      {available.map((player, index) => (
                        <DraggableAvailablePlayer
                          key={`available-${player.name}-${
                            player.registrationNumber ||
                            player.rowNumber ||
                            index
                          }`}
                          player={player}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </AvailableDropZone>
              </div>
            </div>

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
                              <p className="text-gray-50/90 italic min-h-[50px] flex items-center">
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
                            <p className="text-gray-50/90 italic min-h-[50px] flex items-center">
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
                              <p className="text-gray-50/90 italic min-h-[50px] flex items-center">
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

          {/* Spillere etter posisjon */}
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
                    .filter((player) =>
                      player.__desired_lc.includes(position.toLowerCase())
                    )
                    .filter(
                      (player) => getFilteredPlayers([player]).length > 0
                    );

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
                          positionPlayers.map((player, idx) => {
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
                                  `idx-${idx}`
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
                                      #{player.registrationNumber || "?"}
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
