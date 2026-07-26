import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { listFiles, deleteFile } from "~/lib/storage";

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

interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  caseId: string | null;
}

const getUploadedFiles = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return { files: [] };
  const files = await listFiles(auth.userId);
  return { files };
});

const removeFile = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.fileId !== "string") throw new Error("fileId required");
    return { fileId: d.fileId as string };
  })
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.userId) return { success: false, error: "Unauthorized" };
    const ok = await deleteFile(data.fileId, auth.userId);
    return { success: ok };
  });

function EvidencePage() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "document", description: "", tags: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    getUploadedFiles().then((r) => {
      if (r.files) setUploadedFiles(r.files);
    });
  }, []);

  const handleAddMetadata = () => {
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

  const handleRemoveMetadata = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
      setUploadSuccess("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadSuccess(`"${selectedFile.name}" uploaded successfully!`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        // Refresh the file list
        const refreshed = await getUploadedFiles();
        if (refreshed.files) setUploadedFiles(refreshed.files);
      } else {
        setUploadError(result.error || "Upload failed");
      }
    } catch (err) {
      setUploadError("Upload failed. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    const result = await removeFile({ fileId });
    if (result.success) {
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const mimeTypeLabel = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "Image";
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("word") || mimeType.includes("document")) return "Document";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "Spreadsheet";
    if (mimeType.startsWith("audio/")) return "Audio";
    if (mimeType.startsWith("video/")) return "Video";
    if (mimeType.startsWith("text/")) return "Text";
    return "File";
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Evidence Manager</h1>
              <p className="mt-1 text-white/60">Organize and track your case evidence</p>
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

          {/* Upload File Section */}
          <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Upload a File</h2>
            <p className="mb-4 text-sm text-white/60">
              Upload documents, photos, PDFs, audio, or video files (max 5 MB).
              Files are stored securely and associated with your account.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold text-white">Select File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/80 file:mr-4 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-light"
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy transition-all hover:shadow-md disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-white/60">
                Selected: {selectedFile.name} ({formatSize(selectedFile.size)})
              </p>
            )}
            {uploadError && (
              <div className="mt-3 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-300">
                {uploadSuccess}
              </div>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-bold text-white">Uploaded Files ({uploadedFiles.length})</h2>
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg">
                        {file.mimeType.startsWith("image/") ? "🖼️" :
                         file.mimeType.includes("pdf") ? "📄" :
                         file.mimeType.includes("audio") ? "🎵" :
                         file.mimeType.includes("video") ? "🎬" : "📎"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{file.filename}</h3>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">{mimeTypeLabel(file.mimeType)}</span>
                          <span>{formatSize(file.sizeBytes)}</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="ml-4 rounded-lg p-2 text-white/40 hover:bg-red-900/20 hover:text-red-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Metadata Item */}
          {showAdd && (
            <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Add Evidence Description</h2>
              <p className="mb-4 text-sm text-white/60">
                Add metadata about evidence items — links, references, or notes about physical items.
                To upload actual files, use the Upload section above.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-white">Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    placeholder='e.g., "Lease Agreement," "Photo of Damage"'
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-white">Type</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
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
                  <label className="mb-1 block text-sm font-semibold text-white">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Brief description of this evidence and why it's relevant..."
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-white">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newItem.tags}
                    onChange={(e) => setNewItem((p) => ({ ...p, tags: e.target.value }))}
                    placeholder='e.g., "exhibit, key evidence, plaintiff"'
                    className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleAddMetadata} className="gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy">
                  Add Item
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white/70">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Metadata Items List */}
          {items.length === 0 && uploadedFiles.length === 0 ? (
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 text-5xl">📎</div>
              <p className="mb-2 text-lg font-semibold text-white/60">No evidence items yet</p>
              <p className="mb-4 text-sm text-white/40">Upload files or add evidence descriptions to start organizing your case</p>
              <button
                onClick={() => setShowAdd(true)}
                className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy"
              >
                Add Your First Evidence Item
              </button>
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-3">
              <h2 className="mb-2 text-lg font-bold text-white">Evidence Notes ({items.length})</h2>
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-sm">
                  <div>
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {item.type}
                      </span>
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                          {tag}
                        </span>
                      ))}
                      <span className="text-xs text-white/40">Added {item.dateAdded}</span>
                    </div>
                    {item.description && <p className="mt-1 text-sm text-white/60">{item.description}</p>}
                  </div>
                  <button
                    onClick={() => handleRemoveMetadata(item.id)}
                    className="ml-4 rounded-lg p-2 text-white/40 hover:bg-red-900/20 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
