"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export const STATIC_WEBSITES = [];

export const getWebsitesByCategory = (category, list) =>
  category === "All" ? list : list.filter((w) => w.category === category);

export const searchWebsites = (query = "", category = "All", list = STATIC_WEBSITES) => {
  const websitesToSearch = getWebsitesByCategory(category, list);
  if (!query.trim()) return websitesToSearch;
  const term = query.toLowerCase();
  return websitesToSearch.filter(
    (w) =>
      w.title.toLowerCase().includes(term) ||
      (w.snippet ?? "").toLowerCase().includes(term) ||
      (w.category ?? "").toLowerCase().includes(term)
  );
};

function CategoryModal({
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
      const resp = await fetch("https://apirayfogportfolio.nearbydoctors.in/public/api/admin/add-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      try {
        data = await resp.json();
      } catch {}
      if (!resp.ok) {
        const msg = data?.message ?? data?.error ?? `Request failed (${resp.status})`;
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
        const newToken = token.includes("|") ? `${token.split("|")[0].trim()}|${newName}` : newName;
        setLocalList((s) => s.map((v, i) => (i === idx ? newToken : v)));
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
    if (!confirm(`Delete category "${token.includes("|") ? token.split("|")[1] : token}"? This may orphan websites.`)) return;
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
          <button type="button" onClick={onClose} className="px-2 py-1 rounded border text-sm" disabled={loading}>
            Close
          </button>
        </div>

        <div className="p-4 space-y-4 modal-scroll">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3">{err}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Add new category</label>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-3 py-2 border rounded" placeholder="e.g. Mobile, Entertainment" disabled={loading} />
              <button onClick={submit} className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading}>{loading ? "Adding..." : "Add"}</button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Existing categories</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {localList.length === 0 && <div className="text-xs text-gray-400 col-span-full">No categories available.</div>}

              {localList.map((token, idx) => {
                const label = token.includes("|") ? token.split("|")[1] : token;
                return (
                  <div key={token + idx} className="p-3 border rounded flex flex-col gap-2 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingIndex === idx ? (
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Category name"
                          />
                        ) : (
                          <div className="text-sm font-medium truncate">{label}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {editingIndex === idx ? (
                          <>
                            <button onClick={() => saveEdit(idx)} disabled={loading} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Save</button>
                            <button onClick={cancelEdit} disabled={loading} className="px-2 py-1 text-xs border rounded">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(idx)} className="px-2 py-1 text-xs border rounded" title="Edit category">Edit</button>
                            <button onClick={() => deleteItem(idx)} className="px-2 py-1 text-xs bg-red-600 text-white rounded" title="Delete category">Delete</button>
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
            <button type="button" onClick={onClose} className="px-3 py-2 rounded border" disabled={loading}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddModal({ open, onClose, onAdd, initialCategory, categories, onOpenCategoryModal }) {
  const [categoryName, setCategoryName] = useState(initialCategory || "");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [faviconPreview, setFaviconPreview] = useState(undefined);
  const [faviconFile, setFaviconFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photosFiles, setPhotosFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) {
      setCategoryName(initialCategory || "");
      setTitle("");
      setUrl("");
      setContext("");
      setFaviconPreview(undefined);
      setFaviconFile(null);
      setPhotos([]);
      setPhotosFiles([]);
      setErrors([]);
      setIsSubmitting(false);
      setCapturing(false);
    } else {
      setCategoryName(initialCategory || "");
    }
  }, [open, initialCategory]);

  const handlePhotosChange = (e) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = [];
    const readers = [];
    Array.from(files).forEach((file) => {
      newFiles.push(file);
      readers.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      );
    });
    Promise.all(readers)
      .then((results) => {
        setPhotos((prev) => [...prev, ...results]);
        setPhotosFiles((prev) => [...prev, ...newFiles]);
      })
      .catch((err) => console.error("Error reading photo files:", err));
  };

  const handleFaviconFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFaviconFile(file);
    const reader = new FileReader();
    reader.onload = () => setFaviconPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const extractIdFromToken = (token) => {
    if (!token) return undefined;
    if (token.includes("|")) {
      const parts = token.split("|");
      const idPart = parts[0].trim();
      if (/^\d+$/.test(idPart)) return Number(idPart);
    }
    return undefined;
  };
  const getCategoryNameFromToken = (token) => {
    if (!token) return "";
    if (token.includes("|")) return token.split("|").slice(1).join("|").trim();
    return token;
  };
  const findIdForName = (name) => {
    if (!name) return undefined;
    for (const c of categories) {
      if (c.includes("|")) {
        const [, rest] = c.split("|").map((s) => s.trim());
        if (rest.toLowerCase() === name.toLowerCase()) {
          const id = extractIdFromToken(c);
          if (id !== undefined) return id;
        }
      } else {
        if (c.toLowerCase() === name.toLowerCase()) {
          return undefined;
        }
      }
    }
    return undefined;
  };

  const validateAndSubmit = async () => {
    const errs = [];

    if (!categoryName.trim()) errs.push("Category name is required.");
    if (!title.trim()) errs.push("Title is required.");
    if (!url.trim()) errs.push("Website URL is required.");
    if (!context.trim()) errs.push("Description is required.");
    if (!faviconFile) errs.push("Favicon file is required.");
    if (photos.length === 0 && photosFiles.length === 0) errs.push("At least one photo must be uploaded.");

    if (errs.length) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      let categoryId = extractIdFromToken(categoryName);
      let categoryDisplayName = getCategoryNameFromToken(categoryName) || categoryName;

      if (categoryId === undefined) {
        const maybeId = findIdForName(categoryDisplayName);
        if (maybeId !== undefined) {
          categoryId = maybeId;
        }
      }

      if (categoryId === undefined) {
        setErrors(["Could not resolve category id for selected category. Please use an existing category (or create one)."]);
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("categoryId", String(categoryId));
      formData.append("title", title.trim());
      formData.append("weburl", url.trim());
      formData.append("conext", context.trim());

      if (faviconFile) formData.append("favicon", faviconFile);

      if (photosFiles.length > 0) {
        photosFiles.forEach((f) => formData.append("photos[]", f));
      } else if (photos.length > 0) {
        formData.append("photos_base64", JSON.stringify(photos));
      }

      const resp = await fetch("https://apirayfogportfolio.nearbydoctors.in/public/api/admin/add-website", {
        method: "POST",
        body: formData,
      });

      let result = null;
      try {
        result = await resp.json();
      } catch (e) {
        console.warn("Could not parse JSON response", e);
      }

      const success =
        resp.ok ||
        result?.status === true ||
        result?.success === true ||
        (result?.data && (result.data.id || result.data.name)) ||
        resp.status === 201;

      if (!success) {
        let msg = `Request failed (${resp.status})`;
        if (result?.message) msg = result.message;
        else if (result?.error) msg = result.error;
        setErrors([msg]);
        alert("Failed to add website: " + msg);
        setIsSubmitting(false);
        return;
      }

      const created = result?.data ?? result ?? null;
      const createdItem = {
        title: created?.title ?? title.trim(),
        url: created?.weburl ?? url.trim(),
        snippet: created?.conext ?? context.trim(),
        favicon: created?.favicon_url ?? created?.favicon ?? faviconPreview ?? undefined,
        category: created?.categoryName ?? created?.category ?? categoryDisplayName,
        photos: Array.isArray(created?.photos_url) ? created.photos_url : Array.isArray(created?.photos) ? created.photos : photos,
        id: created?.id ?? created?.data?.id ?? undefined,
      };

      onAdd(createdItem);
      onClose();
      alert("Website added successfully.");
    } catch (err) {
      console.error("AddModal unexpected error:", err);
      setErrors([err?.message ?? "Unexpected error"]);
      alert("Unexpected error: " + (err?.message ?? "unknown"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Website</h3>
          <button type="button" onClick={onClose} className="px-3 py-1 rounded-md border text-sm" disabled={isSubmitting || capturing}>
            Close
          </button>
        </div>

        <div className="p-6 space-y-4 modal-scroll">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              <ul className="list-disc pl-5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category name *</label>
              <div className="relative">
                <select
                  value={categoryName}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__CREATE_NEW__") {
                      onOpenCategoryModal();
                      setCategoryName("");
                    } else {
                      setCategoryName(v);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded bg-white"
                >
                  <option value="">Select a category...</option>
                  {categories.map((c) => {
                    const val = c;
                    const label = c.includes("|") ? c.split("|")[1] : c;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="https://example.com (optional)" />
              <p className="text-xs text-gray-400 mt-1">Server capture preferred; client capture fallback.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Favicon (required)</label>
              <div className="flex gap-2 items-center">
                <label htmlFor="favicon-upload" className="inline-block cursor-pointer px-3 py-2 rounded-md bg-gray-200 text-sm text-gray-700 hover:bg-gray-300">
                  Upload favicon
                </label>
                <input id="favicon-upload" type="file" accept="image/*" className="hidden" onChange={handleFaviconFileChange} />
              </div>

              {faviconPreview ? (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-gray-500">Favicon preview:</span>
                  <div className="mt-1 inline-block align-middle">
                    <img src={faviconPreview} alt="favicon preview" className="w-8 h-8 object-cover rounded-sm border" />
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-400">No favicon selected</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Context (snippet)</label>
              <textarea value={context} onChange={(e) => setContext(e.target.value)} className="w-full px-3 py-2 border rounded h-24" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Photos {url ? "(optional)" : "(required if no URL)"}</label>

              <input id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
              <label htmlFor="photo-upload" className="inline-block cursor-pointer px-4 py-2 rounded-md bg-gray-200 text-sm text-gray-700 hover:bg-gray-300">
                Choose Images
              </label>

              <div className="mt-2 flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} alt={`photo-${i}`} className="w-20 h-16 object-cover rounded border" />
                  </div>
                ))}
                {photos.length === 0 && <div className="text-xs text-gray-400 mt-2">No photos selected</div>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3	pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border" disabled={isSubmitting || capturing}>
              Cancel
            </button>
            <button type="button" onClick={validateAndSubmit} className="px-4 py-2 rounded-md bg-blue-600 text-white" disabled={isSubmitting || capturing}>
              {isSubmitting ? "Adding..." : "Add website"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditWebsiteModal({ open, onClose, item, categories, onConfirm }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [snippet, setSnippet] = useState("");
  const [categoryToken, setCategoryToken] = useState("");
  const [faviconPreview, setFaviconPreview] = useState(undefined);
  const [faviconFile, setFaviconFile] = useState(null);

  const [photosPreview, setPhotosPreview] = useState([]);
  const [photosFiles, setPhotosFiles] = useState([]);

  const [photosToRemove, setPhotosToRemove] = useState([]);
  const [faviconRemoved, setFaviconRemoved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [errors, setErrors] = useState([]);

  const [fieldErrors, setFieldErrors] = useState({});

  const originalPhotosRef = useRef([]);

  const normalizePhotoPath = (p) => {
    if (!p) return p;
    if (p.startsWith("photos/")) return p;
    try {
      const u = new URL(p);
      let pathname = u.pathname || "";
      const pubIdx = pathname.indexOf("/public/storage/");
      const storIdx = pathname.indexOf("/storage/");
      let cleaned = pathname;
      if (pubIdx >= 0) {
        cleaned = pathname.slice(pubIdx + "/public/".length);
      } else if (storIdx >= 0) {
        cleaned = pathname.slice(storIdx + 1);
      } else {
        cleaned = pathname.replace(/^\/+/, "");
      }
      if (cleaned.startsWith("storage/")) cleaned = cleaned.replace(/^storage\//, "");
      return cleaned;
    } catch {
      let s = p.replace(/^\/+/, "");
      if (s.startsWith("public/storage/")) s = s.replace(/^public\/storage\//, "");
      if (s.startsWith("storage/")) s = s.replace(/^storage\//, "");
      return s;
    }
  };

  useEffect(() => {
    if (!open) {
      setTitle("");
      setUrl("");
      setSnippet("");
      setCategoryToken("");
      setFaviconPreview(undefined);
      setFaviconFile(null);
      setPhotosPreview([]);
      setPhotosFiles([]);
      setPhotosToRemove([]);
      setFaviconRemoved(false);
      originalPhotosRef.current = [];
      setErrors([]);
      setFieldErrors({});
      setLoading(false);
      setCapturing(false);
      return;
    }
    if (item) {
      setTitle(item.title ?? "");
      setUrl(item.url ?? "");
      setSnippet(item.snippet ?? "");
      const foundToken = categories.find((t) => {
        const label = t.includes("|") ? t.split("|")[1] : t;
        return label === (item.category ?? "");
      });
      setCategoryToken(foundToken ?? item.category ?? "");
      setFaviconPreview(item.favicon ?? undefined);
      setFaviconFile(null);

      const orig = Array.isArray(item.photos) ? item.photos.slice(0) : [];
      originalPhotosRef.current = orig.slice();
      setPhotosPreview(orig.slice());
      setPhotosFiles([]);
      setPhotosToRemove([]);
      setFaviconRemoved(false);
      setErrors([]);
      setFieldErrors({});
    }
  }, [open, item, categories]);

  const extractIdFromToken = (token) => {
    if (!token) return undefined;
    if (token.includes("|")) {
      const parts = token.split("|");
      const idPart = parts[0].trim();
      if (/^\d+$/.test(idPart)) return Number(idPart);
    }
    return undefined;
  };

  const getCategoryNameFromToken = (token) => {
    if (!token) return "";
    if (token.includes("|")) return token.split("|").slice(1).join("|").trim();
    return token;
  };

  const isValidUrl = (u) => {
    if (!u) return false;
    try {
      const parsed = new URL(u);
      return !!parsed.protocol && !!parsed.hostname;
    } catch {
      return false;
    }
  };

  const handleFaviconFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setFaviconRemoved(false);
    setFaviconFile(file);
    const reader = new FileReader();
    reader.onload = () => setFaviconPreview(reader.result);
    reader.readAsDataURL(file);

    setFieldErrors((p) => {
      const c = { ...p };
      delete c["favicon"];
      return c;
    });
  };

  const removeFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview(undefined);
    setFaviconRemoved(true);
  };

  const handlePhotosChange = (e) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = [];
    const readers = [];
    Array.from(files).forEach((file) => {
      newFiles.push(file);
      readers.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      );
    });
    Promise.all(readers)
      .then((results) => {
        setPhotosPreview((prev) => [...prev, ...results]);
        setPhotosFiles((prev) => [...prev, ...newFiles]);

        setFieldErrors((p) => {
          const c = { ...p };
          delete c["photos"];
          delete c["url"];
          delete c["urlOrPhotos"];
          return c;
        });
      })
      .catch((err) => console.error("Error reading photo files:", err));
  };

  const removePhotoAt = (index) => {
    const originalCount = originalPhotosRef.current.length;
    const previewItem = photosPreview[index];

    const isOriginal = originalPhotosRef.current.includes(previewItem);

    if (isOriginal) {
      setPhotosToRemove((prev) => {
        const normalized = normalizePhotoPath(previewItem);
        const set = new Set(prev.map((p) => normalizePhotoPath(p)));
        set.add(normalized);
        return Array.from(set);
      });

      setPhotosPreview((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newIndex = index - originalCount;
      if (newIndex >= 0 && newIndex < photosFiles.length) {
        setPhotosFiles((prev) => prev.filter((_, i) => i !== newIndex));
      }
      setPhotosPreview((prev) => prev.filter((_, i) => i !== index));
    }

    setFieldErrors((p) => {
      const c = { ...p };
      if (photosPreview.length - 1 > 0 || url.trim() !== "") {
        delete c["photos"];
        delete c["url"];
        delete c["urlOrPhotos"];
      }
      return c;
    });
  };

  const clearFieldError = (field) => {
    setFieldErrors((p) => {
      const c = { ...p };
      delete c[field];
      return c;
    });
    setErrors([]);
  };

  const validate = () => {
    const errs = [];
    const fErrs = {};

    if (!title.trim()) {
      fErrs["title"] = "Title is required";
      errs.push("Title is required");
    }

    const hasPhotos = photosPreview.length > 0;
    const hasUrl = url.trim() !== "";

    if (!hasUrl && !hasPhotos) {
      fErrs["urlOrPhotos"] = "Provide a URL or at least one photo";
      fErrs["url"] = "URL or at least one photo is required";
      fErrs["photos"] = "URL or at least one photo is required";
      errs.push("URL or at least one photo is required");
    } else if (hasUrl && url.trim() !== "" && !isValidUrl(url.trim())) {
      fErrs["url"] = "URL looks invalid (use full URL like https://example.com)";
      errs.push("URL looks invalid");
    }

    if (!getCategoryNameFromToken(categoryToken).trim()) {
      fErrs["category"] = "Category is required";
      errs.push("Category is required");
    }

    if (!snippet.trim()) {
      fErrs["snippet"] = "Context / Snippet is required";
      errs.push("Context / Snippet is required");
    }

    setFieldErrors(fErrs);
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const updated = {
        title: title.trim(),
        url: url.trim(),
        snippet: snippet.trim(),
        category: getCategoryNameFromToken(categoryToken),
        photos: photosPreview.slice(0),
        favicon: faviconPreview,
        id: item?.id,
      };

      const id = item?.id;
      if (id !== undefined) {
        try {
          const form = new FormData();

          form.append("id", String(id));
          form.append("title", updated.title);
          form.append("weburl", updated.url);
          form.append("conext", updated.snippet);

          const tokenId = extractIdFromToken(categoryToken);
          if (tokenId !== undefined) form.append("categoryId", String(tokenId));
          else form.append("category", getCategoryNameFromToken(categoryToken));

          if (faviconFile) form.append("favicon", faviconFile);

          if (faviconRemoved) form.append("remove_favicon", "1");

          if (photosToRemove && photosToRemove.length > 0) {
            const uniqueNormalized = Array.from(
              new Set(photosToRemove.map((p) => normalizePhotoPath(p)))
            ).filter(Boolean);

            uniqueNormalized.forEach((path) => {
              form.append("delete_photos[]", path);
            });
          }

          if (photosFiles && photosFiles.length > 0) {
            photosFiles.forEach((f) => form.append("photos[]", f));
          } else {
            if (Array.isArray(updated.photos) && updated.photos.length > 0) {
              form.append("photos_base64", JSON.stringify(updated.photos));
            }
          }

          const resp = await fetch(
            `https://apirayfogportfolio.nearbydoctors.in/public/api/admin/update-website/${id}`,
            {
              method: "POST",
              body: form,
            }
          );

          if (!resp.ok) {
            let j = null;
            try {
              j = await resp.json();
            } catch {}
            console.warn("edit-website API non-ok", resp.status, j);
            setErrors([j?.message ?? `Update failed (${resp.status})`]);
          } else {
            let j = null;
            try {
              j = await resp.json();
            } catch {}
            const data = j?.data ?? j;
            if (data) {
              updated.title = data.title ?? updated.title;
              updated.url = data.weburl ?? updated.url;
              updated.snippet = data.conext ?? updated.snippet;
              updated.category = data.categoryName ?? updated.category;
              if (Array.isArray(data.photos_url)) updated.photos = data.photos_url;
              if (data?.favicon_url) updated.favicon = data.favicon_url;
              updated.id = data?.id ?? updated.id;
            }
          }
        } catch (apiErr) {
          console.warn("edit-website API error:", apiErr);
          setErrors([String(apiErr)]);
        }
      }

      onConfirm(updated);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Website</h3>
          <button type="button" onClick={onClose} className="px-2 py-1 rounded border text-sm" disabled={loading || capturing}>
            Close
          </button>
        </div>

        <div className="p-6 space-y-4 modal-scroll">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              <ul className="list-disc pl-5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={categoryToken}
                onChange={(e) => {
                  setCategoryToken(e.target.value);
                  clearFieldError("category");
                }}
                className={`w-full px-3 py-2 border rounded bg-white ${fieldErrors["category"] ? "border-red-500" : ""}`}
              >
                <option value="">Select a category...</option>
                {categories.map((c) => {
                  const val = c;
                  const label = c.includes("|") ? c.split("|")[1] : c;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {fieldErrors["category"] && <div className="mt-1 text-xs text-red-600">{fieldErrors["category"]}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearFieldError("title");
                }}
                className={`w-full px-3 py-2 border rounded ${fieldErrors["title"] ? "border-red-500" : ""}`}
              />
              {fieldErrors["title"] && <div className="mt-1 text-xs text-red-600">{fieldErrors["title"]}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  clearFieldError("url");
                  clearFieldError("urlOrPhotos");
                  clearFieldError("photos");
                }}
                className={`w-full px-3 py-2 border rounded ${fieldErrors["url"] ? "border-red-500" : ""}`}
                placeholder="https://example.com"
              />
              {fieldErrors["url"] && <div className="mt-1 text-xs text-red-600">{fieldErrors["url"]}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Favicon</label>
              <div className="flex gap-2 items-center">
                <label htmlFor="edit-favicon-upload" className="inline-block cursor-pointer px-3 py-2 rounded-md bg-gray-200 text-sm text-gray-700 hover:bg-gray-300">
                  Choose favicon
                </label>
                <input id="edit-favicon-upload" type="file" accept="image/*" className="hidden" onChange={handleFaviconFileChange} />
                {(faviconPreview || (!faviconPreview && !faviconFile && !faviconRemoved && item?.favicon)) && (
                  <button type="button" onClick={removeFavicon} className="px-2 py-1 text-xs border rounded ml-2">Remove</button>
                )}
              </div>
              {faviconPreview ? (
                <div className="mt-2 flex items-center gap-3">
                  <img src={faviconPreview} alt="favicon preview" className="w-8 h-8 object-cover rounded-sm border" />
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-400">No favicon selected</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Context / Snippet *</label>
              <textarea
                value={snippet}
                onChange={(e) => {
                  setSnippet(e.target.value);
                  clearFieldError("snippet");
                }}
                className={`w-full px-3 py-2 border rounded h-28 ${fieldErrors["snippet"] ? "border-red-500" : ""}`}
              />
              {fieldErrors["snippet"] && <div className="mt-1 text-xs text-red-600">{fieldErrors["snippet"]}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Photos</label>
              <input id="edit-photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
              <label htmlFor="edit-photo-upload" className={`inline-block cursor-pointer px-4 py-2 rounded-md bg-gray-200 text-sm text-gray-700 hover:bg-gray-300 ${fieldErrors["photos"] ? "border border-red-500" : ""}`}>
                Choose Images
              </label>

              <div className="mt-2 flex gap-2 flex-wrap">
                {photosPreview.map((p, i) => (
                  <div key={i} className="relative border rounded overflow-hidden">
                    <img src={p} alt={`photo-${i}`} className="w-32 h-20 object-cover" />
                    <div className="p-1 flex gap-1 justify-center">
                      <button type="button" onClick={() => removePhotoAt(i)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Remove</button>
                    </div>
                  </div>
                ))}
                {photosPreview.length === 0 && <div className="text-xs text-gray-400 mt-2">No photos</div>}
              </div>
              {fieldErrors["photos"] && <div className="mt-1 text-xs text-red-600">{fieldErrors["photos"]}</div>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border" disabled={loading || capturing}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-600 text-white" disabled={loading || capturing}>
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteWebsiteModal({ open, onClose, item, onConfirm }) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);
  if (!open) return null;
  const label = item?.title ?? item?.url ?? "this website";
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Delete Website</h3>
          <button type="button" onClick={onClose} className="px-2 py-1 rounded border text-sm" disabled={loading}>Close</button>
        </div>

        <div className="p-4">
          <p className="mb-4">Are you sure you want to delete <strong>{label}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded border" disabled={loading}>Cancel</button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  const id = item?.id;
                  if (id !== undefined) {
                    try {
                      const resp = await fetch(`https://apirayfogportfolio.nearbydoctors.in/public/api/admin/delete-website/${id}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id }),
                      });
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
              }}
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

export default function Page() {
  const router = useRouter();

  const [isAuthed, setIsAuthed] = useState(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [list, setList] = useState(STATIC_WEBSITES);
  const [addOpen, setAddOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState(undefined);

  const [categoriesState, setCategoriesState] = useState(() => {
    const setCat = new Set(["All"]);
    STATIC_WEBSITES.forEach((w) => setCat.add(w.category));
    return Array.from(setCat);
  });

  const [apiCategories, setApiCategories] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [addOnlyCategories, setAddOnlyCategories] = useState([]);
  const [websitesLoading, setWebsitesLoading] = useState(false);
  const [websitesError, setWebsitesError] = useState(null);

  const [editWebsiteOpen, setEditWebsiteOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [deleteWebsiteOpen, setDeleteWebsiteOpen] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState(null);

  const [viewWebsiteOpen, setViewWebsiteOpen] = useState(false);
  const [viewingWebsite, setViewingWebsite] = useState(null);

  const [indices, setIndices] = useState({});

  const filtered = useMemo(() => searchWebsites(search, activeCategory, list), [search, activeCategory, list]);

  useEffect(() => {
    const savedCategory = localStorage.getItem("activeCategory");
    if (savedCategory) {
      setActiveCategory(savedCategory);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("activeCategory", activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    try {
      const authed = sessionStorage.getItem("isAdminAuthenticated") === "true";
      setIsAuthed(authed);
      if (!authed) {
        router.replace("/admin");
      }
    } catch {
      setIsAuthed(false);
      router.replace("/admin");
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    fetchCategoriesFromApi();
    fetchWebsitesByCategory("All");
  }, [isAuthed]);

  async function fetchCategoriesFromApi() {
    setApiLoading(true);
    setApiError(null);
    try {
      const resp = await fetch("https://apirayfogportfolio.nearbydoctors.in/public/api/admin/list-category", { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!resp.ok) {
        let msg = `Request failed (${resp.status})`;
        try {
          const d = await resp.json();
          if (d?.message) msg = d.message;
        } catch {}
        setApiError(msg);
        setApiCategories([]);
        return;
      }
      const data = await resp.json();
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data?.data)) items = data.data;
      else if (Array.isArray(data?.categories)) items = data.categories;

      const tokens = items
        .map((it) => {
          const id = it?.id ?? it?.categoryId ?? it?.value;
          const name = it?.name ?? it?.title ?? it?.label ?? it?.category ?? String(it);
          if (id !== undefined && id !== null) return `${String(id)}|${String(name)}`;
          return String(name);
        })
        .filter(Boolean);

      setApiCategories((prev) => {
        const set = new Set([...prev, ...tokens]);
        return Array.from(set);
      });

      setCategoriesState((prev) => {
        const copy = [...prev];
        tokens.forEach((t) => {
          const name = t.includes("|") ? t.split("|")[1] : t;
          if (!copy.includes(name)) copy.push(name);
        });
        return copy;
      });
    } catch (err) {
      setApiError(err?.message ?? "Unexpected error fetching categories");
      setApiCategories([]);
    } finally {
      setApiLoading(false);
    }
  }

  async function fetchWebsitesByCategory(tokenOrName) {
    setWebsitesLoading(true);
    setWebsitesError(null);

    let categoryId;
    let categoryNameForFilter;

    if (!tokenOrName || tokenOrName === "All") {
      categoryId = undefined;
      categoryNameForFilter = undefined;
    } else if (tokenOrName.includes("|")) {
      const parts = tokenOrName.split("|");
      const idPart = parts[0].trim();
      const namePart = parts.slice(1).join("|").trim();
      if (/^\d+$/.test(idPart)) categoryId = Number(idPart);
      categoryNameForFilter = namePart;
    } else {
      categoryNameForFilter = tokenOrName;
    }

    const serverEndpoint = "https://apirayfogportfolio.nearbydoctors.in/public/api/admin/list-website";

    const normalizeItem = (it) => {
      const title = it?.title ?? it?.name ?? it?.label ?? "";
      const url = it?.weburl ?? it?.url ?? it?.website ?? "";
      const favicon = it?.favicon_url ?? it?.favicon ?? it?.faviconUrl ?? undefined;
      const photos = Array.isArray(it?.photos_url)
        ? it.photos_url
        : Array.isArray(it?.photos)
        ? it.photos
        : it?.photos_url && typeof it.photos_url === "string"
        ? [it.photos_url]
        : [];
      const snippet = it?.conext ?? it?.context ?? it?.snippet ?? it?.description ?? "";
      const category = it?.categoryName ?? it?.category_name ?? it?.category ?? it?.cat ?? "";
      const id = it?.id ?? it?.websiteId ?? undefined;
      return {
        title: String(title),
        url: String(url),
        snippet: String(snippet),
        favicon: favicon ? String(favicon) : undefined,
        category: String(category ?? ""),
        photos: photos.map(String),
        id,
      };
    };

    const parseListResponse = async (resp) => {
      try {
        const j = await resp.json();
        if (Array.isArray(j)) return j;
        if (Array.isArray(j?.data)) return j.data;
        if (Array.isArray(j?.websites)) return j.websites;
        if (Array.isArray(j?.items)) return j.items;
        if (Array.isArray(j?.data?.items)) return j.data.items;
        if (Array.isArray(j?.data?.rows)) return j.data.rows;
        for (const k of Object.keys(j)) {
          if (Array.isArray(j[k])) return j[k];
        }
        if (j && typeof j === "object") return [j];
      } catch (jsonErr) {
        console.warn("Response was not JSON:", jsonErr);
      }
      return [];
    };

    const buildCandidates = () => {
      const urls = [];
      if (categoryId !== undefined) {
        urls.push(`${serverEndpoint}?categoryId=${encodeURIComponent(String(categoryId))}`);
        urls.push(`${serverEndpoint}?category_id=${encodeURIComponent(String(categoryId))}`);
        urls.push(`${serverEndpoint}?cat_id=${encodeURIComponent(String(categoryId))}`);
      }
      if (categoryNameForFilter) {
        urls.push(`${serverEndpoint}?category=${encodeURIComponent(categoryNameForFilter)}`);
        urls.push(`${serverEndpoint}?categoryName=${encodeURIComponent(categoryNameForFilter)}`);
        urls.push(`${serverEndpoint}?cat=${encodeURIComponent(categoryNameForFilter)}`);
      }
      urls.push(serverEndpoint);
      return Array.from(new Set(urls));
    };

    const candidates = buildCandidates();

    for (const candidateUrl of candidates) {
      try {
        const resp = await fetch(candidateUrl, { method: "GET", headers: { "Content-Type": "application/json" } });
        if (!resp.ok) {
          console.warn("candidate fetch non-ok:", candidateUrl, resp.status);
          continue;
        }
        const itemsRaw = await parseListResponse(resp);
        if (!itemsRaw) {
          setList([]);
          setWebsitesLoading(false);
          return;
        }

        let normalized = itemsRaw.map(normalizeItem);

        if ((categoryId === undefined && categoryNameForFilter) || candidateUrl === serverEndpoint) {
          if (categoryNameForFilter) {
            normalized = normalized.filter((it) => (it.category ?? "").trim().toLowerCase() === categoryNameForFilter.trim().toLowerCase());
          }
        }

        setList(normalized);
        setWebsitesLoading(false);
        return;
      } catch (err) {
        console.warn("candidate fetch error:", candidateUrl, err);
      }
    }

    try {
      const respAll = await fetch(serverEndpoint, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!respAll.ok) throw new Error(`Fallback all fetch failed (${respAll.status})`);
      const allRaw = await parseListResponse(respAll);
      const allNormalized = allRaw.map(normalizeItem);
      if (!tokenOrName || tokenOrName === "All") {
        setList(allNormalized);
        setWebsitesLoading(false);
        return;
      }
      const wantedName = tokenOrName.includes("|") ? tokenOrName.split("|").slice(1).join("|").trim() : tokenOrName;
      const filteredItems2 = allNormalized.filter((it) => (it.category ?? "").trim().toLowerCase() === (wantedName ?? "").trim().toLowerCase());
      setList(filteredItems2);
    } catch (finalErr) {
      console.error("Final fallback fetch failed:", finalErr);
      setWebsitesError("Failed to load websites. See console for details.");
    } finally {
      setWebsitesLoading(false);
    }
  }

  const handleAddConfirm = (item) => {
    setList((prev) => [item, ...prev]);
    const cat = item.category?.trim() || "Uncategorized";
    setCategoriesState((prev) => {
      if (prev.includes(cat)) return prev;
      return [...prev, cat];
    });
    setActiveCategory(cat);
    setAddOnlyCategories((prev) => prev.filter((c) => c !== cat));
    fetchCategoriesFromApi();
  };

  const handleWebsiteEditConfirm = (updated) => {
    setList((prev) => {
      const updatedId = updated.id !== undefined ? String(updated.id) : undefined;

      const idx = prev.findIndex((w) => {
        if (updatedId !== undefined && w.id !== undefined) return String(w.id) === updatedId;
        return String(w.url) === String(updated.url) && String(w.title) === String(updated.title);
      });

      if (idx === -1) {
        console.warn("Edited item not found in current list — no local change applied.", updated);
        return prev;
      }

      const copy = prev.slice();
      copy[idx] = { ...copy[idx], ...updated };
      return copy;
    });

    if (updated.category) {
      setCategoriesState((prev) => {
        if (prev.includes(updated.category)) return prev;
        return [...prev, updated.category];
      });
    }
  };

  const handleWebsiteDeleteConfirm = () => {
    const toDelete = deletingWebsite;
    if (!toDelete) return;
    setList((prev) =>
      prev.filter((w) => {
        if (w.id !== undefined && toDelete.id !== undefined) {
          return String(w.id) !== String(toDelete.id);
        }
        return !(w.url === toDelete.url && w.title === toDelete.title);
      })
    );
    setDeletingWebsite(null);
    setDeleteWebsiteOpen(false);
  };

  const handleAddOnlyCategoryAdd = (tokenOrName) => {
    setApiCategories((prev) => {
      const set = new Set(prev);
      set.add(tokenOrName);
      return Array.from(set);
    });

    setAddOnlyCategories((prev) => {
      const set = new Set(prev);
      set.add(tokenOrName);
      return Array.from(set);
    });

    const name = tokenOrName.includes("|") ? tokenOrName.split("|")[1] : tokenOrName;
    setCategoriesState((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  };

  const addModalCategories = (() => {
    const tokensSet = new Set();
    apiCategories.forEach((t) => tokensSet.add(t));
    addOnlyCategories.forEach((t) => tokensSet.add(t));
    categoriesState.forEach((name) => {
      if (name === "All") return;
      const exists = Array.from(tokensSet).some((t) => {
        const label = t.includes("|") ? t.split("|")[1] : t;
        return label === name;
      });
      if (!exists) tokensSet.add(name);
    });
    return Array.from(tokensSet);
  })();

  const openAddWithCategory = (cat) => {
    const token = apiCategories.find((t) => (t.includes("|") ? t.split("|")[1] === cat : t === cat)) ?? cat;
    setInitialCategory(token || undefined);
    setAddOpen(true);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("isAdminAuthenticated");
    } catch {}
    router.replace("/admin");
  };

  function renderChipLabelLocal(c) {
    if (!c) return "";
    return c.includes("|") ? c.split("|").slice(1).join("|").trim() : c;
  }

  async function chipOnClick(c) {
    const name = c.includes("|") ? c.split("|")[1] : c;
    setActiveCategory(name);

    const matchingToken = apiCategories.find((t) => {
      const label = t.includes("|") ? t.split("|")[1] : t;
      return label === name;
    });

    const tokenOrName = matchingToken ?? name;

    try {
      await fetchWebsitesByCategory(tokenOrName);
    } catch (err) {
      console.warn("chipOnClick - fetch failed", err);
      setList((prev) => {
        if (name === "All") return prev;
        return prev.filter((w) => (w.category ?? "").toString().trim().toLowerCase() === name.toLowerCase());
      });
    }
  }

  const apiEditCategory = async (oldTokenOrName, newName) => {
    try {
      let id = undefined;

      if (oldTokenOrName && oldTokenOrName.includes("|")) {
        const parts = oldTokenOrName.split("|");
        const maybeId = parts[0].trim();
        if (maybeId) {
          id = maybeId;
        }
      }

      let resp;
      const base = "https://apirayfogportfolio.nearbydoctors.in/public/api/admin";

      if (id) {
        resp = await fetch(`${base}/update-category/${encodeURIComponent(id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
      } else {
        resp = await fetch(`${base}/update-category`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName: oldTokenOrName, name: newName }),
        });
      }

      let j = null;
      try {
        j = await resp.json();
      } catch {}

      if (!resp.ok) {
        console.warn("edit-category non-ok", resp.status, j);
        return false;
      }

      setApiCategories((prev) => {
        return prev.map((t) => {
          if (t === oldTokenOrName) {
            if (t.includes("|")) {
              const tokenId = t.split("|")[0].trim();
              return `${tokenId}|${newName}`;
            }
            return newName;
          }
          const label = t.includes("|") ? t.split("|")[1] : t;
          if (label === oldTokenOrName && !t.includes("|")) {
            return newName;
          }
          return t;
        });
      });

      setAddOnlyCategories((prev) =>
        prev.map((t) => {
          if (t === oldTokenOrName) {
            if (t.includes("|")) {
              const tokenId = t.split("|")[0].trim();
              return `${tokenId}|${newName}`;
            }
            return newName;
          }
          const label = t.includes("|") ? t.split("|")[1] : t;
          if (label === oldTokenOrName && !t.includes("|")) return newName;
          return t;
        })
      );

      setCategoriesState((prev) =>
        prev.map((n) =>
          n === oldTokenOrName || n === (oldTokenOrName.includes("|") ? oldTokenOrName.split("|")[1] : oldTokenOrName)
            ? newName
            : n
        )
      );

      return true;
    } catch (e) {
      console.error("apiEditCategory error:", e);
      return false;
    }
  };

  const apiDeleteCategory = async (tokenOrName) => {
    try {
      let id = null;
      let name = null;

      if (tokenOrName.includes("|")) {
        const [maybeId, maybeName] = tokenOrName.split("|").map(s => s.trim());
        if (/^\d+$/.test(maybeId)) id = Number(maybeId);
        else name = maybeName || tokenOrName;
      } else if (/^\d+$/.test(tokenOrName)) {
        id = Number(tokenOrName);
      } else {
        name = tokenOrName;
      }

      let deleteUrl = "https://apirayfogportfolio.nearbydoctors.in/public/api/admin/delete-category";
      if (id !== null) {
        deleteUrl += `/${id}`;
      } else if (name !== null) {
        deleteUrl += `?name=${encodeURIComponent(name)}`;
      }

      const resp = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let j = null;
      try { j = await resp.json(); } catch {}

      if (!resp.ok) {
        console.warn("delete-category non-ok", resp.status, j);
        return false;
      }

      setApiCategories(prev => prev.filter(t => t !== tokenOrName));
      setAddOnlyCategories(prev => prev.filter(t => t !== tokenOrName));
      const displayName = tokenOrName.includes("|") ? tokenOrName.split("|")[1].trim() : tokenOrName;
      setCategoriesState(prev => prev.filter(n => n !== displayName));

      return true;
    } catch (e) {
      console.error("apiDeleteCategory error:", e);
      return false;
    }
  };

  const galleryRefs = useRef({});
  const galleryIndex = useRef({});

  const ensureIndex = (idx) => {
    if (galleryIndex.current[idx] === undefined) galleryIndex.current[idx] = 0;
    if (!galleryRefs.current[idx]) galleryRefs.current[idx] = null;
  };

  const setTrackTransformByIndex = (cardIdx, idx) => {
    const track = galleryRefs.current[cardIdx];
    if (!track) return;
    const total = Math.max(1, track.children.length);
    const safeIdx = Math.max(0, Math.min(total - 1, idx));
    track.style.transition = "transform 300ms ease";
    track.style.transform = `translateX(-${safeIdx * 100}%)`;
    galleryIndex.current[cardIdx] = safeIdx;

    setIndices((prev) => {
      if (prev[cardIdx] === safeIdx) return prev;
      return { ...prev, [cardIdx]: safeIdx };
    });
  };

  const scrollGalleryByStep = (cardIdx, step) => {
    ensureIndex(cardIdx);
    const track = galleryRefs.current[cardIdx];
    if (!track) return;
    const total = Math.max(1, track.children.length);
    const cur = galleryIndex.current[cardIdx] ?? 0;
    const next = Math.max(0, Math.min(total - 1, cur + step));
    setTrackTransformByIndex(cardIdx, next);
  };

  const scrollGalleryToIndex = (cardIdx, imageIndex) => {
    ensureIndex(cardIdx);
    setTrackTransformByIndex(cardIdx, imageIndex);
  };

  const attachPointerHandlers = (cardIdx, wrapperEl) => {
    if (!wrapperEl) return;
    if (wrapperEl.__pointerAttached) return;

    const track = wrapperEl.querySelector(".rf-slider-track");
    if (!track) {
      wrapperEl.__pointerAttached = true;
      return;
    }

    ensureIndex(cardIdx);

    let dragging = false;
    let startX = 0;
    let startTranslatePx = 0;
    let containerWidth = wrapperEl.clientWidth || 1;

    const getCurrentTranslatePx = () => {
      const style = window.getComputedStyle(track);
      const matrix = style.transform || "";
      if (!matrix || matrix === "none") return 0;
      const m = matrix.match(/matrix.*\((.+)\)/);
      if (m) {
        const values = m[1].split(",").map((v) => parseFloat(v.trim()));
        if (values.length >= 6) return values[4];
      }
      const m2 = matrix.match(/translateX\((-?\d+\.?\d*)px\)/);
      if (m2) return parseFloat(m2[1]);
      return 0;
    };

    const onPointerDown = (e) => {
      if (e.button && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startTranslatePx = getCurrentTranslatePx();
      containerWidth = wrapperEl.clientWidth || 1;
      track.style.transition = "none";
      try { wrapperEl.setPointerCapture(e.pointerId); } catch {}
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const newTx = startTranslatePx + dx;
      track.style.transform = `translateX(${newTx}px)`;

      const containerW = containerWidth || (wrapperEl.clientWidth || 1);
      const translatePx = newTx;
      const percent = (-translatePx / containerW) * 100;
      const totalSlides = Math.max(1, track.children.length);
      const perSlide = 100;
      const raw = percent / perSlide;
      const liveIdx = Math.max(0, Math.min(totalSlides - 1, Math.round(raw)));

      setIndices((prev) => {
        if (prev[cardIdx] === liveIdx) return prev;
        return { ...prev, [cardIdx]: liveIdx };
      });
    };

    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      try { wrapperEl.releasePointerCapture(e.pointerId); } catch {}
      const finalTx = getCurrentTranslatePx();
      const totalSlides = Math.max(1, track.children.length);
      const percent = (-finalTx / (containerWidth || 1)) * 100;
      const idx = Math.round(percent / 100);
      const safe = Math.max(0, Math.min(totalSlides - 1, idx));
      setTrackTransformByIndex(cardIdx, safe);

      setIndices((prev) => ({ ...prev, [cardIdx]: safe }));
    };

    wrapperEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);

    wrapperEl.__pointerAttached = true;
  };

  useEffect(() => {
    const onResize = () => {
      Object.keys(galleryRefs.current).forEach((k) => {
        const idx = Number(k);
        const track = galleryRefs.current[idx];
        if (!track) return;
        const current = galleryIndex.current[idx] ?? 0;
        setTrackTransformByIndex(idx, current);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setIndices((prev) => {
      const next = { ...prev };
      for (let i = 0; i < filtered.length; i++) {
        if (next[i] === undefined) next[i] = galleryIndex.current[i] ?? 0;
      }
      return next;
    });
  }, [filtered.length]);

  const findTokenByLabel = (label) => {
    if (!label) return undefined;
    return Array.from(new Set([...apiCategories, ...addOnlyCategories])).find((t) => {
      const lbl = t.includes("|") ? t.split("|")[1] : t;
      return lbl === label;
    });
  };

  const gridClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3";

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef(null);

  const openLightbox = (images, index = 0) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(Math.max(0, Math.min(index, images.length - 1)));
    setLightboxOpen(true);
    try { document.body.style.overflow = "hidden"; } catch {}
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    try { document.body.style.overflow = ""; } catch {}
    setTimeout(() => {
      setLightboxImages([]);
      setLightboxIndex(0);
      touchStartX.current = null;
    }, 200);
  };

  const prevLightbox = () =>
    setLightboxIndex((i) => (i > 0 ? i - 1 : i));
  const nextLightbox = () =>
    setLightboxIndex((i) => (i < lightboxImages.length - 1 ? i + 1 : i));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
      if (e.key === "ArrowRight") nextLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, lightboxImages.length]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchMove = (e) => {};
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (endX == null) return;
    const dx = endX - touchStartX.current;
    const threshold = 40;
    if (dx > threshold) prevLightbox();
    else if (dx < -threshold) nextLightbox();
    touchStartX.current = null;
  };

  const renderChipLabel = (c) => (c.includes("|") ? c.split("|").slice(1).join("|").trim() : c);

  const categoryGradient = (label) => {
    if (!label) return "from-blue-500 to-indigo-500";
    const map = {
      All: "from-blue-500 to-indigo-500",
      Technology: "from-green-500 to-emerald-500",
      Business: "from-yellow-500 to-orange-500",
      Design: "from-pink-500 to-rose-500",
      Education: "from-purple-500 to-indigo-500",
      Entertainment: "from-cyan-500 to-sky-500",
    };
    return map[label] ?? "from-blue-500 to-purple-500";
  };

  if (isAuthed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking authentication...</div>
      </div>
    );
  }

  if (isAuthed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Redirecting to sign-in...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <style>{`
        /* WebKit scrollbar (Chrome, Edge, Safari) for overflow-auto and category-scroll */
        .overflow-auto::-webkit-scrollbar, .category-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .overflow-auto::-webkit-scrollbar-thumb, .category-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #3b82f6 0%, #7c3aed 100%);
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        }

        .overflow-auto::-webkit-scrollbar-track, .category-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .overflow-auto:hover::-webkit-scrollbar-thumb, .category-scroll:hover::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #2563eb 0%, #6d28d9 100%);
        }

        .overflow-auto, .category-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(59,130,246,0.9) transparent;
        }

        .category-scroll {
          -webkit-overflow-scrolling: touch;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-behavior: smooth;
          padding-bottom: 8px;
        }

        .modal-scroll { max-height: 70vh; overflow:auto; }

        .category-scroll::-webkit-scrollbar { display: none; }
        .category-scroll { scrollbar-width: none; -ms-overflow-style: none; }

        .category-scroll > div { display: flex; gap: 12px; align-items: center; }
      `}</style>

      <AddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddConfirm}
        initialCategory={initialCategory}
        categories={addModalCategories}
        onOpenCategoryModal={() => setCategoryModalOpen(true)}
      />

      <CategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onAdd={handleAddOnlyCategoryAdd}
        categories={Array.from(new Set([...apiCategories, ...addOnlyCategories]))}
        onEditCategory={apiEditCategory}
        onDeleteCategory={apiDeleteCategory}
      />

      <EditWebsiteModal
        open={editWebsiteOpen}
        onClose={() => { setEditWebsiteOpen(false); setEditingWebsite(null); }}
        item={editingWebsite}
        categories={addModalCategories}
        onConfirm={(updated) => handleWebsiteEditConfirm(updated)}
      />

      <ConfirmDeleteWebsiteModal open={deleteWebsiteOpen} onClose={() => { setDeleteWebsiteOpen(false); setDeletingWebsite(null); }} item={deletingWebsite} onConfirm={handleWebsiteDeleteConfirm} />

      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="rayfog" className="h-18 w-auto" style={{ height: 68 }} />
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <input aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for websites..." className="w-[280px] px-3 py-2 rounded-full border border-gray-200 shadow-sm outline-none text-sm focus:ring-2 focus:ring-indigo-200" />

            <button type="button" className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-300 to-purple-300 font-semibold text-sm shadow">
              Search
            </button>

            <button type="button" onClick={() => openAddWithCategory()} className="px-3 py-2 rounded-md bg-violet-500 text-white font-medium text-sm hover:shadow-md">
              + Add
            </button>

            <button type="button" onClick={() => setCategoryModalOpen(true)} className="px-3 py-2 rounded-md border text-sm">
              Add Category
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="https://rayfog.com/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-md border border-gray-200 text-sm">
            Visit Website
          </a>

          <button type="button" onClick={handleLogout} className="px-3 py-1 rounded-md border text-sm">
            Logout
          </button>
        </div>
      </header>

      <div className="mb-6 category-scroll">
        <div className="flex gap-3 items-center px-1">
          {categoriesState.map((c) => {
            const label = renderChipLabelLocal(c);
            const active = label === activeCategory;
            const tokenMatch = findTokenByLabel(label);

            const colorMap = {
              All: "from-blue-500 to-indigo-500",
              Technology: "from-blue-500 to-indigo-500",
              Business: "from-blue-500 to-indigo-500",
              Design: "from-blue-500 to-indigo-500",
              Education: "from-blue-500 to-indigo-500",
              Entertainment: "from-blue-500 to-indigo-500",
            };
            const gradient = colorMap[label] ?? "from-blue-500 to-purple-500";

            return (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(label);
                  chipOnClick(tokenMatch ?? label);
                }}
                className={`whitespace-nowrap inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-base  shadow-sm transition-all duration-200 
                  ${active
                    ? `bg-gradient-to-r ${gradient} text-white scale-105`
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 hover:scale-105"
                  }`}
                aria-pressed={active}
                aria-label={`Filter by ${label}`}
                title={label}
              >
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="border border-gray-100 rounded-md p-4">
        <div className={gridClass}>
          {filtered.map((item, idx) => {
            const photos = item.photos && item.photos.length > 0 ? item.photos : [];
            const smallIconSrc = item.favicon ?? (photos.length > 0 ? photos[0] : undefined);
            const galleryPhotos = photos.length > 0 ? photos.slice(0) : [];

            if (galleryIndex.current[idx] === undefined) galleryIndex.current[idx] = 0;

            return (
              <article
                key={item.id ?? item.url ?? idx}
                className="group bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{ fontSize: "110%" }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm">
                    {smallIconSrc ? (
                      <img
                        src={smallIconSrc}
                        alt={`${item.title} small`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 bg-gray-200 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base  truncate text-gray-900">
                      {item.title}
                    </h3>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-gray-600 truncate break-words hover:text-blue-600 transition-colors"
                    >
                      {item.url}
                    </a>
                  </div>

                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1">
                    <button
                      title="Edit website"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWebsite(item);
                        setEditWebsiteOpen(true);
                      }}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <span className="text-lg w-6 h-6">✎</span>
                    </button>

                    <button
                      title="Delete website"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingWebsite(item);
                        setDeleteWebsiteOpen(true);
                      }}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <span className="text-lg w-6 h-6">🗑️</span>
                    </button>
                  </div>
                </div>

                {/* Gallery */}
                <div className="p-3">
                  {galleryPhotos.length > 0 ? (
                    <div className="relative">
                      <button
                        aria-label="Prev"
                        onClick={() => scrollGalleryByStep(idx, -1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center 
                                   bg-white/90 rounded-full shadow-md opacity-30 hover:opacity-100 
                                   transition-all duration-300 hover:scale-110 group-hover:opacity-100"
                      >
                        <span className="text-lg font-bold text-gray-700">‹</span>
                      </button>

                      <div
                        ref={(el) => {
                          if (!el) return;
                          const track = el.querySelector(".rf-slider-track");
                          if (track) galleryRefs.current[idx] = track;
                          attachPointerHandlers(idx, el);
                        }}
                        className="overflow-hidden rounded-lg"
                        style={{ width: "100%" }}
                      >
                        <div
                          className="rf-slider-track flex"
                          style={{
                            transform: `translateX(-${(galleryIndex.current[idx] ?? 0) * 100}%)`,
                            transition: "transform 300ms ease",
                          }}
                        >
                         {galleryPhotos.map((p, i) => (
                          <div
                            key={i}
                            className="flex-shrink-0"
                            style={{
                              flex: "0 0 100%",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              padding: 0,
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openLightbox(galleryPhotos, i); }}
                              onPointerDown={(e) => {  e.stopPropagation(); }}
                              className="w-full h-48 rounded-md overflow-hidden p-0 border-0 bg-transparent cursor-pointer"
                              aria-label={`Open image ${i + 1}`}
                              style={{ pointerEvents: "auto" }}
                            >
                              <img
                                src={p}
                                alt={`${item.title} photo ${i}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                                draggable={false}
                              />
                            </button>
                          </div>
                        ))}
                        </div>
                      </div>

                      <button
                        aria-label="Next"
                        onClick={() => scrollGalleryByStep(idx, 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center 
                                   bg-white/90 rounded-full shadow-md opacity-30 hover:opacity-100 
                                   transition-all duration-300 hover:scale-110 group-hover:opacity-100"
                      >
                        <span className="text-lg font-bold text-gray-700">›</span>
                      </button>

                      <div className="flex justify-center gap-1 mt-2">
                        {galleryPhotos.map((_, dotIdx) => {
                          const activeDot = (indices[idx] ?? galleryIndex.current[idx] ?? 0) === dotIdx;
                          return (
                            <button
                              key={dotIdx}
                              onClick={() => scrollGalleryToIndex(idx, dotIdx)}
                              className={`w-2.5 h-2.5 rounded-full ${activeDot ? "bg-blue-600" : "bg-gray-300"}`}
                              aria-label={`Go to image ${dotIdx + 1}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">No gallery images</div>
                  )}
                </div>

                <div className="p-3 flex items-center justify-between gap-3 text-sm text-gray-700">
                  <p
                    className="flex-1 text-gray-600 leading-snug text-sm truncate"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.snippet || "No description available."}
                  </p>

                  {item.category && (
                    <span className="shrink-0 inline-block px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
                      {item.category}
                    </span>
                  )}
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 text-sm">
              No results found
            </div>
          )}
        </div>
      </section>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <div
            className="relative w-full flex items-center justify-center"
            style={{ maxWidth: "50vw", maxHeight: "90vh", minWidth: "320px" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <button
              onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
              aria-label="Previous image"
              className="absolute left-0 top-0 bottom-0 z-40 flex items-center justify-center w-1/4"
              style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.12), transparent)" }}
            >
              <span className="text-3xl text-white select-none">‹</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
              aria-label="Next image"
              className="absolute right-0 top-0 bottom-0 z-40 flex items-center justify-center w-1/4"
              style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.12), transparent)" }}
            >
              <span className="text-3xl text-white select-none">›</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
              aria-label="Close"
              className="absolute top-2 right-2 z-50 rounded-full bg-black/40 text-white p-2 shadow"
              style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span className="text-lg font-bold">✕</span>
            </button>

            <div
              className="bg-black flex items-center justify-center rounded-md overflow-hidden"
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                maxHeight: "90vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Preview ${lightboxIndex + 1}`}
                className="w-full h-full object-cover select-none"
                style={{
                  objectPosition: "center",
                }}
                draggable={false}
              />
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 text-white text-sm bg-black/40 px-3 py-1 rounded">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderChipLabel(c) {
  if (!c) return "";
  return c.includes("|") ? c.split("|").slice(1).join("|").trim() : c;
}
