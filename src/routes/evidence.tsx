import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/evidence")({
  component: EvidencePage,
  head: () => ({
    meta: [
      { title: "Evidence Manager — Organize Case Evidence | Fair Fight" },
      { name: "description", content: "Upload, organize, and tag evidence for your legal case. Track exhibits, documents, and photos. Never lose track of important evidence." },
    ],
  }),
});

interface EvidenceItem {
  id: string;
  name: string;
  type: string;
  dateAdded: string;
  tags: string[];
  description: string;
}

function EvidencePage() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "document", description: "", tags: "" });

  const handleAdd = () => {
    if (!newItem.name.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newItem.name,
        type: newItem.type,
        dateAdded: new Date().toISOString().split("T")[0],
        tags: newItem.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: newItem.description,
      },
    ]);
    setNewItem({ name: "", type: "document", description: "", tags: "" });
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-navy">Evidence Manager</h1>
              <p className="mt-1 text-gray-500">Organize and track your case evidence</p>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md"
            >
              <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Evidence
            </button>
          </div>

          {showAdd && (
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-navy">New Evidence Item</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    placeholder='e.g., "Lease Agreement," "Photo of Damage"'
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-navy">Type</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  >
                    <option value="document">Document</option>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio Recording</option>
                    <option value="email">Email</option>
                    <option value="text">Text Message</option>
                    <option value="contract">Contract</option>
                    <option value="receipt">Receipt / Invoice</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Brief description of this evidence and why it's relevant..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-navy">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newItem.tags}
                    onChange={(e) => setNewItem((p) => ({ ...p, tags: e.target.value }))}
                    placeholder='e.g., "exhibit, key evidence, plaintiff"'
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleAdd} className="gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy">
                  Add Item
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 text-5xl">📎</div>
              <p className="mb-2 text-lg font-semibold text-gray-500">No evidence items yet</p>
              <p className="mb-4 text-sm text-gray-400">Add evidence to start organizing your case</p>
              <button
                onClick={() => setShowAdd(true)}
                className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy"
              >
                Add Your First Evidence Item
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div>
                    <h3 className="font-semibold text-navy">{item.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {item.type}
                      </span>
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">Added {item.dateAdded}</span>
                    </div>
                    {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="ml-4 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
