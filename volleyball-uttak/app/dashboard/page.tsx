"use client";

import { auth, db, onAuthStateChanged, signOut } from "@/lib/firebase";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import Notification from "../components/Notification";
import PlayerCard from "../components/PlayerCard";
import PositionSection from "../components/PositionSection";
import StatsCard from "../components/StatsCard";

const POSITIONS = ["Midt", "Dia", "Legger", "Libero", "Kant"] as const;

type Position = (typeof POSITIONS)[number];

interface Player {
  name: string;
  email?: string;
  phone?: number;
  gender?: string;
  birthDate?: string;
  previousPositions?: string;
  desiredPositions?: string;
  desiredLevel?: string;
  experience?: string;
  previousTeam?: string;
  isStudent?: string;
  level?: string;
  attendance?: string;
  rowNumber?: number; // Radnummer fra spreadsheet
}

type Selection = Record<Position, string[]>;

const emptySelection: Selection = {
  Midt: [],
  Dia: [],
  Legger: [],
  Libero: [],
  Kant: [],
};

// Legg til potensielle spillere state
const emptyPotentialPlayers: string[] = [];

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

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [potentialPlayers, setPotentialPlayers] = useState<string[]>(
    emptyPotentialPlayers
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dataSource, setDataSource] = useState<string>("");
  const [dataMessage, setDataMessage] = useState<string>("");
  const [totalRegistrations, setTotalRegistrations] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filters, setFilters] = useState({
    gender: "all", // "all", "male", "female"
    isStudent: "all", // "all", "yes", "no"
    previousTeam: "all", // "all", "yes", "no"
    desiredLevel: "all", // "all", "1", "2", "3", etc.
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
    isVisible: boolean;
  }>({ message: "", type: "info", isVisible: false });
  const router = useRouter();

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => {
    setNotification({ message, type, isVisible: true });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, isVisible: false })),
      3000
    );
  };

  // Hjelpefunksjon for å mappe NTNUI posisjoner til våre posisjoner
  const mapPositions = (desiredPositions: string): Position[] => {
    if (!desiredPositions) return [];

    const positions: Position[] = [];
    const lowerPositions = desiredPositions.toLowerCase();

    // Sjekk hver posisjon
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

  // Filterfunksjon som også tar hensyn til søketerm - memoized
  const getFilteredPlayers = useCallback(
    (playerList: Player[]) => {
      return playerList.filter((player) => {
        // Søketerm filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const nameMatch = player.name.toLowerCase().includes(searchLower);
          const rowMatch =
            player.rowNumber?.toString().includes(searchTerm) || false;
          if (!nameMatch && !rowMatch) return false;
        }

        // Gender filter
        if (filters.gender !== "all") {
          const genderLower = player.gender?.toLowerCase() || "";
          if (
            filters.gender === "male" &&
            !genderLower.includes("mann") &&
            !genderLower.includes("male") &&
            !genderLower.includes("m")
          )
            return false;
          if (
            filters.gender === "female" &&
            !genderLower.includes("kvinne") &&
            !genderLower.includes("female") &&
            !genderLower.includes("woman") &&
            !genderLower.includes("k")
          )
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

        // Previous team filter (check if they played for NTNUI before)
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

        return true;
      });
    },
    [searchTerm, filters]
  );

  // Map for quick lookup of row numbers by player name
  const nameToRow = useMemo(() => {
    const m: Record<string, number | undefined> = {};
    for (const p of players) m[p.name] = p.rowNumber;
    return m;
  }, [players]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const ref = doc(db, "teams", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setSelection(data as Selection);
          // Last potensielle spillere hvis de finnes
          if (data.potentialPlayers) {
            setPotentialPlayers(data.potentialPlayers);
          }
        }
      } catch (error) {
        console.error("Error loading selection:", error);
        showNotification("Feil ved lasting av data", "error");
      } finally {
        setIsLoading(false);
      }
    });

    // Hent spillere fra API
    const fetchPlayers = async () => {
      try {
        const response = await fetch("/api/players");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.detailedPlayers) {
          setPlayers(data.detailedPlayers);
        } else {
          // Fallback til enkel format
          setPlayers(
            data.players.map((p: { name: string }) => ({ name: p.name }))
          );
        }

        setDataSource(data.source || "unknown");
        setDataMessage(data.message || "");
        setTotalRegistrations(data.totalRegistrations || data.players.length);

        if (data.source === "fallback") {
          showNotification(
            "Viser eksempel-data. Konfigurer Google Sheets for dine egne spillere.",
            "warning"
          );
        } else if (data.source === "google-sheets") {
          showNotification(
            `Hentet ${
              data.totalRegistrations || data.players.length
            } påmeldinger fra NTNUI Volleyball`,
            "success"
          );
        }
      } catch (error) {
        console.error("Error loading players:", error);
        showNotification("Feil ved lasting av spillere", "error");
        // Sett fallback data hvis API feiler
        setPlayers([
          { name: "Anna Johansen" },
          { name: "Bjørn Olsen" },
          { name: "Cecilie Hansen" },
          { name: "David Berg" },
          { name: "Eva Nilsen" },
        ]);
        setDataSource("fallback");
        setDataMessage("API feilet, viser eksempel-data");
        setTotalRegistrations(5);
      }
    };

    fetchPlayers();
    return () => unsub();
  }, [router]);

  const updateSelection = async (pos: Position, player: Player) => {
    setIsSaving(true);
    try {
      const newSel: Selection = { ...selection };

      // Fjern spilleren fra alle posisjoner først (for å unngå duplikater)
      for (const p of POSITIONS) {
        newSel[p] = newSel[p].filter((n) => n !== player.name);
      }

      // Fjern spilleren fra potensielle spillere hvis de er der
      const newPotentialPlayers = potentialPlayers.filter(
        (name) => name !== player.name
      );
      setPotentialPlayers(newPotentialPlayers);

      // Legg til spilleren i den valgte posisjonen
      newSel[pos] = [...newSel[pos], player.name];

      // Oppdater state først for umiddelbar UI oppdatering
      setSelection(newSel);

      // Prøv å lagre til Firebase, men ikke la det stoppe UI oppdateringen
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, "teams", auth.currentUser.uid), {
            ...newSel,
            potentialPlayers: newPotentialPlayers,
          });
          showNotification(`${player.name} lagt til som ${pos}`, "success");
        } catch (firebaseError) {
          console.error("Firebase error, but UI updated:", firebaseError);
          showNotification(
            `${player.name} lagt til som ${pos} (offline)`,
            "info"
          );
        }
      }
    } catch (error) {
      console.error("Error updating selection:", error);
      showNotification("Feil ved oppdatering av laguttak", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const removePlayer = async (pos: Position, playerName: string) => {
    setIsSaving(true);
    try {
      const newSel: Selection = { ...selection };
      // Fjern spilleren fra den spesifikke posisjonen
      newSel[pos] = newSel[pos].filter((name) => name !== playerName);

      // Oppdater state først for umiddelbar UI oppdatering
      setSelection(newSel);

      // Prøv å lagre til Firebase, men ikke la det stoppe UI oppdateringen
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, "teams", auth.currentUser.uid), {
            ...newSel,
            potentialPlayers,
          });
        } catch (firebaseError) {
          console.error("Firebase error, but UI updated:", firebaseError);
          // Ikke vis feilmelding til bruker hvis UI fortsatt fungerer
        }
      }

      showNotification(
        `${playerName} fjernet fra ${pos} og lagt tilbake i tilgjengelige spillere`,
        "info"
      );
    } catch (error) {
      console.error("Error removing player:", error);
      showNotification("Feil ved fjerning av spiller", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Flytt en spiller mellom posisjoner i Laguttak
  const movePlayer = async (
    fromPos: Position,
    playerName: string,
    toPos: Position
  ) => {
    if (fromPos === toPos) return;
    setIsSaving(true);
    try {
      const newSel: Selection = { ...selection };
      newSel[fromPos] = newSel[fromPos].filter((n) => n !== playerName);
      if (!newSel[toPos].includes(playerName)) {
        newSel[toPos] = [...newSel[toPos], playerName];
      }

      setSelection(newSel);

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, "teams", auth.currentUser.uid), {
            ...newSel,
            potentialPlayers, // uendret
          });
        } catch (firebaseError) {
          console.error("Firebase error, but UI updated:", firebaseError);
        }
      }

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
  };

  // Beregn tilgjengelige spillere (spillere som ikke er valgt til noen posisjon eller potensielle) - memoized
  const available = useMemo(() => {
    const filteredPlayers = getFilteredPlayers(players)
      .filter(
        (p) =>
          !POSITIONS.some((pos) => selection[pos].includes(p.name)) &&
          !potentialPlayers.includes(p.name)
      )
      .sort((a, b) => {
        // Sorter etter radnummer (laveste først)
        const rowA = a.rowNumber || Infinity;
        const rowB = b.rowNumber || Infinity;
        return rowA - rowB;
      });

    // Fjern duplikater basert på navn (behold første/laveste radnummer)
    const uniquePlayers = filteredPlayers.filter((player, index, array) => {
      const firstIndex = array.findIndex((p) => p.name === player.name);
      return index === firstIndex;
    });

    return uniquePlayers;
  }, [getFilteredPlayers, players, selection, potentialPlayers]);

  // Stateful grupper for potensielle spillere (flytting mellom grupper i UI)
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

  // Initier grupper én gang når data er lastet - optimized with useMemo
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

  // Beregn filtrerte potensielle spillere grupper - memoized
  const filteredPotentialGroups = useMemo(() => {
    // Get all potential players as Player objects
    const potentialPlayerObjects = potentialPlayers
      .map((name) => players.find((p) => p.name === name))
      .filter(Boolean) as Player[];

    // Apply filters
    const filteredPotentials = getFilteredPlayers(potentialPlayerObjects);
    const filteredNames = new Set(filteredPotentials.map((p) => p.name));

    // Filter each group
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

  // Update groups only when needed
  useEffect(() => {
    const allEmpty = Object.values(potentialGroups).every(
      (arr) => arr.length === 0
    );
    if (
      allEmpty &&
      Object.values(initializedGroups).some((arr) => arr.length > 0)
    ) {
      setPotentialGroups(initializedGroups);
    }
  }, [initializedGroups, potentialGroups]);

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

  const upsertToGroup = useCallback(
    async (name: string, target: (typeof POSITIONS)[number] | "Ukjent") => {
      setPotentialGroups((prev) => {
        const next: PotentialGroups = {
          Midt: prev.Midt.filter((n) => n !== name),
          Dia: prev.Dia.filter((n) => n !== name),
          Legger: prev.Legger.filter((n) => n !== name),
          Libero: prev.Libero.filter((n) => n !== name),
          Kant: prev.Kant.filter((n) => n !== name),
          Ukjent: prev.Ukjent.filter((n) => n !== name),
        };
        next[target] = [...next[target], name];
        // Sync flat list state for filtering and stats
        const flat = flattenGroups(next);
        setPotentialPlayers(flat);
        // Persist to Firestore (potensielle som flat liste)
        if (auth.currentUser) {
          setDoc(doc(db, "teams", auth.currentUser.uid), {
            ...selection,
            potentialPlayers: flat,
          }).catch(() => {});
        }
        return next;
      });
    },
    [flattenGroups, selection]
  );

  const removeFromAllGroups = useCallback(
    async (name: string) => {
      setPotentialGroups((prev) => {
        const next: PotentialGroups = {
          Midt: prev.Midt.filter((n) => n !== name),
          Dia: prev.Dia.filter((n) => n !== name),
          Legger: prev.Legger.filter((n) => n !== name),
          Libero: prev.Libero.filter((n) => n !== name),
          Kant: prev.Kant.filter((n) => n !== name),
          Ukjent: prev.Ukjent.filter((n) => n !== name),
        };
        const flat = flattenGroups(next);
        setPotentialPlayers(flat);
        if (auth.currentUser) {
          setDoc(doc(db, "teams", auth.currentUser.uid), {
            ...selection,
            potentialPlayers: flat,
          }).catch(() => {});
        }
        return next;
      });
    },
    [flattenGroups, selection]
  );

  const totalSelected = POSITIONS.reduce(
    (sum, pos) => sum + selection[pos].length,
    0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-accent">
        <LoadingSpinner size="lg" text="Laster dashboard..." />
      </div>
    );
  }

  const addToPotential = async (player: Player) => {
    setIsSaving(true);
    try {
      // Bestem standardgruppe fra ønsket posisjon
      const mapped = player.desiredPositions
        ? mapPositions(player.desiredPositions)
        : [];
      const target: Position | "Ukjent" =
        mapped.length > 0 ? (mapped[0] as Position) : "Ukjent";

      await upsertToGroup(player.name, target);

      const suffix = target !== "Ukjent" ? ` (${target})` : "";
      showNotification(
        `${player.name} lagt til i potensielle${suffix}`,
        "success"
      );
    } catch (error) {
      console.error("Error adding to potential:", error);
      showNotification("Feil ved lagring av potensielle spiller", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const removeFromPotential = async (playerName: string) => {
    setIsSaving(true);
    try {
      await removeFromAllGroups(playerName);
      showNotification(
        `${playerName} fjernet fra potensielle spillere`,
        "info"
      );
    } catch (error) {
      console.error("Error removing from potential:", error);
      showNotification("Feil ved fjerning av potensielle spiller", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const moveFromPotential = async (
    playerName: string,
    toPosition: Position
  ) => {
    setIsSaving(true);
    try {
      // Fjern fra potensielle grupper og legg i laguttak-posisjon
      await removeFromAllGroups(playerName);
      const newSel: Selection = { ...selection };
      newSel[toPosition] = [...newSel[toPosition], playerName];
      setSelection(newSel);

      if (auth.currentUser) {
        const flat = flattenGroups();
        await setDoc(doc(db, "teams", auth.currentUser.uid), {
          ...newSel,
          potentialPlayers: flat,
        });
      }
      showNotification(`${playerName} lagt til som ${toPosition}`, "success");
    } catch (error) {
      console.error("Error moving from potential:", error);
      showNotification("Feil ved flytting av spiller", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Håndter drag fra tilgjengelige spillere
    if (activeId.startsWith("available-")) {
      const playerName = activeId.replace("available-", "");
      const player = players.find((p) => p.name === playerName);

      if (!player) return;

      if (overId === "potential-drop") {
        // Dra til potensielle (auto-gruppe)
        addToPotential(player);
      } else if (overId.startsWith("position-")) {
        // Dra til spesifikk posisjon (Laguttak)
        const position = overId.replace("position-", "") as Position;
        updateSelection(position, player);
      } else if (overId.startsWith("potential-pos-")) {
        // Dra til bestemt potensiell posisjon (blir i potensielle)
        const posStr = overId.replace("potential-pos-", "");
        const target: Position | "Ukjent" = isPosition(posStr)
          ? (posStr as Position)
          : "Ukjent";
        upsertToGroup(player.name, target);
      }
    }

    // Håndter drag fra laguttak
    else if (activeId.startsWith("player-")) {
      const parts = activeId.split("-");
      const fromPosition = parts[1] as Position;
      const playerName = parts.slice(2).join("-");

      if (overId === "potential-drop") {
        // Dra til potensielle (auto-gruppe)
        removePlayer(fromPosition, playerName);
        upsertToGroup(playerName, "Ukjent");
      } else if (overId.startsWith("potential-pos-")) {
        // Dra til bestemt potensiell posisjon
        const posStr = overId.replace("potential-pos-", "");
        const target: Position | "Ukjent" = isPosition(posStr)
          ? (posStr as Position)
          : "Ukjent";
        removePlayer(fromPosition, playerName);
        upsertToGroup(playerName, target);
      } else if (overId.startsWith("position-")) {
        // Dra til annen posisjon i Laguttak
        const toPosition = overId.replace("position-", "") as Position;
        if (fromPosition !== toPosition) {
          movePlayer(fromPosition, playerName, toPosition);
        }
      } else if (overId === "available-drop") {
        // Dra tilbake til Tilgjengelige
        removePlayer(fromPosition, playerName);
      }
    }

    // Håndter drag fra potensielle spillere
    else if (activeId.startsWith("potential-")) {
      const playerName = activeId.replace("potential-", "");

      if (overId.startsWith("position-")) {
        // Dra til Laguttak-posisjon
        const position = overId.replace("position-", "") as Position;
        moveFromPotential(playerName, position);
      } else if (overId.startsWith("potential-pos-")) {
        // Dra til annen potensiell posisjon (blir i potensielle)
        const posStr = overId.replace("potential-pos-", "");
        const target: Position | "Ukjent" = isPosition(posStr)
          ? (posStr as Position)
          : "Ukjent";
        upsertToGroup(playerName, target);
      } else if (overId === "available-drop") {
        // Dra tilbake til Tilgjengelige
        removeFromAllGroups(playerName);
      }
    }
  };

  // Drop zone komponent for potensielle spillere
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

  // Drop zone komponent for tilgjengelige spillere (for å dra tilbake)
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

  // Seksjon for potensiell posisjon (egen droppable per posisjon) – matcher Laguttak-stil
  const PotentialPositionSection = ({
    position,
    count,
    colorClass,
    icon,
    children,
  }: {
    position: Position | "Ukjent";
    count: number;
    colorClass: string;
    icon: string;
    children: React.ReactNode;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `potential-pos-${position}`,
      data: { type: "potential-position", position },
    });
    return (
      <div
        ref={setNodeRef}
        className={`border-l-4 pl-4 transition-all duration-200 ${
          isOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
        }`}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span
            className={`w-5 h-5 ${colorClass} rounded-full flex items-center justify-center text-white text-xs`}>
            {icon}
          </span>
          <span className="text-gray-800 text-sm">{position}</span>
          <span className="text-xs text-gray-600">({count})</span>
        </h3>
        {children}
      </div>
    );
  };

  // Draggable komponent for potensielle spillere
  const DraggablePotentialPlayer = ({
    playerName,
    rowNumber,
    positionIcons,
    POSITIONS,
    moveFromPotential,
    removeFromPotential,
    isSaving,
    index,
  }: {
    playerName: string;
    rowNumber?: number;
    positionIcons: Record<string, string>;
    POSITIONS: readonly string[];
    moveFromPotential: (playerName: string, toPosition: Position) => void;
    removeFromPotential: (playerName: string) => void;
    isSaving: boolean;
    index: number;
  }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: `potential-${playerName}`,
        data: {
          name: playerName,
          type: "potential-player",
        },
      });

    const style = transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : undefined;

    return (
      <div
        ref={setNodeRef}
        className={`min-w-0 flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg animate-slide-in shadow-sm hover:shadow-md transition-all duration-200 ${
          isDragging ? "opacity-50 scale-105 shadow-lg" : ""
        }`}
        style={{ animationDelay: `${index * 0.1}s`, ...style }}>
        <div className="min-w-0 flex items-center gap-2">
          {/* Drag handle */}
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0"
            aria-label="Dra for å flytte"
            title="Dra for å flytte"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 8a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 12a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </button>

          {typeof rowNumber === "number" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 shrink-0"
              title={`Rad ${rowNumber}`}>
              #{rowNumber}
            </span>
          )}

          <span className="font-semibold text-gray-800 truncate text-sm">
            {playerName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFromPotential(playerName);
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
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="gradient-primary text-white shadow-lg">
          <div className="w-full px-2 py-6 md:px-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Image
                  src="/ntnui-logo.png"
                  alt="NTNUI logo"
                  width={100}
                  height={64}
                  className="rounded-md bg-white/20 p-2"
                  priority
                />
                <div>
                  <h1 className="text-lg font-bold text-white">
                    NTNUI Volleyball Uttak
                  </h1>
                  <p className="text-white/90 text-sm">Lagadministrasjon</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/uttak"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                  Uttak
                </Link>
                <Link
                  href="/spiller-info"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                  Spiller info
                </Link>
                <button
                  onClick={() => signOut(auth)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logg ut
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="w-full px-2 md:px-4 py-8">
          {/* Statistikk */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-4 md:mb-6">
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
                  Spilte i NTNUI i fjor:
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
                  Ønsket divisjon:
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
                  <option value="1">1. divisjon</option>
                  <option value="2">2. divisjon</option>
                  <option value="3">3. divisjon</option>
                  <option value="4">4. divisjon</option>
                </select>
              </div>

              <button
                onClick={() =>
                  setFilters({
                    gender: "all",
                    isStudent: "all",
                    previousTeam: "all",
                    desiredLevel: "all",
                  })
                }
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Nullstill
              </button>

              {/* Debug info - remove in production */}
              {players.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                  Debug: Første spiller - Kjønn: &ldquo;{players[0]?.gender}
                  &rdquo;, Student: &ldquo;{players[0]?.isStudent}&rdquo;,
                  Forrige lag: &ldquo;
                  {players[0]?.previousTeam}&rdquo;, Ønsket nivå: &ldquo;
                  {players[0]?.desiredLevel}&rdquo;
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:repeat(14,minmax(0,1fr))] gap-6">
            {/* Tilgjengelige spillere */}
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
                      Viser {available.length} av{" "}
                      {getFilteredPlayers(players).length} spillere
                    </p>
                  )}
                </div>

                {/* Scrollable list */}
                <AvailableDropZone>
                  <div
                    className="mt-2 max-h-[50vh] overflow-y-auto overflow-x-hidden pr-2"
                    style={{ WebkitOverflowScrolling: "touch" }}>
                    {available.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl mb-4 block">🎉</span>
                        <p className="text-gray-700">
                          {searchTerm
                            ? "Ingen spillere funnet"
                            : "Alle spillere er valgt til lag eller potensielle!"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-2">
                        {available.map((player, index) => (
                          <PlayerCard
                            key={`${player.name}-${player.rowNumber || index}`}
                            player={player}
                            positions={POSITIONS}
                            positionIcons={positionIcons}
                            onSelectPosition={(
                              pos: string,
                              player: { name: string }
                            ) => updateSelection(pos as Position, player)}
                            onAddPotential={(p) => addToPotential(p as Player)}
                            isSaving={isSaving}
                            index={index}
                            id={`available-${player.name}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </AvailableDropZone>
              </div>
            </div>

            {/* Potensielle spillere */}
            <div
              className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-3 md:col-span-2 lg:col-span-4"
              style={{ animationDelay: "0.1s" }}>
              <div className="bg-gradient-to-r from-orange-500 to-yellow-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>⭐</span>
                  Potensielle spillere
                </h2>
              </div>
              <div className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50">
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
                    <>
                      <div className="space-y-6">
                        {POSITIONS.map((pos) => (
                          <PotentialPositionSection
                            key={pos}
                            position={pos as Position}
                            count={filteredPotentialGroups[pos].length}
                            colorClass={positionColors[pos]}
                            icon={positionIcons[pos]}>
                            {filteredPotentialGroups[pos].length === 0 ? (
                              <p className="text-gray-500 italic">
                                Ingen potensielle
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {filteredPotentialGroups[pos].map(
                                  (playerName, index) => (
                                    <DraggablePotentialPlayer
                                      key={`${playerName}-${
                                        nameToRow[playerName] || index
                                      }-potential-${pos}`}
                                      playerName={playerName}
                                      rowNumber={nameToRow[playerName]}
                                      positionIcons={positionIcons}
                                      POSITIONS={POSITIONS}
                                      moveFromPotential={moveFromPotential}
                                      removeFromPotential={removeFromPotential}
                                      isSaving={isSaving}
                                      index={index}
                                    />
                                  )
                                )}
                              </div>
                            )}
                          </PotentialPositionSection>
                        ))}

                        {filteredPotentialGroups["Ukjent"].length > 0 && (
                          <PotentialPositionSection
                            position={"Ukjent" as Position}
                            count={filteredPotentialGroups["Ukjent"].length}
                            colorClass={"bg-gray-400"}
                            icon={"?"}>
                            <div className="space-y-2">
                              {filteredPotentialGroups["Ukjent"].map(
                                (playerName, index) => (
                                  <DraggablePotentialPlayer
                                    key={`${playerName}-${
                                      nameToRow[playerName] || index
                                    }-potential-ukjent`}
                                    playerName={playerName}
                                    rowNumber={nameToRow[playerName]}
                                    positionIcons={positionIcons}
                                    POSITIONS={POSITIONS}
                                    moveFromPotential={moveFromPotential}
                                    removeFromPotential={removeFromPotential}
                                    isSaving={isSaving}
                                    index={index}
                                  />
                                )
                              )}
                            </div>
                          </PotentialPositionSection>
                        )}
                      </div>
                    </>
                  )}
                </PotentialDropZone>
              </div>
            </div>

            {/* Laguttak */}
            <div
              className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-2 md:col-span-1 lg:col-span-5"
              style={{ animationDelay: "0.2s" }}>
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>🏆</span>
                  Laguttak
                </h2>
              </div>
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="space-y-6">
                  {POSITIONS.map((pos) => (
                    <PositionSection
                      key={pos}
                      position={pos}
                      players={selection[pos]}
                      positionColors={positionColors}
                      positionIcons={positionIcons}
                      onRemovePlayer={(pos, playerName) =>
                        removePlayer(pos as Position, playerName)
                      }
                      onMovePlayer={(fromPos, playerName, toPos) =>
                        movePlayer(
                          fromPos as Position,
                          playerName,
                          toPos as Position
                        )
                      }
                      positions={POSITIONS}
                      isSaving={isSaving}
                      nameToRow={nameToRow}
                    />
                  ))}
                </div>
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
                  const filteredPlayers = getFilteredPlayers(players)
                    .filter((player) => {
                      if (!player.desiredPositions) return false;

                      // Sjekk om spilleren allerede er valgt til lag eller potensielle
                      const isInTeam = POSITIONS.some((pos) =>
                        selection[pos].includes(player.name)
                      );
                      const isPotential = potentialPlayers.includes(
                        player.name
                      );

                      // Vis bare spillere som ikke er valgt enda
                      if (isInTeam || isPotential) return false;

                      const mapped = mapPositions(player.desiredPositions);
                      return mapped.includes(position);
                    })
                    .sort((a, b) => {
                      // Sorter etter radnummer (laveste først)
                      const rowA = a.rowNumber || Infinity;
                      const rowB = b.rowNumber || Infinity;
                      return rowA - rowB;
                    });

                  // Fjern duplikater basert på navn (behold første/laveste radnummer)
                  const positionPlayers = filteredPlayers.filter(
                    (player, index, array) => {
                      const firstIndex = array.findIndex(
                        (p) => p.name === player.name
                      );
                      return index === firstIndex;
                    }
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
                                key={`${player.name}-${
                                  player.rowNumber || "norow"
                                }-${position}`}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  {typeof player.rowNumber === "number" && (
                                    <span
                                      className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0"
                                      title={`Rad ${player.rowNumber}`}>
                                      #{player.rowNumber}
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
    </DndContext>
  );
}
