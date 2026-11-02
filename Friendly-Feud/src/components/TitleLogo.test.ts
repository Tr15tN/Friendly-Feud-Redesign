import { describe, expect, it } from "vitest";
import { splitTitle } from "./TitleLogo";

describe("splitTitle", () => {
  it("keeps a single word on one line, and a short phrase stays readable", () => {
    expect(splitTitle("Pereõhtu")).toEqual(["Pereõhtu", ""]);
    expect(splitTitle("Tamme pere")).toEqual(["Tamme", "pere"]);
    expect(splitTitle("Tammed")).toEqual(["Tammed", ""]);
  });

  it("balances a long name over two lines", () => {
    expect(splitTitle("Perekond Tamme suur sõda")).toEqual(["Perekond Tamme", "suur sõda"]);
  });

  it("never splits a single long word", () => {
    expect(splitTitle("Üliõpilasvennaskond")).toEqual(["Üliõpilasvennaskond", ""]);
  });

  it("ignores stray whitespace", () => {
    expect(splitTitle("  Tamme   pere  ")).toEqual(["Tamme", "pere"]);
  });
});
