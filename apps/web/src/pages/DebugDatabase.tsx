import { useEffect, useState } from "react";
import type { DebugCollection } from "shared-types";
import { api } from "../api/client";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DebugDatabase() {
  const [database, setDatabase] = useState<string>("");
  const [collections, setCollections] = useState<DebugCollection[]>([]);
  const [selected, setSelected] = useState<string>("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getDebugDatabase()
      .then((response) => {
        setDatabase(response.database);
        setCollections(response.collections);
        if (!response.collections.some((collection) => collection.name === selected)) {
          setSelected(response.collections[0]?.name ?? "");
        }
      })
      .catch(() => setError("The development database dashboard is unavailable."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const active = collections.find((collection) => collection.name === selected);
  const columns = Array.from(new Set((active?.documents ?? []).flatMap((document) => Object.keys(document))));

  return (
    <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-surface p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Development only</p>
          <h1 className="text-xl font-semibold text-ink">Database dashboard</h1>
          <p className="text-sm text-muted">{database || "Loading database..."}</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-medium text-ink">
          Refresh
        </button>
      </header>

      {loading && <p className="text-sm text-muted">Loading collections...</p>}
      {error && <p className="text-sm text-primary">{error}</p>}

      {!loading && !error && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {collections.map((collection) => (
              <button
                key={collection.name}
                type="button"
                onClick={() => setSelected(collection.name)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${selected === collection.name ? "border-primary bg-primary text-white" : "border-line bg-card text-ink"}`}
              >
                {collection.name} ({collection.count})
              </button>
            ))}
          </div>

          {active && (
            <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">{active.name}</h2>
                <p className="text-xs text-muted">Showing up to 100 documents</p>
              </div>
              {active.documents.length === 0 ? (
                <p className="p-4 text-sm text-muted">No documents in this collection.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-surface text-muted">
                      <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">{column}</th>)}</tr>
                    </thead>
                    <tbody>
                      {active.documents.map((document, index) => (
                        <tr key={String(document._id ?? index)} className="border-t border-line align-top">
                          {columns.map((column) => <td key={column} className="max-w-72 whitespace-pre-wrap break-words px-3 py-2 text-ink">{formatValue(document[column])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
