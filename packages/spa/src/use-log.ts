/**
 * A tiny terminal-log store hook. Keeps a bounded ring of log lines and hands
 * back a `log(level, text)` appender.
 */
import { useCallback, useState } from "preact/hooks";
import type { LogLevel, LogLine } from "./types";

const MAX_LINES = 200;
let seq = 0;

export function useLog(initial: LogLine[] = []) {
  const [lines, setLines] = useState<LogLine[]>(initial);

  const log = useCallback((level: LogLevel, text: string) => {
    seq += 1;
    const line: LogLine = { id: seq, level, text };
    setLines((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  }, []);

  return { lines, log };
}
