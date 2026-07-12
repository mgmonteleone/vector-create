/**
 * PROMPT bar — a single terminal input that accepts both steering ("wider
 * mouths, slower flow") and concept-creation ("make a pyramid"). Submitting
 * hands the raw line up to the app, which classifies + routes it.
 */
import { useState } from "preact/hooks";

type Props = {
  disabled?: boolean;
  onSubmit: (text: string) => void;
};

export function PromptBar({ disabled, onSubmit }: Props) {
  const [value, setValue] = useState("");

  const submit = (e: Event) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) {
      return;
    }
    onSubmit(text);
    setValue("");
  };

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
