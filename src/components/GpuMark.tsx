"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { LottieHandle, LottieSvgProps } from "lottie-react";
import gpu from "@/assets/gpu.json";
import { cn } from "@/lib/utils";

type Player = ComponentType<LottieSvgProps>;

export function GpuMark({ className }: { className?: string }) {
  const [Player, setPlayer] = useState<Player | null>(null);
  const [reduce, setReduce] = useState(false);
  const [playing, setPlaying] = useState(true);
  const lottieRef = useRef<LottieHandle>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduce(reduced);
    if (reduced) setPlaying(false);
    void import("lottie-react").then((mod) => {
      setPlayer(() => mod.LottieSvg);
    });
  }, []);

  // WCAG 2.2.2: this loops past five seconds, so it needs a pause affordance.
  function toggle() {
    const lottie = lottieRef.current;
    if (!lottie) return;
    if (playing) lottie.pause();
    else lottie.play();
    setPlaying(!playing);
  }

  return (
    <div className={cn("relative aspect-[262/190] w-full", className)}>
      <div
        className="h-full w-full"
        role="img"
        aria-label="Animated isometric GPU"
      >
        {Player ? (
          <Player
            src={gpu}
            autoplay={!reduce}
            loop={!reduce}
            lottieRef={lottieRef}
            className="h-full w-full"
            subscriptions={
              reduce
                ? {
                    ready: () => {
                      lottieRef.current?.seek(50);
                    },
                  }
                : {}
            }
          />
        ) : null}
      </div>

      {Player ? (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={!playing}
          className="num absolute bottom-0 right-0 border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground opacity-60 hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {playing ? "Pause" : "Play"}
        </button>
      ) : null}
    </div>
  );
}
