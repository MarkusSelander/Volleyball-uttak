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
import { useEffect, useMemo, useState } from "react";
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

  // Søkefunksjon
  const filteredPlayers = players.filter((player) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const nameMatch = player.name.toLowerCase().includes(searchLower);
    const rowMatch = player.rowNumber?.toString().includes(searchTerm) || false;

    return nameMatch || rowMatch;
  });

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

  // Beregn tilgjengelige spillere (spillere som ikke er valgt til noen posisjon eller potensielle)
  const available = filteredPlayers.filter(
    (p) =>
      !POSITIONS.some((pos) => selection[pos].includes(p.name)) &&
      !potentialPlayers.includes(p.name)
  );

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

  // Initier grupper én gang når data er lastet
  useEffect(() => {
    const allEmpty = Object.values(potentialGroups).every(
      (arr) => arr.length === 0
    );
    if (!allEmpty) return; // allerede initialisert eller bruker har flyttet

    if (players.length === 0) return;

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
    setPotentialGroups(groups);
  }, [players, potentialPlayers]);

  const flattenGroups = (grps: PotentialGroups = potentialGroups) => {
    const flat = [
      ...grps.Midt,
      ...grps.Dia,
      ...grps.Legger,
      ...grps.Libero,
      ...grps.Kant,
      ...grps.Ukjent,
    ];
    return Array.from(new Set(flat));
  };

  const upsertToGroup = async (
    name: string,
    target: (typeof POSITIONS)[number] | "Ukjent"
  ) => {
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
  };

  const removeFromAllGroups = async (name: string) => {
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
  };

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
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <span
            className={`w-6 h-6 ${colorClass} rounded-full flex items-center justify-center text-white text-sm`}>
            {icon}
          </span>
          <span className="text-gray-800">{position}</span>
          <span className="text-sm text-gray-600">({count})</span>
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
        className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm hover:shadow transition-all hover-lift ${
          isDragging ? "opacity-60 scale-105" : ""
        }`}
        style={{ animationDelay: `${index * 0.05}s`, ...style }}>
        {/* Drag handle */}
        <button
          type="button"
          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          aria-label="Dra for å flytte"
          title="Dra for å flytte"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 8a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 12a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 110-2 1 1 0 010 2zm6-1a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        </button>

        {/* Row number badge when available */}
        {typeof rowNumber === "number" && (
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200"
            title={`Rad ${rowNumber}`}>
            #{rowNumber}
          </span>
        )}

        <span className="flex-1 font-medium text-gray-800">{playerName}</span>

        <select
          className="border border-gray-300 rounded-lg px-2.5 py-1 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm font-medium text-gray-700 hover:border-purple-400"
          defaultValue=""
          onChange={(e) => {
            const pos = e.target.value as Position;
            if (pos) moveFromPotential(playerName, pos);
          }}
          disabled={isSaving}
          onClick={(e) => e.stopPropagation()}>
          <option value="" disabled>
            Legg til i lag som...
          </option>
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {positionIcons[pos]} {pos}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeFromPotential(playerName);
          }}
          disabled={isSaving}
          className="ml-2 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
          title="Fjern fra potensielle"
          aria-label="Fjern fra potensielle">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3v1H4v2h16V4h-5V3H9zm1 6v9h2V9h-2zm-4 0v9h2V9H6zm8 0v9h2V9h-2z" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="gradient-primary text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-2 py-6">
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
                  <h1 className="text-2xl font-bold text-white">
                    NTNUI Volleyball Uttak
                  </h1>
                  <p className="text-white/90">Lagadministrasjon</p>
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

        <div className="max-w-screen-2xl mx-auto px-2 md:px-4 py-8">
          {/* Statistikk */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:repeat(14,minmax(0,1fr))] gap-6">
            {/* Tilgjengelige spillere */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-1 md:col-span-1 lg:col-span-5">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
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
                      Viser {available.length} av {filteredPlayers.length}{" "}
                      spillere
                    </p>
                  )}
                </div>

                {/* Scrollable list */}
                <div
                  className="mt-2 max-h-[72vh] overflow-y-auto overflow-x-hidden pr-2"
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
                          key={player.name}
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
              </div>
            </div>

            {/* Potensielle spillere */}
            <div
              className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-3 md:col-span-2 lg:col-span-4"
              style={{ animationDelay: "0.1s" }}>
              <div className="bg-gradient-to-r from-orange-500 to-yellow-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
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
                    <div className="space-y-6">
                      {POSITIONS.map((pos) => (
                        <PotentialPositionSection
                          key={pos}
                          position={pos as Position}
                          count={potentialGroups[pos].length}
                          colorClass={positionColors[pos]}
                          icon={positionIcons[pos]}>
                          {potentialGroups[pos].length === 0 ? (
                            <p className="text-gray-500 italic">
                              Ingen potensielle
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {potentialGroups[pos].map((playerName, index) => (
                                <DraggablePotentialPlayer
                                  key={playerName}
                                  playerName={playerName}
                                  rowNumber={nameToRow[playerName]}
                                  positionIcons={positionIcons}
                                  POSITIONS={POSITIONS}
                                  moveFromPotential={moveFromPotential}
                                  removeFromPotential={removeFromPotential}
                                  isSaving={isSaving}
                                  index={index}
                                />
                              ))}
                            </div>
                          )}
                        </PotentialPositionSection>
                      ))}

                      {potentialGroups["Ukjent"].length > 0 && (
                        <PotentialPositionSection
                          position={"Ukjent" as Position}
                          count={potentialGroups["Ukjent"].length}
                          colorClass={"bg-gray-400"}
                          icon={"?"}>
                          <div className="space-y-2">
                            {potentialGroups["Ukjent"].map(
                              (playerName, index) => (
                                <DraggablePotentialPlayer
                                  key={playerName}
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
                  )}
                </PotentialDropZone>
              </div>
            </div>

            {/* Laguttak */}
            <div
              className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in md:order-2 md:col-span-1 lg:col-span-5"
              style={{ animationDelay: "0.2s" }}>
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
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
