import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { addCalendar, deleteCalendar, listCalendar } from "~/lib/caseActivity";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Court Date Calendar — Track Deadlines | Fair Fight" },
      {
        name: "description",
        content:
          "Court Calendar is temporarily unavailable while we verify deadline handling. Do not rely on Fair Fight for filing deadlines; confirm dates with the court or an attorney.",
      },
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
  const { caseId } = useSearch({ from: "/calendar" });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (caseId)
      listCalendar({ data: { caseId } })
        .then(setEvents)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Unable to load calendar"),
        );
  }, [caseId]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    type: "hearing",
    notes: "",
  });

  const handleAdd = async () => {
    if (!caseId || !newEvent.title.trim() || !newEvent.date) return;
    try {
      const event = await addCalendar({ data: { caseId, ...newEvent } });
      setEvents((prev) => [...prev, event]);
      setNewEvent({ title: "", date: "", type: "hearing", notes: "" });
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save event");
    }
  };
  const handleRemove = async (id: string) => {
    if (!caseId) return;
    try {
      await deleteCalendar({ data: { caseId, id } });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove event");
    }
  };

  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  const eventTypeColors: Record<string, string> = {
    hearing: "bg-red-100 text-red-300 border-red-800",
    deadline: "bg-orange-100 text-orange-700 border-orange-200",
    filing: "bg-blue-100 text-blue-700 border-blue-200",
    meeting: "bg-green-900/30 text-green-300 border-green-200",
    reminder: "bg-purple-100 text-purple-700 border-purple-200",
    other: "bg-white/10 text-white/80 border-white/10",
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white">
                Court Calendar
              </h1>
              <p className="mt-1 text-white/60">
                Track court dates, deadlines, and appointments
              </p>
            </div>
            {caseId && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md"
              >
                <svg
                  className="mr-1.5 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Event
              </button>
            )}
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-900/40 p-3 text-red-200">
              {error}
            </p>
          )}
          {!caseId ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white">
              Choose a case from your dashboard to view calendar events.
            </div>
          ) : (
            <>
              {showAdd && (
                <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                  <h2 className="mb-4 text-lg font-bold text-white">
                    New Calendar Event
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-white">
                        Event Title
                      </label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent((p) => ({ ...p, title: e.target.value }))
                        }
                        placeholder='e.g., "Hearing on Motion to Dismiss"'
                        className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-white">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) =>
                          setNewEvent((p) => ({ ...p, date: e.target.value }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-white">
                        Event Type
                      </label>
                      <select
                        value={newEvent.type}
                        onChange={(e) =>
                          setNewEvent((p) => ({ ...p, type: e.target.value }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
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
                      <label className="mb-1 block text-sm font-semibold text-white">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={newEvent.notes}
                        onChange={(e) =>
                          setNewEvent((p) => ({ ...p, notes: e.target.value }))
                        }
                        placeholder="Optional notes..."
                        className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
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

              {sortedEvents.length === 0 ? (
                <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-12 text-center shadow-sm">
                  <div className="mx-auto mb-4 text-5xl">📅</div>
                  <p className="mb-2 text-lg font-semibold text-white/60">
                    No events yet
                  </p>
                  <p className="mb-4 text-sm text-white/40">
                    Add court dates and deadlines to stay on track
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy"
                  >
                    Add Your First Event
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${eventTypeColors[event.type] || eventTypeColors.other}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium">
                            {new Date(
                              event.date + "T00:00:00",
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium capitalize">
                            {event.type}
                          </span>
                        </div>
                        {event.notes && (
                          <p className="mt-1 text-sm opacity-70">
                            {event.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(event.id)}
                        className="shrink-0 rounded-lg p-2 opacity-50 hover:opacity-100"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
