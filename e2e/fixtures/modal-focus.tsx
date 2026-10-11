// Isolated browser fixture: the real shared modal, with no Auth or financial IO.
import { StrictMode, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Modal } from '../../src/components/ui/dialog';
import '../../src/i18n';
import '../../src/styles.css';

declare global {
  interface Window {
    modalFocus: {
      unavailable: (kind: string) => void;
      unmount: () => void;
      reopen: () => void;
      replace: () => void;
      closeAndFocus: () => void;
      close: () => void;
      remountAutofocused: () => void;
    };
  }
}

function Fixture() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [replacement, setReplacement] = useState(false);
  const [nested, setNested] = useState(false);
  const [autofocus, setAutofocus] = useState(false);
  const [unavailable, setUnavailable] = useState('');
  const next = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    window.modalFocus = {
      unavailable: setUnavailable,
      unmount: () => flushSync(() => setMounted(false)),
      reopen: () => { flushSync(() => setOpen(false)); flushSync(() => setOpen(true)); },
      replace: () => flushSync(() => { setOpen(false); setReplacement(true); }),
      closeAndFocus: () => { flushSync(() => setOpen(false)); next.current?.focus(); },
      close: () => flushSync(() => setOpen(false)),
      remountAutofocused: () => flushSync(() => { setAutofocus(true); setOpen(true); setMounted(true); }),
    };
  }, []);
  return <main aria-label="Modal focus fixture">
    <h1>Shared modal keyboard fixture</h1>
    <div inert={unavailable === 'inert'} aria-hidden={unavailable === 'aria-hidden' ? true : undefined}
      style={{ opacity: unavailable === 'opacity' ? 0 : undefined, contentVisibility: unavailable === 'content-visibility' ? 'hidden' : undefined }}>
      {unavailable !== 'removed' && <button
        disabled={unavailable === 'disabled'}
        aria-disabled={unavailable === 'aria-disabled' ? true : undefined}
        hidden={unavailable === 'hidden'}
        tabIndex={['aria-hidden', 'aria-disabled', 'opacity'].includes(unavailable) ? -1 : undefined}
        style={{ visibility: unavailable === 'visibility' ? 'hidden' : undefined }}
        onClick={() => setOpen(true)}>Open modal</button>}
    </div>
    <button ref={next}>Continue</button>
    {mounted && <Modal open={open} onOpenChange={setOpen} title="Keyboard modal">
      <label>First field<input autoFocus={autofocus} /></label>
      <button onClick={() => setOpen(false)}>Cancel</button>
      {unavailable !== 'nested-removed' && <button onClick={() => setNested(true)}>Open nested modal</button>}
      <Modal open={nested} onOpenChange={setNested} title="Nested modal">
        <label>Nested field<input /></label>
      </Modal>
    </Modal>}
    <Modal open={replacement} onOpenChange={setReplacement} title="Replacement modal">
      <label>Replacement field<input /></label>
    </Modal>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
