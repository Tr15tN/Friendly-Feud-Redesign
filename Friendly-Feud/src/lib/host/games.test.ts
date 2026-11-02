import { describe, expect, it } from "vitest";
import { gameLabel, groupGames } from "./games";

describe("gameLabel", () => {
  it("turns file names into readable titles", () => {
    expect(gameLabel("games/en/normal/game_12.json")).toBe("Game 12");
    expect(gameLabel("games/en/themed/christmas-2.json")).toBe("Christmas 2");
    expect(gameLabel("games/et/tavalised/mäng_1_2021.json")).toBe("Mäng 1 2021");
    expect(gameLabel("games/et/teemalised/jõulueri_2020.json")).toBe("Jõulueri 2020");
  });
});

describe("groupGames", () => {
  const files = [
    "games/en/themed/tech.json",
    "games/en/normal/game_10.json",
    "games/en/normal/game_2.json",
    "games/en/normal/game_1.json",
    "games/en/themed/christmas.json",
  ];

  it("puts classic games before themed ones and sorts numbers naturally", () => {
    const groups = groupGames(files);
    expect(groups.map((g) => g.kind)).toEqual(["classic", "themed"]);
    expect(groups[0].options.map((o) => o.label)).toEqual(["Game 1", "Game 2", "Game 10"]);
    expect(groups[1].options.map((o) => o.label)).toEqual(["Christmas", "Tech"]);
    expect(groups[0].options[0].value).toBe("games/en/normal/game_1.json");
  });

  it("understands the Estonian folder names", () => {
    const groups = groupGames(["games/et/teemalised/suvi_2021.json", "games/et/tavalised/mäng_1_2021.json"]);
    expect(groups.map((g) => g.kind)).toEqual(["classic", "themed"]);
  });

  it("puts unknown folders in a last 'other' group and skips nothing", () => {
    const groups = groupGames(["games/en/custom/fun.json", "games/en/normal/game_1.json"]);
    expect(groups.map((g) => g.kind)).toEqual(["classic", "other"]);
    expect(groups[1].options).toHaveLength(1);
  });

  it("returns no groups for an empty list", () => {
    expect(groupGames([])).toEqual([]);
  });
});
