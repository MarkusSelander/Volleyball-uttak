"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/firebase";
import LoadingSpinner from "../components/LoadingSpinner";

export default function SpillerInfoPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data?.detailedPlayers) && data.detailedPlayers.length) {
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

  const columns = useMemo(() => {
    if (!rows.length) return [] as string[];
    const keys = Object.keys(rows[0] || {});
    const preferred = ["rowNumber", "name"]; // Vis disse først når de finnes
    const rest = keys.filter((k) => !preferred.includes(k));
    return [...preferred.filter((k) => keys.includes(k)), ...rest];
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-2 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
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
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">NTNUI Volleyball – Spreadsheet</h2>
            </div>
            <div className="p-4 overflow-x-auto">
              {rows.length === 0 ? (
                <p className="text-gray-600">Ingen data å vise.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="text-left font-semibold text-gray-700 px-3 py-2 whitespace-nowrap border-b">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {columns.map((col) => {
                          const v = (row as any)[col];
                          const value =
                            v === null || v === undefined
                              ? ""
                              : typeof v === "object"
                              ? JSON.stringify(v)
                              : String(v);
                          return (
                            <td
                              key={col}
                              className="px-3 py-2 text-gray-800 align-top whitespace-nowrap border-b">
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
