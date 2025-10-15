"use client";

import React, { useState, useEffect, useRef } from "react";

export default function EditWebsiteModal({ open, onClose, item, categories, onConfirm }) {
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

  // 🧩 Utility functions
  const normalizePhotoPath = (p) => {
    if (!p) return p;
    if (p.startsWith("photos/")) return p;
    try {
      const u = new URL(p);
      let pathname = u.pathname || "";
      const pubIdx = pathname.indexOf("/public/storage/");
      const storIdx = pathname.indexOf("/storage/");
      let cleaned = pathname;
      if (pubIdx >= 0) cleaned = pathname.slice(pubIdx + "/public/".length);
      else if (storIdx >= 0) cleaned = pathname.slice(storIdx + 1);
      else cleaned = pathname.replace(/^\/+/, "");
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
      errs.push("URL or at least one photo is required");
    } else if (hasUrl && !isValidUrl(url.trim())) {
      fErrs["url"] = "Invalid URL format";
      errs.push("Invalid URL");
    }
    if (!getCategoryNameFromToken(categoryToken).trim()) {
      fErrs["category"] = "Category is required";
      errs.push("Category is required");
    }
    if (!snippet.trim()) {
      fErrs["snippet"] = "Snippet is required";
      errs.push("Snippet is required");
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
        if (photosFiles && photosFiles.length > 0) {
          photosFiles.forEach((f) => form.append("photos[]", f));
        }
        const resp = await fetch(
          `https://apirayfogportfolio.nearbydoctors.in/public/api/admin/update-website/${id}`,
          { method: "POST", body: form }
        );
        if (!resp.ok) throw new Error(`Failed to update (status ${resp.status})`);
      }

      onConfirm(updated);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setErrors([String(err)]);
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
                  //clearFieldError("category");
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
                //   clearFieldError("title");
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
                //   clearFieldError("url");
                //   clearFieldError("urlOrPhotos");
                //   clearFieldError("photos");
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
                //   clearFieldError("snippet");
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
  )
}
