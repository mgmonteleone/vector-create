import { act, fireEvent, render } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromptBar } from "../components/PromptBar";

describe("PromptBar", () => {
  it("shows the input form when idle and submits trimmed text", () => {
    const onSubmit = vi.fn();
    const { getByLabelText, container } = render(<PromptBar onSubmit={onSubmit} />);

    const input = getByLabelText("prompt") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "  wider mouths  " } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith("wider mouths");
  });

  it("shows an animated working state with the in-flight prompt while busy", () => {
    const { container, getByRole } = render(
      <PromptBar onSubmit={() => {}} disabled busyPrompt="make the mesh lines blue" />
    );

    // No input while working; a live status region instead.
    expect(container.querySelector("input")).toBeNull();
    const status = getByRole("status");
    expect(status.textContent).toContain("agent working on:");
    expect(status.textContent).toContain("make the mesh lines blue");
    expect(container.querySelector(".spinner")).not.toBeNull();
    expect(container.querySelector(".cursor.blink")).not.toBeNull();
  });

  describe("elapsed counter", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("ticks an elapsed-seconds counter while busy", () => {
      const { container } = render(
        <PromptBar onSubmit={() => {}} disabled busyPrompt="steer it" />
      );
      expect(container.querySelector(".elapsed")?.textContent).toBe("0s");
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(container.querySelector(".elapsed")?.textContent).toBe("2s");
    });
  });

  it("does not show the working state when busy without a prompt", () => {
    const { container } = render(<PromptBar onSubmit={() => {}} disabled />);
    // Idle-looking (still the form), since there is no prompt in flight.
    expect(container.querySelector("form.prompt")).not.toBeNull();
    expect(container.querySelector(".prompt.working")).toBeNull();
  });
});
