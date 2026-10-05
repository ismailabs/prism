import { useSyncExternalStore } from "react";
import { useAppStore } from "@/store/useAppStore";
const query = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
export function useReducedMotion() {
  const preference = useAppStore((s) => s.personalization.motion);
  const system = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
  return system || preference === "reduced";
}
