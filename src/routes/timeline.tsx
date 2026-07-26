import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/timeline")({
  component: TimelinePage,
  head: () => ({
    meta: [
      { title: "Case Timeline Builder | Fair Fight" },
      { name: "description", content: "Build a chronological timeline of events for your legal case. Visualize case history and track key dates." },
    ],
  }),
});

interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string;
}

function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ date: "", title: "", description: "" });

  const handleAdd = () => {
    if (!newEntry.title.trim() || !newEntry.date) return;
    setEntries((prev) => [...prev, { id: Date.now().toString(), ...newEntry }]);
    setNewEntry({ date: "", title: "", description: "" });
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-navy">Case Timeline</h1>
              <p className="mt-1 text-gray-500">Build a chronological timeline of key events</p>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md"
            >
              <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Event
            </button>
          </div>

          {showAdd && (
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-navy">New Timeline Event</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Date</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Event Title</label>
                  <input
                    type="text"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry((p) => ({ ...p, title: e.target.value }))}
                    placeholder='e.g., "Contract Signed," "Incident Occurred," "Filed Complaint"'
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Description</label>
                  <textarea
                    value={newEntry.description}
                    onChange={(e) => setNewEntry((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Brief description of what happened..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleAdd} className="gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy">Add Event</button>
                <button onClick={() => setShowAdd(false)} className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          {sortedEntries.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 text-5xl">🕐</div>
              <p className="mb-2 text-lg font-semibold text-gray-500">No timeline entries yet</p>
              <p className="mb-4 text-sm text-gray-400">Add key events to build your case timeline</p>
              <button onClick={() => setShowAdd(true)} className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy">
                Add Your First Event
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-20 top-0 h-full w-0.5 bg-gold/30" />
              <div className="space-y-6">
                {sortedEntries.map((entry, i) => (
                  <div key={entry.id} className="relative flex items-start gap-6">
                    <div className="w-20 flex-shrink-0 text-right">
                      <span className="text-sm font-semibold text-navy">
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      i === 0 ? "border-gold bg-gold text-white" : "border-gold/30 bg-white text-navy"
                    }`}>
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <h3 className="font-bold text-navy">{entry.title}</h3>
                      {entry.description && <p className="mt-1 text-sm text-gray-600">{entry.description}</p>}
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="mt-2 text-xs text-gray-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
