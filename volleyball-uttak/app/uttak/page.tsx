"use client";

import { auth, db, onAuthStateChanged, signOut } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "../components/LoadingSpinner";

// Filter operators (same as Spiller info)
const OPS = [
  { value: "contains", label: "Inneholder" },
  { value: "equals", label: "Er lik" },
  { value: "startsWith", label: "Starter med" },
  { value: "endsWith", label: "Slutter med" },
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: "!=", label: "Ikke lik" },
] as const;

type Op = (typeof OPS)[number]["value"];

type Filter = { op: Op; value: string };

type FilterMap = Record<string, Filter | undefined>;

const POSITIONS = ["Midt", "Dia", "Legger", "Libero", "Kant"] as const;
type Position = (typeof POSITIONS)[number];

type Selection = Record<Position, string[]>;

// Pretty labels (same mapping as Spiller info)
const LABELS: Record<string, string> = {
  rowNumber: "Rad",
  name: "Navn",
  email: "E‑post",
  phone: "Telefon",
  gender: "Kjønn",
  birthDate: "Fødselsdato",
  previousPositions: "Tidligere posisjoner",
  desiredPositions: "Ønskede posisjoner",
  desiredLevel: "Ønsket nivå",
  experience: "Erfaring",
  previousTeam: "Tidligere lag",
  isStudent: "Student",
  level: "Nivå",
  attendance: "Email",
};

const prettyLabel = (key: string) => {
  if (LABELS[key]) return LABELS[key];
  const s = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function UttakPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [filters, setFilters] = useState<FilterMap>({});
  const [openFilterFor, setOpenFilterFor] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [selectionLoading, setSelectionLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch spreadsheet rows
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data?.detailedPlayers) && data.detailedPlayers.length) {
          if (!cancelled) setRows(data.detailedPlayers);
        } else if (Array.isArray(data?.players)) {
          if (!cancelled) setRows(data.players.map((p: any) => ({ name: p.name })));
        } else {
          if (!cancelled) setRows([]);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Kunne ikke hente data fra spreadsheet");
      } finally {
        if (!cancelled) setPlayersLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch user selection from Firestore
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
          const data = snap.data() as Selection & { potentialPlayers?: string[] };
          // Ensure all keys exist
          const empty: Selection = { Midt: [], Dia: [], Legger: [], Libero: [], Kant: [] };
          setSelection({ ...empty, ...data });
        } else {
          setSelection({ Midt: [], Dia: [], Legger: [], Libero: [], Kant: [] });
        }
      } catch (e) {
        console.error(e);
        setError("Kunne ikke hente laguttak");
        setSelection({ Midt: [], Dia: [], Legger: [], Libero: [], Kant: [] });
      } finally {
        setSelectionLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const isLoading = playersLoading || selectionLoading;

  // Set of selected names
  const selectedNameSet = useMemo(() => {
    const set = new Set<string>();
    if (!selection) return set;
    for (const pos of POSITIONS) {
      for (const n of selection[pos] || []) set.add(n);
    }
    return set;
  }, [selection]);

  // Selected rows from spreadsheet
  const baseRows = useMemo(() => {
    if (!rows.length || selectedNameSet.size === 0) return [] as Record<string, any>[];
    return rows.filter((r) => selectedNameSet.has(String((r as any).name)));
  }, [rows, selectedNameSet]);

  // Columns (same as Spiller info). Exclude email + level, keep narrow for rowNumber
  const columns = useMemo(() => {
    const source = baseRows.length ? baseRows : rows;
    if (!source.length) return [] as { key: string; label: string; narrow?: boolean }[];
    const keys = Object.keys(source[0] || {});
    const exclude = new Set(["email", "level"]);
    const preferred = ["rowNumber", "name"];
    const order = [
      ...preferred.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !preferred.includes(k)),
    ].filter((k) => !exclude.has(k.toLowerCase()));
    return order.map((k) => ({ key: k, label: prettyLabel(k), narrow: k === "rowNumber" }));
  }, [rows, baseRows]);

  // Apply filters on baseRows
  const filteredRows = useMemo(() => {
    const data = baseRows;
    if (!data.length) return data;

    const active = Object.entries(filters).filter(([, f]) => f && f.value !== "");
    if (!active.length) return data;

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const match = (cell: any, f: Filter) => {
      if (cell === null || cell === undefined) return false;
      const str = String(cell).toLowerCase();
      const val = f.value.toLowerCase();
      switch (f.op) {
        case "contains":
          return str.includes(val);
        case "equals":
          return str === val;
        case "startsWith":
          return str.startsWith(val);
        case "endsWith":
          return str.endsWith(val);
        case ">": {
          const a = toNum(cell);
          const b = toNum(f.value);
          return Number.isFinite(a) && Number.isFinite(b) ? a > b : false;
        }
        case ">=": {
          const a = toNum(cell);
          const b = toNum(f.value);
          return Number.isFinite(a) && Number.isFinite(b) ? a >= b : false;
        }
        case "<": {
          const a = toNum(cell);
          const b = toNum(f.value);
          return Number.isFinite(a) && Number.isFinite(b) ? a < b : false;
        }
        case "<=": {
          const a = toNum(cell);
          const b = toNum(f.value);
          return Number.isFinite(a) && Number.isFinite(b) ? a <= b : false;
        }
        case "!=":
          return str !== val;
        default:
          return true;
      }
    };

    return data.filter((row) =>
      active.every(([col, f]) => match((row as any)[col], f as Filter))
    );
  }, [baseRows, filters]);

  const setFilter = (col: string, patch: Partial<Filter>) => {
    setFilters((prev) => {
      const existing = prev[col] || { op: "contains", value: "" };
      return { ...prev, [col]: { ...existing, ...patch } as Filter };
    });
  };

  const clearFilter = (col: string) => {
    setFilters((prev) => ({ ...prev, [col]: { op: "contains", value: "" } }));
  };

  const anyFilterActive = useMemo(
    () => Object.values(filters).some((f) => f && f.value),
    [filters]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-2 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Image
                src="/ntnui-logo.png"
                alt="NTNUI logo"
                width={120}
                height={64}
                className="rounded-md bg-white/20 p-2"
                priority
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Uttak</h1>
                <p className="text-white/90">Spillere valgt i laguttak</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/spiller-info"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Spiller info
              </Link>
              <button
                onClick={() => signOut(auth)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-2 py-8">
        {isLoading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <LoadingSpinner size="lg" text="Laster uttak..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Uttatte spillere</h2>
              {anyFilterActive && (
                <button
                  onClick={() => setFilters({})}
                  className="text-sm px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white"
                  title="Fjern alle filtre"
                >
                  Tøm filtre
                </button>
              )}
            </div>
            <div className="p-4 overflow-x-auto">
              {filteredRows.length === 0 ? (
                <p className="text-gray-600">Ingen spillere er tatt ut ennå.</p>
              ) : (
                <table className="min-w-full table-fixed text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="text-left font-semibold text-gray-700 px-3 py-2 whitespace-nowrap border-b align-top relative"
                          style={col.narrow ? { width: "1%" } : undefined}
                        >
                          <div
                            className={
                              col.narrow
                                ? "flex items-center gap-2"
                                : "flex items-center gap-2 max-w-[240px] truncate"
                            }
                            title={col.label}
                          >
                            <span className="truncate">{col.label}</span>
                            <button
                              className={`p-1 rounded hover:bg-gray-200 ${
                                filters[col.key]?.value ? "text-blue-600" : "text-gray-600"
                              }`}
                              title="Filter"
                              onClick={() =>
                                setOpenFilterFor((p) => (p === col.key ? null : col.key))
                              }
                              type="button"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
                              </svg>
                            </button>
                          </div>
                          {openFilterFor === col.key && (
                            <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                              <div className="flex items-center gap-2 mb-2">
                                <select
                                  className="w-40 border border-gray-300 rounded px-2 py-1 text-sm"
                                  value={filters[col.key]?.op || "contains"}
                                  onChange={(e) => setFilter(col.key, { op: e.target.value as Op })}
                                >
                                  {OPS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="ml-auto text-gray-500 hover:text-gray-700"
                                  onClick={() => setOpenFilterFor(null)}
                                  title="Lukk"
                                  type="button"
                                >
                                  ✕
                                </button>
                              </div>
                              <input
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Verdi..."
                                value={filters[col.key]?.value || ""}
                                onChange={(e) => setFilter(col.key, { value: e.target.value })}
                              />
                              <div className="flex gap-2 justify-end mt-3">
                                <button
                                  className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                                  onClick={() => {
                                    clearFilter(col.key);
                                    setOpenFilterFor(null);
                                  }}
                                  type="button"
                                >
                                  Nullstill
                                </button>
                                <button
                                  className="px-2 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
                                  onClick={() => setOpenFilterFor(null)}
                                  type="button"
                                >
                                  Bruk
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {columns.map((col) => {
                          const v = (row as any)[col.key];
                          const value =
                            v === null || v === undefined
                              ? ""
                              : typeof v === "object"
                              ? JSON.stringify(v)
                              : String(v);
                          return (
                            <td
                              key={col.key}
                              className={
                                col.narrow
                                  ? "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b"
                                  : "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b max-w-[260px] truncate"
                              }
                              style={col.narrow ? { width: "1%" } : undefined}
                              title={value}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
