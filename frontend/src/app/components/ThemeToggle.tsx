"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const MODES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

/** True once hydrated on the client — avoids a light/dark mismatch flash. */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    // Reserve space to avoid layout shift before hydration
    return <div className="h-[46px] w-[134px] md:h-8 md:w-[108px]" aria-hidden />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center rounded-full border border-border p-0 md:p-0.5"
    >
      {MODES.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          // The button is the 44 px hit area on phones; the pill that shows
          // the selection keeps its size, inside it.
          className={`flex items-center justify-center rounded-full transition-colors max-md:size-11 ${
            theme === value ? "text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span
            className={`rounded-full p-1.5 transition-colors ${theme === value ? "bg-brand-teal" : ""}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
