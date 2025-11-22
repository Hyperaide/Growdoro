"use client";

import IsometricGarden from "./components/IsometricGarden";
import AuthButton from "./components/AuthButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-tr from-green-100 to-sky-100 font-barlow dark:from-neutral-800 dark:to-neutral-800">
      <IsometricGarden />
    </main>
  );
}
