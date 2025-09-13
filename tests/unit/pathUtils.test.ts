import { describe, it, expect } from "vitest";
import { lastPathSegment } from "../../src/util/pathUtils";

describe("lastPathSegment", () => {
  it("returns decoded last segment", () => {
    expect(lastPathSegment("/foo/bar/test%20file.json")).toBe("test file.json");
  });

  it("handles trailing slashes", () => {
    expect(lastPathSegment("/a/b/c/")).toBe("c");
  });

  it("handles paths without slashes", () => {
    expect(lastPathSegment("file.json")).toBe("file.json");
  });

  it("returns raw segment on decode error", () => {
    // "%2" is an invalid escape sequence and will throw
    expect(lastPathSegment("/a/b/bad%2")).toBe("bad%2");
  });
});

