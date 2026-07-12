/**
 * GENOME panel — auto-generates one control per gene straight from the
 * concept's genomeSpec. A "num" gene renders a single slider; a "list" gene
 * renders one slider per band in the current value array. Every change emits an
 * updated genome so the app can re-render. No gene names are hard-coded — new
 * concepts get a full control surface for free.
 */
import type { GeneSpec, Genome, GenomeSpec } from "../types";

type Props = {
  spec: GenomeSpec;
  genome: Genome;
  onChange: (next: Genome) => void;
};

/** Whether a gene rounds to integers (only num genes carry `int`). */
function isInt(gene: GeneSpec): boolean {
  return gene.kind === "num" && gene.int === true;
}

function fmt(value: number, gene: GeneSpec): string {
  return isInt(gene) ? String(Math.round(value)) : value.toFixed(2);
}

export function GenomePanel({ spec, genome, onChange }: Props) {
  const keys = Object.keys(spec);

  const setNum = (key: string, raw: string, gene: GeneSpec) => {
    const parsed = Number(raw);
    const value = isInt(gene) ? Math.round(parsed) : parsed;
    onChange({ ...genome, [key]: value });
  };

  const setBand = (key: string, index: number, raw: string, current: number[], gene: GeneSpec) => {
    const parsed = Number(raw);
    const value = isInt(gene) ? Math.round(parsed) : parsed;
    const nextBand = current.slice();
    nextBand[index] = value;
    onChange({ ...genome, [key]: nextBand });
  };

  const setColor = (key: string, hex: string) => {
    onChange({ ...genome, [key]: hex });
  };

  return (
    <div>
      {keys.map((key) => {
        const gene = spec[key];
        if (!gene) {
          return null;
        }
        const raw = genome[key];

        if (gene.kind === "color") {
          const active = typeof raw === "string" ? raw.toLowerCase() : "";
          return (
            <div class="gene" key={key} data-gene={key}>
              <div class="gene-head">
                <span>{gene.label}</span>
                <span class="gene-val">{typeof raw === "string" ? raw : "—"}</span>
              </div>
              <div class="swatches">
                {gene.palette.map((hex) => {
                  const selected = hex.toLowerCase() === active;
                  return (
                    <button
                      key={hex}
                      type="button"
                      class={`swatch${selected ? " active" : ""}`}
                      style={{ background: hex }}
                      aria-pressed={selected}
                      aria-label={`${gene.label} ${hex}`}
                      title={hex}
                      onClick={() => setColor(key, hex)}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        if (gene.kind === "list") {
          const band = Array.isArray(raw) ? raw : [];
          return (
            <div class="gene" key={key} data-gene={key}>
              <div class="gene-head">
                <span>{gene.label}</span>
                <span class="gene-val">[{band.map((v) => fmt(v, gene)).join(", ")}]</span>
              </div>
              <div class="band">
                {band.map((value, i) => (
                  <input
                    key={`${key}-${i}`}
                    type="range"
                    min={gene.min}
                    max={gene.max}
                    step={gene.step}
                    value={value}
                    aria-label={`${gene.label} band ${i + 1}`}
                    onInput={(e) =>
                      setBand(key, i, (e.currentTarget as HTMLInputElement).value, band, gene)
                    }
                  />
                ))}
              </div>
            </div>
          );
        }

        const value = typeof raw === "number" ? raw : gene.min;
        return (
          <div class="gene" key={key} data-gene={key}>
            <div class="gene-head">
              <span>{gene.label}</span>
              <span class="gene-val">{fmt(value, gene)}</span>
            </div>
            <input
              type="range"
              min={gene.min}
              max={gene.max}
              step={gene.step}
              value={value}
              aria-label={gene.label}
              onInput={(e) => setNum(key, (e.currentTarget as HTMLInputElement).value, gene)}
            />
          </div>
        );
      })}
    </div>
  );
}
