"use client";

import { auth, signOut } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";

// Simple filter operators similar to Excel
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

// Friendly labels for known keys
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
  attendance: "Email", // per earlier request
};

const prettyLabel = (key: string) => {
  if (LABELS[key]) return LABELS[key];
  // insert space before capitals, replace separators, and capitalize first letter
  const s = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Helpers used in both pages
const toDDMMYYYY = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const formatDate = (v: any) => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? String(v) : toDDMMYYYY(d);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : toDDMMYYYY(d);
};

const formatPhone = (v: any) => {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v).trim();
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (!digits) return s;
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
  if (!s) return "";
  const tokens = s.split(/[^a-z0-9æøå]+/).filter(Boolean);
  const hasYes = tokens.some((t) =>
    ["ja", "yes", "y", "true", "1", "x"].includes(t)
  );
  const hasNo = tokens.some((t) =>
    ["nei", "no", "n", "false", "0"].includes(t)
  );
  if (hasYes && !hasNo) return "Ja";
  if (hasNo && !hasYes) return "Nei";
  return hasYes ? "Ja" : hasNo ? "Nei" : "Nei";
};

export default function SpillerInfoPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<FilterMap>({});
  const [openFilterFor, setOpenFilterFor] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (
          Array.isArray(data?.detailedPlayers) &&
          data.detailedPlayers.length
        ) {
          setRows(data.detailedPlayers);
        } else if (Array.isArray(data?.players)) {
          // Fallback: bare navn
          setRows(data.players.map((p: any) => ({ name: p.name })));
        } else {
          setRows([]);
        }
      } catch (e: any) {
        console.error(e);
        setError("Kunne ikke hente data fra spreadsheet");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Build visible columns: include email again and keep original order with friendly labels
  const columns = useMemo(() => {
    if (!rows.length)
      return [] as { key: string; label: string; narrow?: boolean }[];
    const keys = Object.keys(rows[0] || {});

    // Preferred order: rowNumber, name, birthDate, gender, phone, email, previousTeam, previousPositions, desiredPositions, desiredLevel, experience, isStudent, level, attendance
    const preferredOrder = [
      "rowNumber",
      "name",
      "birthDate",
      "gender",
      "phone",
      "email",
      "previousTeam",
      "previousPositions",
      "desiredPositions",
      "desiredLevel",
      "experience",
      "isStudent",
      "level",
      "attendance",
    ];

    const ordered = [
      ...preferredOrder.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !preferredOrder.includes(k)),
    ];

    return ordered.map((k) => ({
      key: k,
      label: prettyLabel(k),
      narrow: k === "rowNumber",
    }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows.length) return rows;

    const active = Object.entries(filters).filter(
      ([, f]) => f && f.value !== ""
    );
    if (!active.length) return rows;

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

    return rows.filter((row) =>
      active.every(([col, f]) => match((row as any)[col], f as Filter))
    );
  }, [rows, filters]);

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
                <h1 className="text-2xl font-bold text-white">Spiller info</h1>
                <p className="text-white/90">Fullt spreadsheet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                Dashboard
              </Link>
              <Link
                href="/uttak"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                Uttak
              </Link>
              <button
                onClick={() => signOut(auth)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-2 py-8">
        {isLoading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <LoadingSpinner size="lg" text="Laster spreadsheet..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                NTNUI Volleyball – Spreadsheet
              </h2>
              {anyFilterActive && (
                <button
                  onClick={() => setFilters({})}
                  className="text-sm px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white"
                  title="Fjern alle filtre">
                  Tøm filtre
                </button>
              )}
            </div>
            <div className="p-4 overflow-x-auto">
              {filteredRows.length === 0 ? (
                <p className="text-gray-600">Ingen rader matcher filtrene.</p>
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
                                fill="currentColor"
                                aria-hidden="true">
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
                                  className="px-2 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
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
                          let value: string = "";
                          if (col.key === "birthDate") value = formatDate(raw);
                          else if (col.key === "phone")
                            value = formatPhone(raw);
                          else if (col.key === "isStudent")
                            value = formatStudent(raw);
                          else if (raw === null || raw === undefined)
                            value = "";
                          else if (typeof raw === "object")
                            value = JSON.stringify(raw);
                          else value = String(raw);
                          return (
                            <td
                              key={col.key}
                              className={
                                col.narrow
                                  ? "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b"
                                  : "px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b max-w-[260px] truncate"
                              }
                              style={col.narrow ? { width: "1%" } : undefined}
                              title={value}>
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
