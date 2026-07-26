import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Court Date Calendar — Track Deadlines | Fair Fight" },
      { name: "description", content: "Track court dates, filing deadlines, statutes of limitations, and appointments. Never miss a legal deadline." },
    ],
  }),
});

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  caseId?: string;
  notes: string;
}

function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", type: "hearing", notes: "" });

  const handleAdd = () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    setEvents((prev) => [
      ...prev,
      { id: Date.now().toString(), ...newEvent },
    ]);
    setNewEvent({ title: "", date: "", type: "hearing", notes: "" });
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  const eventTypeColors: Record<string, string> = {
    hearing: "bg-red-100 text-red-700 border-red-200",
    deadline: "bg-orange-100 text-orange-700 border-orange-200",
    filing: "bg-blue-100 text-blue-700 border-blue-200",
    meeting: "bg-green-100 text-green-700 border-green-200",
    reminder: "bg-purple-100 text-purple-700 border-purple-200",
    other: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-navy">Court Calendar</h1>
              <p className="mt-1 text-gray-500">Track court dates, deadlines, and appointments</p>
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
              <h2 className="mb-4 text-lg font-bold text-navy">New Calendar Event</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Event Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                    placeholder='e.g., "Hearing on Motion to Dismiss"'
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Event Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  >
                    <option value="hearing">Court Hearing</option>
                    <option value="deadline">Filing Deadline</option>
                    <option value="filing">Filing Due</option>
                    <option value="meeting">Attorney Meeting</option>
                    <option value="reminder">Reminder</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Notes</label>
                  <input
                    type="text"
                    value={newEvent.notes}
                    onChange={(e) => setNewEvent((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional notes..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleAdd} className="gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy">
                  Add Event
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {sortedEvents.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 text-5xl">📅</div>
              <p className="mb-2 text-lg font-semibold text-gray-500">No events yet</p>
              <p className="mb-4 text-sm text-gray-400">Add court dates and deadlines to stay on track</p>
              <button onClick={() => setShowAdd(true)} className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy">
                Add Your First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEvents.map((event) => (
                <div key={event.id} className={`flex items-start justify-between rounded-xl border p-4 ${eventTypeColors[event.type] || eventTypeColors.other}`}>
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                      <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium capitalize">{event.type}</span>
                    </div>
                    {event.notes && <p className="mt-1 text-sm opacity-70">{event.notes}</p>}
                  </div>
                  <button onClick={() => handleRemove(event.id)} className="ml-4 rounded-lg p-2 opacity-50 hover:opacity-100">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
