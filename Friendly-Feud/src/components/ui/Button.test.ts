import { describe, expect, it } from "vitest";
import { buttonClass } from "./button-class";

describe("buttonClass", () => {
  it("removes base px-4 when extra has px-2", () => {
    const cls = buttonClass("secondary", "px-2");
    expect(cls).toContain("px-2");
    expect(cls).not.toMatch(/\bpx-4\b/);
  });

  it("removes base justify-center when extra has justify-start", () => {
    const cls = buttonClass("secondary", "justify-start");
    expect(cls).toContain("justify-start");
    expect(cls).not.toMatch(/\bjustify-center\b/);
  });

  it("keeps base min-h-11 when extra only has lg:min-h-9", () => {
    const cls = buttonClass("secondary", "lg:min-h-9");
    expect(cls).toMatch(/\bmin-h-11\b/);
    expect(cls).toContain("lg:min-h-9");
  });

  it("keeps unrelated base utilities", () => {
    const cls = buttonClass("ghost", "px-2");
    expect(cls).toMatch(/\binline-flex\b/);
    expect(cls).toMatch(/\bborder\b/);
    expect(cls).toMatch(/\btext-sm\b/);
  });

  it("keeps variant colour classes", () => {
    const cls = buttonClass("primary", "px-2");
    expect(cls).toContain("bg-pro-accent");
    expect(cls).toContain("hover:bg-pro-accent-hover");
  });
});
