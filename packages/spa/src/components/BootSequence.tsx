/**
 * A short boot-sequence intro that types out a fake POST log, then fades to the
 * studio. Respects prefers-reduced-motion by completing near-instantly.
 */
import { useEffect, useState } from "preact/hooks";

const BANNER = `
 ╦  ╦╔═╗╔═╗╔╦╗╔═╗╦═╗  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗
 ╚╗╔╝║╣ ║   ║ ║ ║╠╦╝  ║  ╠╦╝║╣ ╠═╣ ║ ║╣
  ╚╝ ╚═╝╚═╝ ╩ ╚═╝╩╚═  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝`;

const LINES = [
  "[ ok ] phosphor display online",
  "[ ok ] mounting @vector-create/core toolkit",
  "[ ok ] loading concept registry",
  "[ .. ] probing agent service /api",
  "[ ok ] genome sampler armed",
  "[ ok ] vector studio ready",
];

type Props = {
  onDone: () => void;
};

export function BootSequence({ onDone }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onDone();
      return;
    }
    if (shown >= LINES.length) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), 160);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  return (
    <div class="boot">
      <pre class="ascii">{BANNER}</pre>
      <pre>
        {LINES.slice(0, shown)
          .map((l) => `${l}\n`)
          .join("")}
        <span class="cursor">█</span>
      </pre>
    </div>
  );
}
