"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

export default function LightboxPortal({
  images = [],
  index = 0,
  onClose = () => {},
  onPrev = () => {},
  onNext = () => {},
  trackRef,
  onPointerDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      style={{ background: "rgba(139, 139, 139, 0.36)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full flex items-center justify-center"
        style={{ maxWidth: "88vw", maxHeight: "92vh", minWidth: "320px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* ✕ Close */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-full bg-black/60 text-white p-2 shadow"
          style={{
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100003,
            pointerEvents: "auto",
          }}
        >
          <span className="text-lg font-bold select-none">✕</span>
        </button>

        {/* ‹ Prev / › Next */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-1/4"
          style={{ background: "linear-gradient(90deg, rgba(181, 179, 179, 0.12), transparent)" }}
        >
          <span className="text-3xl text-white select-none">‹</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-1/4"
          style={{ background: "linear-gradient(270deg, rgba(137, 135, 135, 0.12), transparent)" }}
        >
          <span className="text-3xl text-white select-none">›</span>
        </button>

        {/* Image Track */}
        <div
          className="bg-black flex items-center justify-center rounded-md overflow-hidden"
          style={{ width: "100%", aspectRatio: "16 / 9", maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.preventDefault();
            onPointerDown?.(e);
          }}
        >
          <div
            ref={trackRef}
            className="flex"
            style={{
              width: `${Math.max(1, images.length) * 100}%`,
              transform: `translateX(-${index * 100}%)`,
              transition: "transform 300ms ease",
            }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex justify-center items-center"
                style={{ minWidth: "100%" }}
              >
                <img
                  src={src}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-contain select-none"
                  style={{ objectPosition: "center", maxHeight: "90vh" }}
                  draggable={false}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Counter */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded">
          {Math.min(index + 1, images.length)} / {images.length}
        </div>
      </div>
    </div>,
    document.body
  );
}
