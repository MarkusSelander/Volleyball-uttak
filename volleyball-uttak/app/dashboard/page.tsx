"use client";

import { auth, db, onAuthStateChanged, signOut } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import Notification from "../components/Notification";
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

  // Søkefunksjon
  const filteredPlayers = players.filter((player) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const nameMatch = player.name.toLowerCase().includes(searchLower);
    const rowMatch = player.rowNumber?.toString().includes(searchTerm) || false;

    return nameMatch || rowMatch;
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const ref = doc(db, "teams", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setSelection(snap.data() as Selection);
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

      // Legg til spilleren i den valgte posisjonen
      newSel[pos] = [...newSel[pos], player.name];

      setSelection(newSel);
      if (auth.currentUser) {
        await setDoc(doc(db, "teams", auth.currentUser.uid), newSel);
        showNotification(`${player.name} lagt til som ${pos}`, "success");
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

      setSelection(newSel);
      if (auth.currentUser) {
        await setDoc(doc(db, "teams", auth.currentUser.uid), newSel);
        showNotification(
          `${playerName} fjernet fra ${pos} og lagt tilbake i tilgjengelige spillere`,
          "info"
        );
      }
    } catch (error) {
      console.error("Error removing player:", error);
      showNotification("Feil ved fjerning av spiller", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Beregn tilgjengelige spillere (spillere som ikke er valgt til noen posisjon)
  const available = filteredPlayers.filter(
    (p) => !POSITIONS.some((pos) => selection[pos].includes(p.name))
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  NTNUI Volleyball Uttak
                </h1>
                <p className="text-white/90">Lagadministrasjon</p>
              </div>
            </div>
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
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
            title="Posisjoner"
            value={POSITIONS.length}
            icon="🎯"
            color="bg-purple-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tilgjengelige spillere */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
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

              {available.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-4 block">🎉</span>
                  <p className="text-gray-700">
                    {searchTerm
                      ? "Ingen spillere funnet"
                      : "Alle spillere er valgt til lag!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {available.map((player, index) => {
                    const desiredPositions = player.desiredPositions
                      ? mapPositions(player.desiredPositions)
                      : [];
                    const level = player.desiredLevel || player.level || "";

                    return (
                      <div
                        key={player.name}
                        className="border border-gray-200 rounded-lg p-4 hover-lift bg-white">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {player.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">
                              {player.name}
                            </span>
                            {level && (
                              <span className="text-sm text-gray-600 ml-2">
                                ({level})
                              </span>
                            )}
                          </div>
                          {player.rowNumber && (
                            <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Rad {player.rowNumber}
                            </div>
                          )}
                        </div>

                        {player.phone && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600">
                              📞 {player.phone}
                            </p>
                          </div>
                        )}

                        {desiredPositions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-700 mb-1 font-medium">
                              Ønskede posisjoner:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {desiredPositions.map((pos) => (
                                <span
                                  key={pos}
                                  className={`px-2 py-1 rounded text-xs text-white ${positionColors[pos]}`}>
                                  {positionIcons[pos]} {pos}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <select
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                            defaultValue=""
                            onChange={(e) =>
                              updateSelection(
                                e.target.value as Position,
                                player
                              )
                            }
                            disabled={isSaving}>
                            <option value="" disabled>
                              Velg posisjon
                            </option>
                            {POSITIONS.map((pos) => (
                              <option key={pos} value={pos}>
                                {positionIcons[pos]} {pos}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Laguttak */}
          <div
            className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in"
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
                    isSaving={isSaving}
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
  );
}
