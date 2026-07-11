/**
 * Vitest setup: register @testing-library/preact's automatic DOM cleanup and
 * ensure a clean localStorage between tests.
 */
import { cleanup } from "@testing-library/preact";
import { afterEach, beforeEach } from "vitest";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});
