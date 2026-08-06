import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { Link } from "@tanstack/react-router";
import { addTimeline, deleteTimeline, listTimeline } from "~/lib/caseActivity";

export const Route = createFileRoute("/timeline")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search.caseId === "string" ? search.caseId : undefined,
  }),
  component: TimelinePage,
  head: () => ({
    meta: [
      { title: "Case Timeline Builder | Fair Fight" },
      {
        name: "description",
        content:
          "Build a chronological timeline of events for your legal case.",
      },
    ],
  }),
});
type Entry = { id: string; date: string; title: string; description: string };
function TimelinePage() {
  const { caseId } = Route.useSearch();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: "",
    title: "",
    description: "",
  });
  const [error, setError] = useState("");
  useEffect(() => {
    if (caseId)
      listTimeline({ data: { caseId } })
        .then(setEntries)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Unable to load timeline"),
        );
  }, [caseId]);
  const handleAdd = async () => {
    if (!caseId || !newEntry.title.trim() || !newEntry.date) return;
    try {
      const entry = await addTimeline({ data: { caseId, ...newEntry } });
      setEntries((prev) => [...prev, entry]);
      setNewEntry({ date: "", title: "", description: "" });
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save event");
    }
  };
  const handleRemove = async (id: string) => {
    if (!caseId) return;
    try {
      await deleteTimeline({ data: { caseId, id } });
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove event");
    }
  };
  const sortedEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white">
                Case Timeline
              </h1>
              <p className="mt-1 text-white/60">
                Build a chronological timeline of key events
              </p>
            </div>
            {caseId && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy"
              >
                ＋ Add Event
              </button>
            )}
          </div>
          {!caseId ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white">
              <p className="text-lg font-semibold">
                Choose a case to view its timeline
              </p>
              <Link
                to="/dashboard"
                search={{ checkout: undefined }}
                className="mt-5 inline-block text-gold underline"
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <p className="mb-4 rounded-lg bg-red-900/40 p-3 text-red-200">
                  {error}
                </p>
              )}
              {showAdd && (
                <div className="mb-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-bold text-white">
                    New Timeline Event
                  </h2>
                  <input
                    aria-label="Date"
                    type="date"
                    value={newEntry.date}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white"
                  />
                  <input
                    aria-label="Event Title"
                    value={newEntry.title}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, title: e.target.value })
                    }
                    placeholder="Event title"
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white"
                  />
                  <textarea
                    aria-label="Description"
                    value={newEntry.description}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, description: e.target.value })
                    }
                    placeholder="Brief description of what happened..."
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleAdd}
                      className="gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy"
                    >
                      Add Event
                    </button>
                    <button
                      onClick={() => setShowAdd(false)}
                      className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {sortedEntries.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-sm">
                  <div className="mx-auto mb-4 text-5xl">🕐</div>
                  <p className="text-lg font-semibold text-white/60">
                    No timeline entries yet
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-20 top-0 h-full w-0.5 bg-gold/30" />
                  <div className="space-y-6">
                    {sortedEntries.map((entry, i) => (
                      <div
                        key={entry.id}
                        className="relative flex items-start gap-6"
                      >
                        <div className="w-20 flex-shrink-0 text-right text-sm font-semibold text-white">
                          {new Date(
                            `${entry.date}T00:00:00`,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${i === 0 ? "border-gold bg-gold text-white" : "border-gold/30 bg-white text-white"}`}
                        >
                          <span className="text-xs font-bold">{i + 1}</span>
                        </div>
                        <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm">
                          <h3 className="font-bold text-white">
                            {entry.title}
                          </h3>
                          {entry.description && (
                            <p className="mt-1 text-sm text-white/70">
                              {entry.description}
                            </p>
                          )}
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="mt-2 text-xs text-white/40 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
