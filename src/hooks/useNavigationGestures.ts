import { useEffect } from "react";
export function swipeIntent(
  start: { x: number; y: number },
  end: { x: number; y: number },
  open: boolean,
  insideDrawer: boolean,
) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.8) return null;
  if (!open && start.x <= 20 && dx > 0) return "open";
  if (open && insideDrawer && dx < 0) return "close";
  return null;
}
export function useNavigationGestures(
  open: boolean,
  setOpen: (v: boolean) => void,
) {
  useEffect(() => {
    let start: {
      x: number;
      y: number;
      inside: boolean;
      time: number;
      blocked: boolean;
    } | null = null;
    const begin = (event: TouchEvent) => {
      if (
        !window.matchMedia("(max-width: 767px)").matches ||
        event.touches.length !== 1
      ) {
        start = null;
        return;
      }
      const touch = event.touches[0],
        target = event.target as Element;
      start = {
        x: touch.clientX,
        y: touch.clientY,
        inside: !!target.closest(".mobile-nav-panel"),
        time: Date.now(),
        blocked: !!target.closest(
          'input,textarea,select,[role="slider"],.donut-svg,.overflow-x-auto',
        ),
      };
    };
    const move = (event: TouchEvent) => {
      if (
        !start ||
        start.blocked ||
        event.touches.length !== 1 ||
        Date.now() - start.time >= 700
      )
        return;
      const touch = event.touches[0],
        dx = touch.clientX - start.x,
        dy = touch.clientY - start.y;
      const eligible =
        (!open && start.x <= 20 && dx > 0) || (open && start.inside && dx < 0);
      if (eligible && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        if (event.cancelable) event.preventDefault();
      }
    };
    const end = (event: TouchEvent) => {
      if (!start || !event.changedTouches.length) return;
      const touch = event.changedTouches[0];
      if (!start.blocked && Date.now() - start.time < 700) {
        const intent = swipeIntent(
          start,
          { x: touch.clientX, y: touch.clientY },
          open,
          start.inside,
        );
        if (intent) {
          if (event.cancelable) event.preventDefault();
          setOpen(intent === "open");
        }
      }
      start = null;
    };
    const cancel = () => {
      start = null;
    };
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end, { passive: false });
    document.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
    };
  }, [open, setOpen]);
}
