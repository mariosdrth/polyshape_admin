import { describe, it, expect } from "vitest";
import { normalizeContent, joinContentForEdit } from "../../src/util/normalizeContent";

describe("normalizeContent", () => {
  it("splits on double newlines and trims paragraphs", () => {
    const input = "  First paragraph  \n\nSecond paragraph\n\n\nThird paragraph ";
    const result = normalizeContent(input);
    expect(result).toEqual(["First paragraph", "Second paragraph", "Third paragraph"]);
  });

  it("removes empty paragraphs", () => {
    const input = "\n\nFirst\n\n\n\n\nSecond\n\n";
    const result = normalizeContent(input);
    expect(result).toEqual(["First", "Second"]);
  });

  it("handles Windows-style newlines", () => {
    const input = "First\r\n\r\nSecond\r\n\r\nThird";
    const result = normalizeContent(input);
    expect(result).toEqual(["First", "Second", "Third"]);
  });

  it("returns empty array for blank input", () => {
    expect(normalizeContent("   ")).toEqual([]);
  });
});

describe("joinContentForEdit", () => {
  it("joins array with double newlines", () => {
    const input = ["First", "Second", "Third"];
    const result = joinContentForEdit(input);
    expect(result).toBe("First\n\nSecond\n\nThird");
  });

  it("returns string unchanged if input is a string", () => {
    const input = "Single string paragraph";
    expect(joinContentForEdit(input)).toBe(input);
  });

  it("returns empty string for invalid input", () => {
    expect(joinContentForEdit(undefined)).toBe("");
    expect(joinContentForEdit(null)).toBe("");
    expect(joinContentForEdit(123 as unknown)).toBe("");
  });

  it("filters out empty or non-string entries", () => {
    const input = ["First", "", "  ", 123 as unknown, "Second"];
    const result = joinContentForEdit(input);
    expect(result).toBe("First\n\nSecond");
  });
});
