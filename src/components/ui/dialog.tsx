import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export interface ModalProps { open: boolean; onOpenChange: (open:boolean)=>void; title: string; description?: string; children: ReactNode; wide?: boolean }

// Share only native event identities between layers; do not retain DOM nodes.
const escapesBehindFocus = new WeakSet<KeyboardEvent>();

function available(element: HTMLElement) {
  if (!element.isConnected || element.matches(':disabled') ||
    element.closest('[inert], [hidden], [aria-hidden="true"], [aria-disabled="true"]') ||
    !element.getClientRects().length || getComputedStyle(element).visibility !== 'visible') return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    if (style.opacity === '0' || style.contentVisibility === 'hidden') return false;
  }
  return true;
}

export function Modal({open,onOpenChange,title,description,children,wide=false}:ModalProps) {
  const { t } = useTranslation();
  const focusId = useId();
  const lifecycle = useRef({ open, mounted: false });
  const handledEscape = useRef<KeyboardEvent | null>(null);
  // Also capture an opener when the parent first mounts this modal already open.
  const [initialFocus] = useState(() => typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
  const previousFocus = useRef<HTMLElement | null>(initialFocus);
  const opening = useRef<{ content: HTMLElement; opener: HTMLElement | null; context: HTMLElement | null } | null>(null);
  useLayoutEffect(() => {
    lifecycle.current = { open, mounted: true };
    // React's autoFocus can run before Radix's opening event. Remember focus
    // while closed, excluding this dialog's own autofocus during the commit.
    const rememberFocus = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body &&
        active.closest('[data-modal-focus]')?.getAttribute('data-modal-focus') !== focusId) previousFocus.current = active;
    };
    if (!open) {
      handledEscape.current = null;
      rememberFocus();
      document.addEventListener('focusin', rememberFocus);
    }
    return () => {
      lifecycle.current.mounted = false;
      document.removeEventListener('focusin', rememberFocus);
    };
  }, [open, focusId]);

  const rememberContent = useCallback((content: HTMLDivElement | null) => {
    if (!content || opening.current?.content === content) return;
    const active = content.ownerDocument.activeElement;
    const previous = opening.current;
    const opener = active instanceof HTMLElement && active !== content.ownerDocument.body && !content.contains(active) && !previous?.content.contains(active)
      ? active : previous?.opener ?? previousFocus.current;
    opening.current = {
      content, opener,
      context: opener?.closest<HTMLElement>('main, [role="main"], [role="dialog"]') ?? previous?.context ?? content.ownerDocument.querySelector<HTMLElement>('main, [role="main"]'),
    };
    // Leave Radix's initial focus and focus containment intact.
  }, []);

  function restoreOpening(event: Event) {
    event.preventDefault();
    const session = opening.current;
    // Radix defers this event. An unmount, reopen, or newer dialog must not
    // restore focus from an obsolete opening session.
    if (!lifecycle.current.mounted || lifecycle.current.open || !session || session.content !== event.target) return;
    opening.current = null;
    const document = session.content.ownerDocument;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && !session.content.contains(active) && available(active)) return;
    const otherDialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"]')];
    if (otherDialogs.some(dialog => dialog !== session.content && !dialog.contains(session.opener) && !dialog.contains(session.context))) return;
    if (session.opener && available(session.opener)) {
      session.opener.focus({ preventScroll: true });
      if (document.activeElement === session.opener) return;
    }
    // If the opening control disappeared, return to its surviving landmark.
    // Never move focus out of another dialog that is taking over.
    if (otherDialogs.some(dialog => !dialog.contains(session.context))) return;
    const context = session.context;
    if (context && available(context)) {
      const tabIndex = context.getAttribute('tabindex');
      if (tabIndex === null) {
        context.setAttribute('tabindex', '-1');
      }
      context.focus({ preventScroll: true });
      if (tabIndex === null) {
        const restoreTabIndex = () => { if (context.getAttribute('tabindex') === '-1') context.removeAttribute('tabindex'); };
        if (document.activeElement === context) context.addEventListener('blur', restoreTabIndex, { once: true });
        else restoreTabIndex();
      }
    }
  }

  function changeOpen(nextOpen: boolean) {
    const content = opening.current?.content;
    const active = content?.ownerDocument.activeElement;
    // A newly opened nested layer can briefly share the library's highest-layer
    // snapshot with its parent. Never dismiss a layer behind keyboard focus.
    if (!nextOpen && active instanceof HTMLElement) {
      const activeDialog = active.closest('[role="dialog"]');
      if (activeDialog && activeDialog !== content) return;
    }
    onOpenChange(nextOpen);
  }

  // Keep native pointer focus inside when a controlled dismissal is refused.
  // Radix's dismissal event still reaches the existing onOpenChange guards.
  return <Dialog.Root open={open} onOpenChange={changeOpen}><Dialog.Portal><Dialog.Overlay onPointerDown={event => { if (event.button === 0 && !event.ctrlKey) event.preventDefault(); }} className="modal-overlay fixed inset-0 z-40 bg-slate-950/40"/><Dialog.Content ref={rememberContent} data-modal-focus={focusId} onCloseAutoFocus={restoreOpening} onEscapeKeyDown={event => {
    if (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]') === opening.current?.content) handledEscape.current = event;
    else escapesBehindFocus.add(event);
  }} onKeyDownCapture={event => {
    // Fall back to the focused layer while Radix's layer snapshot catches up.
    // Respect Escape already handled by this dialog or another nested widget.
    if (event.key === 'Escape' && lifecycle.current.open && handledEscape.current !== event.nativeEvent &&
      (!event.defaultPrevented || escapesBehindFocus.has(event.nativeEvent)) &&
      event.target instanceof HTMLElement && event.target.closest('[role="dialog"]') === event.currentTarget) {
      event.preventDefault(); event.stopPropagation(); onOpenChange(false);
    }
  }} className={`modal-content ${wide?'max-w-2xl':'max-w-lg'}`}><div className="modal-heading mb-6 pr-10"><Dialog.Title className="text-xl font-semibold tracking-tight">{title}</Dialog.Title><Dialog.Description className={description?'mt-2 text-sm text-subtle':'sr-only'}>{description??title}</Dialog.Description></div>{children}<Dialog.Close aria-label={t('close')} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg text-subtle hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><X size={18}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
