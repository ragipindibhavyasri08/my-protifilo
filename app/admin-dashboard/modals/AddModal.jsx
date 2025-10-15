"use client";

import React, { useEffect, useState } from "react";

export default function AddModal({
  open,
  onClose,
  onAdd,
  initialCategory,
  categories,
  onOpenCategoryModal,
}) {
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
    if (photos.length === 0 && photosFiles.length === 0)
      errs.push("At least one photo must be uploaded.");

    if (errs.length) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      let categoryId = extractIdFromToken(categoryName);
      let categoryDisplayName =
        getCategoryNameFromToken(categoryName) || categoryName;

      if (categoryId === undefined) {
        const maybeId = findIdForName(categoryDisplayName);
        if (maybeId !== undefined) {
          categoryId = maybeId;
        }
      }

      if (categoryId === undefined) {
        setErrors([
          "Could not resolve category id for selected category. Please use an existing category (or create one).",
        ]);
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

      const resp = await fetch(
        "https://apirayfogportfolio.nearbydoctors.in/public/api/admin/add-website",
        {
          method: "POST",
          body: formData,
        }
      );

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
        favicon:
          created?.favicon_url ??
          created?.favicon ??
          faviconPreview ??
          undefined,
        category:
          created?.categoryName ??
          created?.category ??
          categoryDisplayName,
        photos: Array.isArray(created?.photos_url)
          ? created.photos_url
          : Array.isArray(created?.photos)
          ? created.photos
          : photos,
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
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md border text-sm"
            disabled={isSubmitting || capturing}
          >
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
              <label className="block text-sm font-medium mb-1">
                Category name *
              </label>
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
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Favicon (required)
              </label>
              <div className="flex gap-2 items-center">
                <label
                  htmlFor="favicon-upload"
                  className="inline-block cursor-pointer px-3 py-2 rounded-md bg-gray-200 text-sm text-gray-700 hover:bg-gray-300"
                >
                  Upload favicon
                </label>
                <input
                  id="favicon-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFaviconFileChange}
                />
              </div>

              {faviconPreview ? (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <img
                    src={faviconPreview}
                    alt="favicon"
                    className="w-8 h-8 object-cover rounded-sm border"
                  />
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-400">
                  No favicon selected
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Context (snippet)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full px-3 py-2 border rounded h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Photos (optional)
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotosChange}
              />
              <label
                htmlFor="photo-upload"
                className="inline-block cursor-pointer px-4 py-2 rounded-md bg-gray-200 text-sm text-gray-700 hover:bg-gray-300"
              >
                Choose Images
              </label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`photo-${i}`}
                    className="w-20 h-16 object-cover rounded border"
                  />
                ))}
                {photos.length === 0 && (
                  <div className="text-xs text-gray-400 mt-2">
                    No photos selected
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border"
              disabled={isSubmitting || capturing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={validateAndSubmit}
              className="px-4 py-2 rounded-md bg-blue-600 text-white"
              disabled={isSubmitting || capturing}
            >
              {isSubmitting ? "Adding..." : "Add website"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
