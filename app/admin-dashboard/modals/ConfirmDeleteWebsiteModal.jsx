"use client";

import { useState, useEffect } from "react";

export default function ConfirmDeleteWebsiteModal({ open, onClose, item, onConfirm }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  if (!open) return null;

  const label = item?.title ?? item?.url ?? "this website";

  const handleDelete = async () => {
    setLoading(true);
    try {
      const id = item?.id;
      if (id !== undefined) {
        try {
          const resp = await fetch(
            `https://apirayfogportfolio.nearbydoctors.in/public/api/admin/delete-website/${id}`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            }
          );
          if (!resp.ok) {
            let j = null;
            try { j = await resp.json(); } catch {}
            console.warn("delete-website API returned non-ok", resp.status, j);
          }
        } catch (apiErr) {
          console.warn("delete website API error:", apiErr);
        }
      }
      onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Delete Website</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded border text-sm"
            disabled={loading}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <p className="mb-4">
            Are you sure you want to delete <strong>{label}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded border"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded bg-red-600 text-white"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
