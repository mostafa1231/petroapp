"use client";

import { useState } from "react";
import { PlayIcon } from "./Icons";

/** Facade: only a thumbnail until clicked; the YouTube iframe loads on demand. */
export function LiteYouTube({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  if (!id) return null;
  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink">
      {play ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 size-full" aria-label={title} data-cta="video_play">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" width={480} height={360} className="size-full object-cover opacity-80" />
          <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-brand text-white shadow-lg group-hover:scale-105">
            <PlayIcon className="size-8" />
          </span>
        </button>
      )}
    </div>
  );
}
