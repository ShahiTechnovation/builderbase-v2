"use client";

import { Spotlight } from "@/components/ui/spotlight";

export function GridPatternSpotlight() {
  return (
    <div className='dark'>
      <div className='relative aspect-video h-[200px] rounded border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-black'>
        <Spotlight
          className='from-blue-800 via-blue-600 to-blue-400 blur-xl dark:from-blue-900 dark:via-blue-500 dark:to-blue-900'
          size={64}
        />
      </div>
    </div>
  );
}
