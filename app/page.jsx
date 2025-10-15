"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import LightboxPortal from "./LightboxPortal";

/* --------------------------
   (MINIMIZED) normalize helper
   -------------------------- */
export const STATIC_WEBSITES = [];

const renderChipLabel = (c) =>
  c && c.includes("|") ? c.split("|").slice(1).join("|").trim() : c;

const normalizeApiItem = (it) => {
  const title = it?.title ?? it?.name ?? it?.label ?? "";
  const url = it?.weburl ?? it?.url ?? it?.website ?? "";
  const favicon = it?.favicon_url ?? it?.favicon ?? it?.faviconUrl ?? undefined;
  const snippet =
    it?.conext ?? it?.context ?? it?.snippet ?? it?.description ?? "";
  const category =
    it?.categoryName ?? it?.category_name ?? it?.category ?? it?.cat ?? it?.category ?? "";
  let photos = [];
  if (Array.isArray(it?.photos_url)) photos = it.photos_url;
  else if (Array.isArray(it?.photos)) photos = it.photos;
  else if (Array.isArray(it?.images)) photos = it.images;
  else if (typeof it?.photos_url === "string") photos = [it.photos_url];

  return {
    title: String(title),
    url: String(url),
    snippet: String(snippet),
    favicon: favicon ? String(favicon) : undefined,
    category: String(category ?? ""),
    photos: photos.map(String),
  };
};


/* --------------------------
   Main Page Component (JSX)
   -------------------------- */
export default function Page() {
  const mainRef = useRef(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [list, setList] = useState(STATIC_WEBSITES);
  const [apiCategories, setApiCategories] = useState([]);
  const [categoriesState, setCategoriesState] = useState(() => {
    const setCat = new Set(["All"]);
    STATIC_WEBSITES.forEach((w) => setCat.add(w.category));
    return Array.from(setCat);
  });

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [error, setError] = useState(null);

  const [indices, setIndices] = useState({});

  const filtered = useMemo(() => {
    const websitesToSearch =
      activeCategory === "All"
        ? list
        : list.filter(
            (w) => (w.category ?? "").toLowerCase() === activeCategory.toLowerCase()
          );
    if (!search.trim()) return websitesToSearch;
    const term = search.toLowerCase();
    return websitesToSearch.filter(
      (w) =>
        w.title.toLowerCase().includes(term) ||
        (w.snippet ?? "").toLowerCase().includes(term) ||
        (w.category ?? "").toLowerCase().includes(term)
    );
  }, [search, activeCategory, list]);

  // --- simplified category & websites fetchers kept from your original (no changes in logic) ---
  const fetchCategoriesFromApi = async () => {
    setLoadingCategories(true);
    setError(null);
    try {
      const resp = await fetch(
        "https://apirayfogportfolio.nearbydoctors.in/public/api/admin/list-category",
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      if (!resp.ok) {
        setLoadingCategories(false);
        return;
      }
      const data = await resp.json();
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data?.data)) items = data.data;
      else if (Array.isArray(data?.categories)) items = data.categories;
      const tokens = (items || [])
        .map((it) => {
          const id = it?.id ?? it?.categoryId ?? it?.value;
          const name = it?.name ?? it?.title ?? it?.label ?? it?.category ?? String(it);
          if (id !== undefined && id !== null) return `${String(id)}|${String(name)}`;
          return String(name);
        })
        .filter(Boolean);
      const tokensSet = Array.from(new Set([...apiCategories, ...tokens]));
      setApiCategories(tokensSet);
      setCategoriesState((prev) => {
        const set = new Set(prev);
        tokens.forEach((t) => {
          const name = t.includes("|") ? t.split("|")[1] : t;
          set.add(name);
        });
        return Array.from(set);
      });
    } catch (err) {
      setError(err?.message ?? "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchWebsitesByCategory = async (tokenOrName) => {
    setLoadingWebsites(true);
    setError(null);
    // --- truncated: same robust candidate logic as original ---
    const serverEndpoint =
      "https://apirayfogportfolio.nearbydoctors.in/public/api/admin/list-website";
    try {
      const resp = await fetch(serverEndpoint);
      if (!resp.ok) {
        setList(STATIC_WEBSITES);
        setLoadingWebsites(false);
        return;
      }
      const j = await resp.json();
      // try a few shapes
      let items = [];
      if (Array.isArray(j)) items = j;
      else if (Array.isArray(j?.data)) items = j.data;
      else if (Array.isArray(j?.websites)) items = j.websites;
      else if (Array.isArray(j?.items)) items = j.items;
      else if (j && typeof j === "object") items = [j];
      const normalized = (items || []).map(normalizeApiItem);
      setList(normalized.length ? normalized : STATIC_WEBSITES);
    } catch (err) {
      setList(STATIC_WEBSITES);
      setError("Failed to load websites; showing defaults.");
    } finally {
      setLoadingWebsites(false);
    }
  };

  useEffect(() => {
    fetchCategoriesFromApi();
    fetchWebsitesByCategory("All");
    
  }, []);


  const galleryRefs = useRef({});
  const galleryIndex = useRef({});
  const galleryHovered = useRef({});
  const galleryDragging = useRef({});
  const dragState = useRef({});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ensureIndex = (idx) => {
    if (galleryIndex.current[idx] === undefined) galleryIndex.current[idx] = 0;
    if (!dragState.current[idx]) {
      dragState.current[idx] = { dragging: false, startX: 0, startIndex: 0 };
    }
    if (galleryHovered.current[idx] === undefined) galleryHovered.current[idx] = false;
    if (galleryDragging.current[idx] === undefined) galleryDragging.current[idx] = false;
  };

  const setTrackTransformByIndex = (cardIdx, idx) => {
    const el = galleryRefs.current[cardIdx];
    if (!el) return;
    const track = el.querySelector(".rf-slider-track");
    if (!track) return;
    const total = track.children.length || 1;
    const percentPer = 100 / total;
    const safeIdx = Math.max(0, Math.min(total - 1, idx));
    track.style.transition = "transform 300ms ease";
    track.style.transform = `translateX(-${safeIdx * percentPer}%)`;
    galleryIndex.current[cardIdx] = safeIdx;
    setIndices((prev) => ({ ...prev, [cardIdx]: safeIdx }));
  };

  const scrollGalleryToIndex = (cardIdx, imageIndex) => {
    ensureIndex(cardIdx);
    setTrackTransformByIndex(cardIdx, imageIndex);
  };

  const scrollGalleryByStep = (cardIdx, step) => {
    ensureIndex(cardIdx);
    const current = galleryIndex.current[cardIdx] ?? 0;
    const el = galleryRefs.current[cardIdx];
    if (!el) return;
    const track = el.querySelector(".rf-slider-track");
    if (!track) return;
    const total = track.children.length || 1;
    const next = clamp(current + step, 0, total - 1);
    setTrackTransformByIndex(cardIdx, next);
  };

  const attachPointerHandlers = (cardIdx, el) => {
    if (!el) return;
    if (el.__pointerAttached) return;

    const track = el.querySelector(".rf-slider-track");
    if (!track) {
      el.__pointerAttached = true;
      return;
    }

    ensureIndex(cardIdx);

    const onPointerDown = (e) => {
      const target = e.target;
      if (target && typeof target.closest === "function" && target.closest("button")) {
        return;
      }
      if (e.button && e.button !== 0) return;
      dragState.current[cardIdx].dragging = true;
      galleryDragging.current[cardIdx] = true;
      dragState.current[cardIdx].startX = e.clientX;
      dragState.current[cardIdx].startIndex = galleryIndex.current[cardIdx] ?? 0;
      track.style.transition = "none";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e) => {
      if (!dragState.current[cardIdx].dragging) return;
      const dx = e.clientX - dragState.current[cardIdx].startX;
      const containerWidth = el.clientWidth || 1;
      const deltaPercent = (dx / containerWidth) * 100;
      const total = track.children.length || 1;
      const percentPer = 100 / total;
      const basePercent = (dragState.current[cardIdx].startIndex || 0) * percentPer;
      const newPercent = basePercent - deltaPercent;
      track.style.transform = `translateX(-${newPercent}%)`;

      const rawIndex = newPercent / percentPer;
      const liveIdx = clamp(Math.round(rawIndex), 0, total - 1);
      setIndices((prev) => {
        if (prev[cardIdx] === liveIdx) return prev;
        return { ...prev, [cardIdx]: liveIdx };
      });
    };

    const onPointerUp = (e) => {
      if (!dragState.current[cardIdx].dragging) return;
      dragState.current[cardIdx].dragging = false;
      galleryDragging.current[cardIdx] = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      const containerWidth = el.clientWidth || 1;
      const style = window.getComputedStyle(track);
      const matrix = style.transform || "";
      const total = track.children.length || 1;
      const percentPer = 100 / total;
      let translateXpx = 0;
      if (matrix && matrix !== "none") {
        const match = matrix.match(/matrix.*\((.+)\)/);
        if (match) {
          const values = match[1].split(",").map((v) => parseFloat(v.trim()));
          if (values.length >= 6) translateXpx = values[4];
        } else {
          const m = matrix.match(/translateX\((-?\d+\.?\d*)px\)/);
          if (m) translateXpx = parseFloat(m[1]);
        }
      }
      const percent = (-translateXpx / containerWidth) * 100;
      const idxSnap = clamp(Math.round(percent / percentPer), 0, total - 1);
      setTrackTransformByIndex(cardIdx, idxSnap);
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    el.__pointerAttached = true;
  };

  useEffect(() => {
    const onResize = () => {
      Object.keys(galleryRefs.current).forEach((k) => {
        const idx = Number(k);
        const el = galleryRefs.current[idx];
        if (!el) return;
        const track = el.querySelector(".rf-slider-track");
        if (!track) return;
        const current = galleryIndex.current[idx] ?? 0;
        track.style.transition = "none";
        const total = track.children.length || 1;
        const percentPer = 100 / total;
        track.style.transform = `translateX(-${current * percentPer}%)`;
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

  const onCategoryClick = async (c) => {
    const name = c.includes("|") ? c.split("|").slice(1).join("|").trim() : c;
    setActiveCategory(name);
    const matchingToken = apiCategories.find((t) => {
      const label = t.includes("|") ? t.split("|")[1] : t;
      return label === name;
    });
    const tokenOrName = matchingToken ?? name;
    await fetchWebsitesByCategory(tokenOrName);
  };

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

  // ------------------ LIGHTBOX (state + handlers) ------------------
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef(null);

  const lightboxTrackRef = useRef(null);
  const lightboxDrag = useRef({ dragging: false, startX: 0, startIndex: 0 });
  const lightboxPausedByUser = useRef(false);

  // update transform
  const updateLightboxTransform = (index) => {
    const track = lightboxTrackRef.current;
    if (!track) return;
    const total = Math.max(1, lightboxImages.length);
    const percent = ((index % total) + total) % total * 100;
    track.style.transition = "transform 300ms ease";
    track.style.transform = `translateX(-${percent}%)`;
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    updateLightboxTransform(lightboxIndex);
    const onResize = () => updateLightboxTransform(lightboxIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [lightboxOpen, lightboxIndex, lightboxImages.length]);

  useEffect(() => {
    const savedCategory = typeof window !== "undefined" && localStorage.getItem("activeCategory");
    if (savedCategory) setActiveCategory(savedCategory);
  }, []);

  useEffect(() => {
    if (activeCategory) localStorage.setItem("activeCategory", activeCategory);
  }, [activeCategory]);

  const openLightbox = (images, index = 0) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(Math.max(0, Math.min(index, images.length - 1)));
    setLightboxOpen(true);
    lightboxPausedByUser.current = false;
    try {
      document.body.style.overflow = "hidden";
    } catch {}
    try {
      if (mainRef.current) {
        mainRef.current.style.transition = "filter 220ms ease";
        mainRef.current.style.filter = "blur(6px) brightness(0.55)";
        mainRef.current.style.pointerEvents = "none";
        mainRef.current.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    try {
      document.body.style.overflow = "";
    } catch {}
    try {
      if (mainRef.current) {
        mainRef.current.style.transition = "filter 180ms ease";
        mainRef.current.style.filter = "";
        mainRef.current.style.pointerEvents = "";
        mainRef.current.removeAttribute("aria-hidden");
      }
    } catch (e) {}
    setTimeout(() => {
      setLightboxImages([]);
      setLightboxIndex(0);
      touchStartX.current = null;
      lightboxPausedByUser.current = false;
    }, 200);
  };

  const prevLightbox = () =>
    setLightboxIndex((i) => (i - 1 + lightboxImages.length) % Math.max(1, lightboxImages.length));
  const nextLightbox = () => setLightboxIndex((i) => (i + 1) % Math.max(1, lightboxImages.length));

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
    lightboxPausedByUser.current = true;
  };
  const onTouchMove = (e) => {
    e.preventDefault();
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) {
      lightboxPausedByUser.current = false;
      return;
    }
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (endX == null) {
      lightboxPausedByUser.current = false;
      return;
    }
    const dx = endX - touchStartX.current;
    const threshold = 40;
    if (dx > threshold) prevLightbox();
    else if (dx < -threshold) nextLightbox();
    touchStartX.current = null;
    setTimeout(() => (lightboxPausedByUser.current = false), 500);
  };

  // Lightbox pointer handlers (desktop drag)
  const onLightboxPointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    lightboxDrag.current.dragging = true;
    lightboxPausedByUser.current = true;
    lightboxDrag.current.startX = e.clientX;
    lightboxDrag.current.startIndex = lightboxIndex;
    const track = lightboxTrackRef.current;
    if (track) track.style.transition = "none";
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onLightboxPointerMove = (e) => {
    if (!lightboxDrag.current.dragging) return;
    const dx = e.clientX - lightboxDrag.current.startX;
    const container = lightboxTrackRef.current?.parentElement;
    if (!container || !lightboxTrackRef.current) return;
    const containerWidth = container.clientWidth || 1;
    const deltaPercent = (dx / containerWidth) * 100;
    const basePercent = (lightboxDrag.current.startIndex || 0) * 100;
    const newPercent = basePercent - deltaPercent;
    lightboxTrackRef.current.style.transform = `translateX(-${newPercent}%)`;
  };

  const onLightboxPointerUp = (e) => {
    if (!lightboxDrag.current.dragging) return;
    lightboxDrag.current.dragging = false;
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {}
    const container = lightboxTrackRef.current?.parentElement;
    if (!container || !lightboxTrackRef.current) {
      updateLightboxTransform(lightboxIndex);
      lightboxPausedByUser.current = false;
      return;
    }
    const style = window.getComputedStyle(lightboxTrackRef.current);
    const matrix = style.transform || "";
    let translateXpx = 0;
    if (matrix && matrix !== "none") {
      const match = matrix.match(/matrix.*\((.+)\)/);
      if (match) {
        const values = match[1].split(",").map((v) => parseFloat(v.trim()));
        if (values.length >= 6) translateXpx = values[4];
      } else {
        const m = matrix.match(/translateX\((-?\d+\.?\d*)px\)/);
        if (m) translateXpx = parseFloat(m[1]);
      }
    }
    const percent = (-translateXpx / container.clientWidth) * 100;
    const total = Math.max(1, lightboxImages.length);
    const idxSnap = clamp(Math.round(percent / 100), 0, total - 1);
    setLightboxIndex(idxSnap);
    setTimeout(() => (lightboxPausedByUser.current = false), 1200);
  };

  useEffect(() => {
    window.addEventListener("pointermove", onLightboxPointerMove);
    window.addEventListener("pointerup", onLightboxPointerUp);
    return () => {
      window.removeEventListener("pointermove", onLightboxPointerMove);
      window.removeEventListener("pointerup", onLightboxPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoplay for card galleries (kept as original)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        Object.keys(galleryRefs.current).forEach((k) => {
          const idx = Number(k);
          const el = galleryRefs.current[idx];
          if (!el) return;
          const track = el.querySelector(".rf-slider-track");
          if (!track) return;
          const total = track.children.length || 1;
          if (total <= 1) return;
          if (galleryHovered.current[idx]) return;
          if (galleryDragging.current[idx]) return;
          const current = galleryIndex.current[idx] ?? 0;
          const next = (current + 1) % total;
          setTrackTransformByIndex(idx, next);
        });
      } catch (err) {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lightbox autoplay
  useEffect(() => {
    if (!lightboxOpen) return;
    if (lightboxImages.length <= 1) return;
    const id = setInterval(() => {
      if (lightboxPausedByUser.current) return;
      setLightboxIndex((i) => (i + 1) % lightboxImages.length);
    }, 1500);
    return () => clearInterval(id);
  }, [lightboxOpen, lightboxImages.length]);

  /* --------------------------
     Render
     -------------------------- */
  return (
    <div ref={mainRef} className="min-h-screen bg-white p-6 text-black ">
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

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="rayfog" className="h-18 w-auto" style={{ height: 68 }} />
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <input
              aria-label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for websites..."
              className="w-[280px] px-3 py-2 rounded-full border border-gray-200 shadow-sm outline-none text-sm focus:ring-2 focus:ring-indigo-200"
            />

            <button className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-300 to-purple-300 font-semibold text-sm shadow">
              Search
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="https://rayfog.com/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-md border border-gray-200 text-sm" title="Visit Rayfog">Visit Website</a>
        </div>
      </header>

      {/* Categories */}
      <div className="mb-6 category-scroll" role="navigation" aria-label="Categories">
        <div className="flex gap-3 items-center px-3">
          {categoriesState.map((c) => {
            const label = renderChipLabel(c);
            const active = label === activeCategory;
            const grad = categoryGradient(label);
            return (
              <button
                key={c}
                onClick={() => onCategoryClick(c)}
                className={`whitespace-nowrap inline-flex items-center gap-2 px-5 py-2 rounded-full text-base shadow-sm transition-transform duration-150
                  ${active ? `bg-gradient-to-r ${grad} text-white scale-105` : "bg-gray-100 text-gray-800 hover:scale-105"}`}
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

      {/* Grid */}
      <section className="border border-gray-100 rounded-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {loadingWebsites && (
            <div className="col-span-full py-8 text-center text-gray-500 text-sm">Loading websites...</div>
          )}

          {!loadingWebsites &&
            filtered.map((item, idx) => {
              const photos = item.photos ?? [];
              const fallback = photos.length > 0 ? photos[0] : item.favicon ?? "/logo.png";

              ensureIndex(idx);

              return (
                <article key={idx} className="group bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
                    {item.favicon ? (
                      <img src={item.favicon} alt={`${item.title} favicon`} width={36} height={36} className="w-9 h-9 rounded-full object-cover shadow-sm" />
                    ) : <div className="w-9 h-9 bg-gray-200 rounded-full" />}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base truncate">{item.title}</h3>
                      <a href={item.url} target="_blank" rel="noreferrer" className="block text-sm text-gray-600 truncate break-words">{item.url}</a>
                    </div>
                  </div>

                  {/* Gallery */}
                  <div className="p-3">
                    {photos.length > 0 ? (
                      <div className="relative">
                        <button aria-label="Prev" onClick={() => scrollGalleryByStep(idx, -1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-md opacity-15 hover:opacity-100 transition-all duration-300 hover:scale-110 group-hover:opacity-100">
                          <span className="text-lg font-bold text-gray-700">‹</span>
                        </button>

                        <div ref={(el) => { galleryRefs.current[idx] = el; attachPointerHandlers(idx, el); }} className="overflow-hidden w-full rounded-md" style={{ touchAction: "pan-y" }} onMouseEnter={() => { galleryHovered.current[idx] = true; }} onMouseLeave={() => { galleryHovered.current[idx] = false; }}>
                          <div className="rf-slider-track flex" style={{ width: `${photos.length * 100}%`, transform: `translateX(-${(galleryIndex.current[idx] ?? 0) * (100 / photos.length)}%)`, transition: "transform 300ms ease" }}>
                            {photos.map((p, i) => (
                              <div key={i} className="flex-shrink-0" style={{ width: `${100 / photos.length}%`, display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <button type="button" onClick={(e) => { e.stopPropagation(); openLightbox(photos, i); }} onMouseDown={(e) => e.stopPropagation()} className="w-full h-52 flex items-center justify-center rounded-md overflow-hidden p-0 border-0 bg-transparent cursor-pointer">
                                  <img src={p} alt={`${item.title} photo ${i}`} className="w-full h-full object-cover rounded-md select-none pointer-events-auto" style={{ aspectRatio: "16/9", objectPosition: "center" }} onError={(e) => { e.target.style.display = "none"; }} draggable={false} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button aria-label="Next" onClick={() => scrollGalleryByStep(idx, 1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-md opacity-15 hover:opacity-100 transition-all duration-300 hover:scale-110 group-hover:opacity-100">
                          <span className="text-lg font-bold text-gray-700">›</span>
                        </button>

                        <div className="flex justify-center gap-1 mt-2">
                          {photos.map((_, dotIdx) => {
                            const activeDot = (indices[idx] ?? galleryIndex.current[idx] ?? 0) === dotIdx;
                            return (
                              <button key={dotIdx} onClick={() => scrollGalleryToIndex(idx, dotIdx)} className={`w-2.5 h-2.5 rounded-full ${activeDot ? "bg-blue-600" : "bg-gray-300"}`} aria-label={`Go to image ${dotIdx + 1}`} />
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); openLightbox([fallback], 0); }} className="w-full max-w-[300px] h-52 flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer rounded-md overflow-hidden">
                          <img src={fallback} alt={`${item.title} preview`} className="w-full h-full object-cover rounded-md select-none pointer-events-auto" style={{ aspectRatio: "16/9", objectPosition: "center" }} onError={(e) => { e.target.style.display = "none"; }} draggable={false} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="p-3 flex items-center justify-between gap-3 text-sm text-gray-700">
                    <p className="flex-1 text-gray-600 leading-snug text-sm truncate" style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.snippet || "No description available."}
                    </p>

                    {item.category && (
                      <span className="shrink-0 inline-block px-3 py-1 text-xs font-medium rounded-full text-white" style={{ background: `linear-gradient(90deg, var(--from), var(--to))` }}>
                        <span className="inline-block px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">{item.category}</span>
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

          {!loadingWebsites && filtered.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 text-sm">No results found</div>
          )}
        </div>
      </section>

      {/* Lightbox Portal */}
      {lightboxOpen && (
        <LightboxPortal
          images={lightboxImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % Math.max(1, lightboxImages.length))}
          onNext={() => setLightboxIndex((i) => (i + 1) % Math.max(1, lightboxImages.length))}
          trackRef={lightboxTrackRef}
          onPointerDown={onLightboxPointerDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      )}
    </div>
  );
}
