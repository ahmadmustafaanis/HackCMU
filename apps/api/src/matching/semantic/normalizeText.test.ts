import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalizeText.js";

describe("normalizeText", () => {
  it("matches the spec example: lowercases, trims, and strips trailing punctuation", () => {
    expect(normalizeText("  TREADMILL!! ")).toBe("treadmill");
  });

  it("lowercases mixed-case input", () => {
    expect(normalizeText("Gym")).toBe("gym");
  });

  it("collapses internal multi-space runs to a single space", () => {
    expect(normalizeText("pickup   basketball    game")).toBe("pickup basketball game");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("   coffee chat   ")).toBe("coffee chat");
  });

  it("strips leading punctuation", () => {
    expect(normalizeText("¡¡workout")).toBe("workout");
  });

  it("strips punctuation on both ends while collapsing whitespace in between", () => {
    expect(normalizeText("  ...study session?!  ")).toBe("study session");
  });

  it("leaves internal punctuation (e.g. apostrophes) untouched", () => {
    expect(normalizeText("let's play basketball")).toBe("let's play basketball");
  });

  it("returns an empty string for input that is only whitespace/punctuation", () => {
    expect(normalizeText("   !!!   ")).toBe("");
  });
});
