"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/theme-context";

const NightModeOverlay: React.FC = () => {
  const { theme } = useTheme();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (theme !== "dark") return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    // Set initial position to center if not moved yet
    setPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [theme]);

  if (theme !== "dark") return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-500"
      style={{
        background: `radial-gradient(
          ellipse 192px 114px at ${position.x}px ${position.y}px, 
          rgba(0, 0, 0, 0.1) 0px, 
          rgba(0, 0, 0, 0.5) 50px, 
          rgba(24, 24, 24, 0.8) 100px, 
          rgba(24, 24, 24, 0.99) 200px
        )`,
      }}
    />
  );
};

export default NightModeOverlay;
