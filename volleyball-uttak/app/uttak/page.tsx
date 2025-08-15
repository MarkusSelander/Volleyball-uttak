"use client";

import { auth, onAuthStateChanged } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import LoadingSpinner from "../components/LoadingSpinner";
import NavHeader from "../components/NavHeader";

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
  registrationNumber: "Reg.nr",
};

const prettyLabel = (key: string) => {
  if (LABELS[key]) return LABELS[key];
  const s = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Convert Excel date to DD.MM.YYYY
const toDDMMYYYY = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

// Format date value for display
const formatDate = (v: any) => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    // Excel serial date -> JS Date (Excel epoch 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? String(v) : toDDMMYYYY(d);
  }
  // Try parse ISO or locale strings
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : toDDMMYYYY(d);
};

// Format phone number for display
const formatPhone = (v: any) => {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v).trim();
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (!digits) return s;
  // Special-case Norwegian +47
  if (hasPlus && digits.startsWith("47") && digits.length >= 10) {
    const rest = digits.slice(2);
    return "+47 " + rest.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  if (digits.length === 8) {
    return (
      (hasPlus ? "+" : "") + digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim()
    );
  }
  return (hasPlus ? "+" : "") + digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
};

const formatStudent = (v: any) => {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (!s) return ""; // keep empty if no value
  const tokens = s.split(/[^a-z0-9æøå]+/).filter(Boolean);
  const hasYes = tokens.some((t) =>
    ["ja", "yes", "y", "true", "1", "x"].includes(t)
  );
  const hasNo = tokens.some((t) =>
    ["nei", "no", "n", "false", "0"].includes(t)
  );
  if (hasYes && !hasNo) return "Ja";
  if (hasNo && !hasYes) return "Nei";
  // Ambiguous or unknown -> default to Nei
  return hasYes ? "Ja" : hasNo ? "Nei" : "Nei";
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
        if (
          Array.isArray(data?.detailedPlayers) &&
          data.detailedPlayers.length
        ) {
          if (!cancelled) setRows(data.detailedPlayers);
        } else if (Array.isArray(data?.players)) {
          if (!cancelled)
            setRows(data.players.map((p: any) => ({ name: p.name })));
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

  // Fetch user selection from localStorage instead of Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        // Read selection from localStorage (same as dashboard uses)
        const savedSelection = localStorage.getItem("volleyball-selection");
        if (savedSelection) {
          const data = JSON.parse(savedSelection) as Selection;
          // Ensure all keys exist
          const empty: Selection = {
            Midt: [],
            Dia: [],
            Legger: [],
            Libero: [],
            Kant: [],
          };
          setSelection({ ...empty, ...data });
        } else {
          setSelection({ Midt: [], Dia: [], Legger: [], Libero: [], Kant: [] });
        }
      } catch (e) {
        console.error(e);
        setError("Kunne ikke hente laguttak fra lokal lagring");
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

  // Map name -> selected position (first match by POSITIONS order)
  const nameToPosition = useMemo(() => {
    const m = new Map<string, string>();
    if (!selection) return m;
    for (const pos of POSITIONS) {
      for (const n of selection[pos] || []) {
        if (!m.has(n)) m.set(n, pos);
      }
    }
    return m;
  }, [selection]);

  // Selected rows from spreadsheet
  const baseRows = useMemo(() => {
    if (!rows.length || selectedNameSet.size === 0)
      return [] as Record<string, any>[];
    return rows.filter((r) => selectedNameSet.has(String((r as any).name)));
  }, [rows, selectedNameSet]);

  // Attach computed selected position to each row
  const preparedRows = useMemo(() => {
    return baseRows.map((r) => ({
      ...r,
      selectedPosition: nameToPosition.get(String((r as any).name)) || "",
    }));
  }, [baseRows, nameToPosition]);

  // Columns: only Navn, Fødselsdato, Kjønn, Telefon, Mail (col P), Student, Registreringsnummer, Posisjon
  const columns = useMemo(() => {
    return [
      { key: "registrationNumber", label: "Reg.nr", narrow: true },
      { key: "name", label: "Navn" },
      { key: "birthDate", label: "Fødselsdato" },
      { key: "gender", label: "Kjønn" },
      { key: "phone", label: "Telefon" },
      { key: "email", label: "Mail" },
      { key: "isStudent", label: "Student" },
      { key: "selectedPosition", label: "Posisjon" },
    ];
  }, []);

  // Apply filters on preparedRows
  const filteredRows = useMemo(() => {
    const data = preparedRows;
    if (!data.length) return data;

    const active = Object.entries(filters).filter(
      ([, f]) => f && f.value !== ""
    );
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
  }, [preparedRows, filters]);

  // Eksport til Excel funksjon
  const exportToExcel = () => {
    if (filteredRows.length === 0) {
      alert("Ingen spillere å eksportere");
      return;
    }

    // Forbered data i ønsket format
    const exportData = filteredRows.map((row: any, index: number) => {
      const name = row.name || "";
      const email = row.email || "";

      return {
        Navn: name,
        "E-post": email,
        "Spilte ifjor": "", // Placeholder - vil bli erstattet med formel
      };
    });

    // Opprett Excel-arbeidsbok
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Legg til formler for "Spilte ifjor" kolonnen (kolonne C)
    filteredRows.forEach((row: any, index: number) => {
      const rowNum = index + 2; // +2 for header og 0-indexing
      const cellRef = `C${rowNum}`;
      // Excel formel som refererer til email i kolonne B (G7 erstattes med B-cellen)
      const formula = `=HVISFEIL(HVIS(XLOOKUP(B${rowNum},'Skjemasvar 1'!$P:$P,'Skjemasvar 1'!$H:$H)=0,"Ny spiller",XLOOKUP(B${rowNum},'Skjemasvar 1'!$P:$P,'Skjemasvar 1'!$H:$H)&" i fjor"),"")`;
      ws[cellRef] = { t: "str", f: formula };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Uttatte spillere");

    // Last ned filen
    const fileName = `uttatte-spillere-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

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
      <NavHeader title="Uttak" subtitle="Spillere valgt i laguttak" />

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
              <h2 className="text-lg font-semibold text-white">
                Uttatte spillere
              </h2>
              <div className="flex items-center gap-3">
                {filteredRows.length > 0 && (
                  <button
                    onClick={exportToExcel}
                    className="text-sm px-4 py-2 rounded bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center gap-2"
                    title="Eksporter til Excel">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    Eksporter Excel
                  </button>
                )}
                {anyFilterActive && (
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white"
                    title="Fjern alle filtre">
                    Tøm filtre
                  </button>
                )}
              </div>
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
                          style={col.narrow ? { width: "1%" } : undefined}>
                          <div
                            className={
                              col.narrow
                                ? "flex items-center gap-2"
                                : "flex items-center gap-2 max-w-[240px] truncate"
                            }
                            title={col.label}>
                            <span className="truncate">{col.label}</span>
                            <button
                              className={`p-1 rounded hover:bg-gray-200 ${
                                filters[col.key]?.value
                                  ? "text-blue-600"
                                  : "text-gray-600"
                              }`}
                              title="Filter"
                              onClick={() =>
                                setOpenFilterFor((p) =>
                                  p === col.key ? null : col.key
                                )
                              }
                              type="button">
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor">
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
                                  onChange={(e) =>
                                    setFilter(col.key, {
                                      op: e.target.value as Op,
                                    })
                                  }>
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
                                  type="button">
                                  ✕
                                </button>
                              </div>
                              <input
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Verdi..."
                                value={filters[col.key]?.value || ""}
                                onChange={(e) =>
                                  setFilter(col.key, { value: e.target.value })
                                }
                              />
                              <div className="flex gap-2 justify-end mt-3">
                                <button
                                  className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
                                  onClick={() => {
                                    clearFilter(col.key);
                                    setOpenFilterFor(null);
                                  }}
                                  type="button">
                                  Nullstill
                                </button>
                                <button
                                  className="px-2 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
                                  onClick={() => setOpenFilterFor(null)}
                                  type="button">
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
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {columns.map((col) => {
                          const raw = (row as any)[col.key];

                          // Mail (email) clickable mailto link
                          if (col.key === "email") {
                            const email = String(raw ?? "").trim();
                            return (
                              <td
                                key={col.key}
                                className={
                                  col.narrow
                                    ? "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b"
                                    : "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b max-w-[260px] truncate"
                                }
                                style={col.narrow ? { width: "1%" } : undefined}
                                title={email}>
                                {email ? (
                                  <a
                                    href={`mailto:${email}`}
                                    className="text-blue-600 hover:underline">
                                    {email}
                                  </a>
                                ) : (
                                  ""
                                )}
                              </td>
                            );
                          }

                          let display: string = "";
                          if (col.key === "phone") {
                            display = formatPhone(raw);
                          } else if (col.key === "birthDate") {
                            display = formatDate(raw);
                          } else if (col.key === "isStudent") {
                            display = formatStudent(raw);
                          } else if (col.key === "registrationNumber") {
                            // Format registration number with # prefix
                            const regNum = String(raw ?? "").trim();
                            display = regNum ? `#${regNum}` : "";
                          } else if (raw === null || raw === undefined) {
                            display = "";
                          } else if (typeof raw === "object") {
                            display = JSON.stringify(raw);
                          } else {
                            display = String(raw);
                          }
                          return (
                            <td
                              key={col.key}
                              className={
                                col.narrow
                                  ? "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b"
                                  : "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b max-w-[260px] truncate"
                              }
                              style={col.narrow ? { width: "1%" } : undefined}
                              title={display}>
                              {display}
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
