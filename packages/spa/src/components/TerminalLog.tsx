/**
 * The scrolling terminal log pane. Shows agent rationale, source (llm|fallback),
 * errors, and general session chatter. Auto-scrolls to the newest line.
 */
import { useEffect, useRef } from "preact/hooks";
import type { LogLine } from "../types";

type Props = {
  lines: LogLine[];
};

export function TerminalLog({ lines }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div class="log">
      {lines.map((line) => (
        <p key={line.id} class={`line ${line.level}`}>
          {line.text}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  );
}
