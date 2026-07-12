/**
 * PROMPT bar — a single terminal input that accepts both steering ("wider
 * mouths, slower flow") and concept-creation ("make a pyramid"). Submitting
 * hands the raw line up to the app, which classifies + routes it.
 */
import { useEffect, useState } from "preact/hooks";

type Props = {
  disabled?: boolean;
  onSubmit: (text: string) => void;
  /** The prompt currently being worked on (shown in the busy state). */
  busyPrompt?: string;
};

export function PromptBar({ disabled, onSubmit, busyPrompt }: Props) {
  const [value, setValue] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const working = Boolean(disabled && busyPrompt);

  // Tick an elapsed-seconds counter for as long as the agent is working.
  useEffect(() => {
    if (!working) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [working]);

  const submit = (e: Event) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) {
      return;
    }
    onSubmit(text);
    setValue("");
  };

  if (working) {
    return (
      <div class="prompt working" role="status" aria-live="polite">
        <span class="sigil spinner" aria-hidden="true">
          ⟳
        </span>
        <span class="working-text">
          agent working on: “{busyPrompt}”<span class="cursor blink">█</span>
        </span>
        <span class="elapsed">{elapsed}s</span>
      </div>
    );
  }

  return (
    <form class="prompt" onSubmit={submit}>
      <span class="sigil">$</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder="steer ('wider mouths, slower flow') or create ('make a pyramid')"
        aria-label="prompt"
        onInput={(e) => setValue((e.currentTarget as HTMLInputElement).value)}
      />
      <span class="cursor">█</span>
    </form>
  );
}
