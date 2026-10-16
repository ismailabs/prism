import { Fragment, useLayoutEffect, useRef, useState } from "react";

// Fit the already formatted text without rounding, truncating or changing its
// accessible value. Exceptionally long totals retain keyboard-scrollable access
// at the minimum readable size rather than hiding digits.
function FittedMoneyText({ text }: { text: string }) {
  const container = useRef<HTMLSpanElement>(null);
  const token = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const box = container.current, value = token.current;
    if (!box || !value) return;
    let frame = 0, disposed = false;
    const measure = () => {
      if (disposed || !box.clientWidth) return;
      value.style.fontSize = '';
      const base = parseFloat(getComputedStyle(box).fontSize);
      const natural = value.getBoundingClientRect().width;
      if (natural > box.clientWidth) value.style.fontSize = `${Math.max(14, Math.floor(base * box.clientWidth / natural * 100) / 100)}px`;
      setOverflow(value.getBoundingClientRect().width > box.clientWidth + 1);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(box);
    measure();
    void document.fonts.ready.then(schedule);
    window.addEventListener('resize', schedule);
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); };
  }, [text]);
  return <span ref={container} className="fit-money" tabIndex={overflow ? 0 : undefined}><span ref={token} className="money-token">{text}</span></span>;
}

// Only control line breaks in an already formatted amount. Keep the currency/sign
// with the first group and never split a group of digits or the decimal fraction.
export function MoneyText({ text, fit = false }: { text: string; fit?: boolean }) {
  if (fit) return <FittedMoneyText text={text} />;
  const groups = text.split(",");
  return (
    <>
      {groups.map((group, index) => (
        <Fragment key={index}>
          <span className="money-group">
            {group}
            {index < groups.length - 1 ? "," : ""}
          </span>
          {index < groups.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}
