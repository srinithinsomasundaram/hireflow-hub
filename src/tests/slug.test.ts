import { describe, it, expect } from "vitest";
import { slugify } from "../lib/slug";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Acme Inc")).toBe("acme-inc");
  });

  it("strips special characters", () => {
    expect(slugify("Hello, World! 2024")).toBe("hello-world-2024");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --foo--  ")).toBe("foo");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});
