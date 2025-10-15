"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CategoryModal from "./modals/CategoryModal";
import AddModal from "./modals/AddModal";
import EditWebsiteModal from "./modals/EditWebsiteModal";

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

  // ----------------- UPDATED: loop-wrapping gallery step -----------------
  const scrollGalleryByStep = (cardIdx, step) => {
    ensureIndex(cardIdx);
    const track = galleryRefs.current[cardIdx];
    if (!track) return;
    const total = Math.max(1, track.children.length);
    const cur = galleryIndex.current[cardIdx] ?? 0;
    // wrap instead of clamping
    const next = ((cur + step) % total + total) % total;
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
      // wrap on snap instead of clamping for nicer UX:
      const safe = ((idx % totalSlides) + totalSlides) % totalSlides;
      setTrackTransformByIndex(cardIdx, safe);

      setIndices((prev) => ({ ...prev, [cardIdx]: safe }));
    };

    wrapperEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
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

  // ----------------- LIGHTBOX (looping) -----------------
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef(null);

  const openLightbox = (images, index = 0) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    setLightboxIndex(safeIndex);
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

  // looping prev/next
  const prevLightbox = () => {
    setLightboxIndex((i) => {
      const len = Math.max(1, lightboxImages.length);
      return (i - 1 + len) % len;
    });
  };
  const nextLightbox = () => {
    setLightboxIndex((i) => {
      const len = Math.max(1, lightboxImages.length);
      return (i + 1) % len;
    });
  };

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
      Technology: "from-blue-500 to-indigo-500",
      Business: "from-blue-500 to-indigo-500",
      Design: "from-blue-500 to-indigo-500",
      Education: "from-blue-500 to-indigo-500",
      Entertainment: "from-blue-500 to-indigo-500",
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

            const gradient = categoryGradient(label);

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

