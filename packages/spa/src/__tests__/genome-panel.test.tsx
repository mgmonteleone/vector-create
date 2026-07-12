import { fireEvent, render } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { GenomePanel } from "../components/GenomePanel";
import type { Genome, GenomeSpec } from "../types";

const COLOR_PALETTE = ["#ededf0", "#5CCC76", "#4FA3E3"];

const SPEC: GenomeSpec = {
  throatR: { kind: "num", min: 4, max: 12, step: 2, int: true, label: "throat radius" },
  flare: { kind: "num", min: 0.6, max: 0.9, step: 0.08, label: "concavity" },
  ringDurations: { kind: "list", min: 2.2, max: 5, step: 0.6, label: "ring pulse speeds" },
  meshColor: { kind: "color", palette: COLOR_PALETTE, label: "mesh colour" },
};

const GENOME: Genome = {
  throatR: 7,
  flare: 0.78,
  ringDurations: [3.2, 4.2, 2.6],
  meshColor: "#5CCC76",
};

describe("GenomePanel", () => {
  it("generates one control per gene from the genomeSpec", () => {
    const { container, getByLabelText } = render(
      <GenomePanel spec={SPEC} genome={GENOME} onChange={() => {}} />
    );

    // One .gene block per spec key.
    const geneBlocks = container.querySelectorAll(".gene");
    expect(geneBlocks.length).toBe(Object.keys(SPEC).length);

    // num genes -> a single slider each with the spec's bounds.
    const throat = getByLabelText("throat radius") as HTMLInputElement;
    expect(throat.type).toBe("range");
    expect(throat.min).toBe("4");
    expect(throat.max).toBe("12");
    expect(throat.step).toBe("2");
    expect(throat.value).toBe("7");

    // list gene -> one slider per band value.
    const bandSliders = container.querySelectorAll(
      '[data-gene="ringDurations"] input[type="range"]'
    );
    expect(bandSliders.length).toBe((GENOME.ringDurations as number[]).length);
  });

  it("triggers a genome change (re-render) when a slider moves", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <GenomePanel spec={SPEC} genome={GENOME} onChange={onChange} />
    );

    const flare = getByLabelText("concavity") as HTMLInputElement;
    fireEvent.input(flare, { target: { value: "0.82" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ flare: 0.82, throatR: 7 });
  });

  it("rounds integer genes on change", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <GenomePanel spec={SPEC} genome={GENOME} onChange={onChange} />
    );

    const throat = getByLabelText("throat radius") as HTMLInputElement;
    fireEvent.input(throat, { target: { value: "9.9" } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ throatR: 10 });
  });

  it("renders a swatch row for a colour gene with the active swatch highlighted", () => {
    const { container } = render(<GenomePanel spec={SPEC} genome={GENOME} onChange={() => {}} />);
    const swatches = container.querySelectorAll('[data-gene="meshColor"] .swatch');
    expect(swatches.length).toBe(COLOR_PALETTE.length);
    // The active colour (#5CCC76) is the highlighted swatch.
    const active = container.querySelectorAll('[data-gene="meshColor"] .swatch.active');
    expect(active.length).toBe(1);
    expect((active[0] as HTMLElement).getAttribute("title")).toBe("#5CCC76");
  });

  it("emits the chosen hex when a swatch is clicked", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <GenomePanel spec={SPEC} genome={GENOME} onChange={onChange} />
    );
    fireEvent.click(getByLabelText("mesh colour #4FA3E3"));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ meshColor: "#4FA3E3" });
  });

  it("updates only the moved band of a list gene", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <GenomePanel spec={SPEC} genome={GENOME} onChange={onChange} />
    );

    fireEvent.input(getByLabelText("ring pulse speeds band 2"), { target: { value: "4.8" } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ ringDurations: [3.2, 4.8, 2.6] });
  });
});
