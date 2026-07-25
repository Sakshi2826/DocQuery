"use client";

import { useState } from "react";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setMessage("");
    setDocumentId(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Upload failed");
        return;
      }

      setStatus("success");
      setMessage(`Uploaded: ${data.document.filename}`);
      setFile(null);
      setDocumentId(data.document.id);
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleUpload} className="space-y-4 rounded-lg border p-6">
        <h2 className="font-medium">Upload a PDF</h2>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
        />

        <button
          type="submit"
          disabled={!file || status === "uploading"}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "uploading" ? "Processing..." : "Upload"}
        </button>

        {message && (
          <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-green-600"}>
            {message}
          </p>
        )}
      </form>

      {documentId && (
        <a href={"/documents/" + documentId} className="text-sm text-blue-600 underline">
          Go to document
        </a>
      )}
    </div>
  );
}