"use client";

import React, { useState, useEffect } from "react";

export default function CategoryModal({
  open,
  onClose,
  onAdd,
  categories,
  onEditCategory,
  onDeleteCategory,
}) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [localList, setLocalList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setErr("");
      setLoading(false);
      setLocalList([]);
      setEditingIndex(null);
      setEditValue("");
    } else {
      setLocalList(categories ?? []);
    }
  }, [open, categories]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Category name is required.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const payload = { name: trimmed };
      const resp = await fetch(
        "https://apirayfogportfolio.nearbydoctors.in/public/api/admin/add-category",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      let data = null;
      try {
        data = await resp.json();
      } catch {}
      if (!resp.ok) {
        const msg =
          data?.message ?? data?.error ?? `Request failed (${resp.status})`;
        setErr(msg);
        setLoading(false);
        return;
      }
      let id;
      let returnedName = trimmed;
      if (data) {
        if (data?.data?.id) id = String(data.data.id);
        else if (data?.id) id = String(data.id);
        if (data?.data?.name) returnedName = data.data.name;
        else if (data?.name) returnedName = data.name;
      }
      const token = id ? `${id}|${returnedName}` : `${returnedName}`;
      onAdd(token);
      onClose();
      alert(`Category "${returnedName}" added successfully.`);
    } catch (err) {
      setErr(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (idx) => {
    setEditingIndex(idx);
    const token = localList[idx];
    const label = token.includes("|") ? token.split("|")[1] : token;
    setEditValue(label);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const saveEdit = async (idx) => {
    const token = localList[idx];
    const newName = editValue.trim();
    if (!newName) return alert("Name cannot be empty");
    setLoading(true);
    try {
      const ok = await onEditCategory(token, newName);
      if (ok) {
        const newToken = token.includes("|")
          ? `${token.split("|")[0].trim()}|${newName}`
          : newName;
        setLocalList((s) =>
          s.map((v, i) => (i === idx ? newToken : v))
        );
        setEditingIndex(null);
        setEditValue("");
      } else {
        alert("Failed to update category. See console for details.");
      }
    } catch (e) {
      console.error("saveEdit error:", e);
      alert("Failed to update category.");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (idx) => {
    const token = localList[idx];
    if (
      !confirm(
        `Delete category "${
          token.includes("|") ? token.split("|")[1] : token
        }"? This may orphan websites.`
      )
    )
      return;
    setLoading(true);
    try {
      const ok = await onDeleteCategory(token);
      if (ok) {
        setLocalList((s) => s.filter((_, i) => i !== idx));
      } else {
        alert("Failed to delete category. See console for details.");
      }
    } catch (e) {
      console.error("deleteItem error:", e);
      alert("Failed to delete category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-auto max-h-[80vh]">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Manage Categories</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded border text-sm"
            disabled={loading}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4 modal-scroll">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3">
              {err}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Add new category
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
                placeholder="e.g. Mobile, Entertainment"
                disabled={loading}
              />
              <button
                onClick={submit}
                className="px-4 py-2 rounded bg-blue-600 text-white"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Existing categories</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {localList.length === 0 && (
                <div className="text-xs text-gray-400 col-span-full">
                  No categories available.
                </div>
              )}

              {localList.map((token, idx) => {
                const label = token.includes("|")
                  ? token.split("|")[1]
                  : token;
                return (
                  <div
                    key={token + idx}
                    className="p-3 border rounded flex flex-col gap-2 bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingIndex === idx ? (
                          <input
                            value={editValue}
                            onChange={(e) =>
                              setEditValue(e.target.value)
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Category name"
                          />
                        ) : (
                          <div className="text-sm font-medium truncate">
                            {label}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {editingIndex === idx ? (
                          <>
                            <button
                              onClick={() => saveEdit(idx)}
                              disabled={loading}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={loading}
                              className="px-2 py-1 text-xs border rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(idx)}
                              className="px-2 py-1 text-xs border rounded"
                              title="Edit category"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteItem(idx)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                              title="Delete category"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded border"
              disabled={loading}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
