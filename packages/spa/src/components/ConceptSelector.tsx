/**
 * CONCEPT selector — switch between the built-in wormhole and any
 * agent-created concepts. Remote-only concepts (not registered in local core)
 * are marked so the user knows they require the server.
 */
import { isLocalConcept } from "../preview";
import type { ConceptSummary } from "../types";

type Props = {
  concepts: ConceptSummary[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ConceptSelector({ concepts, activeId, onSelect }: Props) {
  return (
    <ul class="concept-list">
      {concepts.map((c) => {
        const remote = !isLocalConcept(c.id);
        return (
          <li key={c.id}>
            <button
              type="button"
              class={`${c.id === activeId ? "active" : ""} ${remote ? "remote" : ""}`}
              onClick={() => onSelect(c.id)}
              aria-pressed={c.id === activeId}
            >
              {c.title}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
