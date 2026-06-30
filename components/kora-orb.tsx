"use client";

import React, { useEffect, useRef, useState } from "react";

type KoraOrbProps = {
  size?: number;
};

export const KoraOrb = ({ size = 162 }: KoraOrbProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const orbRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: event.clientX - dragStart.current.x,
        y: event.clientY - dragStart.current.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const totalBackgroundDots = 42;
  const backgroundDots = Array.from({ length: totalBackgroundDots }).map(
    (_, index) => {
      const angle = (index / totalBackgroundDots) * Math.PI * 2;
      const radiusLayer = index % 3 === 0 ? 0.46 : index % 3 === 1 ? 0.52 : 0.58;
      const radius = size * radiusLayer;
      return {
        x: size / 2 + Math.cos(angle) * radius,
        y: size / 2 + Math.sin(angle) * radius,
        delay: `${index * 70}ms`,
      };
    },
  );

  return (
    <div
      ref={orbRef}
      className={`kora-orb relative shrink-0 select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        width: size,
        height: size,
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? "none" : "transform 0.15s ease-out",
      }}
      onMouseDown={handleMouseDown}
      aria-hidden="true"
    >
      <style>{`
        @keyframes koraOrbPulse {
          0%, 100% { opacity: 0.75; transform: scale(0.97); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes koraOrbSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes koraOrbSpinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes koraOrbFloat {
          0%, 100% { transform: translateY(2px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes koraOrbTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .kora-bg-mesh { animation: koraOrbSpinClockwise 45s linear infinite; transform-origin: 50% 50%; }
        .kora-bg-mesh-reverse { animation: koraOrbSpinCounter 60s linear infinite; transform-origin: 50% 50%; }
        .kora-glow-core { animation: koraOrbPulse 3s ease-in-out infinite; }
        .kora-ring-neon { animation: koraOrbPulse 2s ease-in-out infinite; }
        .kora-avatar-face { animation: koraOrbFloat 3.5s ease-in-out infinite; }
        .kora-mesh-dot { animation: koraOrbTwinkle 2.5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .kora-bg-mesh, .kora-bg-mesh-reverse, .kora-glow-core, .kora-ring-neon, .kora-avatar-face, .kora-mesh-dot {
            animation: none !important;
          }
        }
      `}</style>

      <div className="kora-glow-core absolute inset-0 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="kora-bg-mesh absolute inset-0">
        {backgroundDots.map((dot, index) => (
          <span
            key={`dot-1-${index}`}
            className="kora-mesh-dot absolute h-[3.5px] w-[3.5px] rounded-full bg-cyan-400/80 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
            style={{
              left: dot.x,
              top: dot.y,
              animationDelay: dot.delay,
            }}
          />
        ))}
        <div className="absolute inset-[-4%] rounded-full border border-blue-500/10" />
        <div className="absolute inset-[-12%] rounded-full border border-blue-400/5" />
      </div>

      <div className="kora-bg-mesh-reverse absolute inset-0 opacity-80">
        {backgroundDots.slice(0, 20).map((dot, index) => (
          <span
            key={`dot-2-${index}`}
            className="kora-mesh-dot absolute h-[3px] w-[3px] rounded-full bg-blue-400/60"
            style={{
              left: dot.y,
              top: dot.x,
              animationDelay: `${index * 110}ms`,
            }}
          />
        ))}
        <div className="absolute inset-[-8%] rounded-full border border-dashed border-blue-500/10" />
      </div>

      <div className="kora-ring-neon absolute inset-[14%] rounded-full border-[5px] border-blue-500 bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_0_22px_rgba(6,182,212,0.95),0_0_40px_rgba(59,130,246,0.7),inset_0_0_15px_rgba(6,182,212,0.6)]" />

      <div className="absolute inset-[16.5%] overflow-hidden rounded-full bg-[#030914] shadow-[inset_0_4px_20px_rgba(0,0,0,0.9)]">
        <div className="absolute right-2 top-0 h-20 w-16 rotate-12 rounded-full bg-blue-500/10 blur-md" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="kora-avatar-face mt-1 flex flex-col items-center gap-2.5">
            <div className="flex gap-4">
              <span className="h-6 w-3.5 rounded-full bg-white shadow-[0_0_12px_#ffffff,0_0_20px_rgba(255,255,255,0.6)]" />
              <span className="h-6 w-3.5 rounded-full bg-white shadow-[0_0_12px_#ffffff,0_0_20px_rgba(255,255,255,0.6)]" />
            </div>
            <svg
              width="26"
              height="12"
              viewBox="0 0 32 16"
              className="opacity-95 drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]"
            >
              <path
                d="M5 4c4 7 18 7 22 0"
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
