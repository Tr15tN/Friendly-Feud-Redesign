import type { StepApi } from "@/components/Demo/runner";
import { DEMO_ROOM } from "@/lib/demo/demoGame";

/** Texts are English i18n keys; the UI translates them. */
export interface DemoStep {
  id: string;
  title: string;
  body: string;
  /** Performs the step on the real console. Must leave the console in a state the next step can start from. */
  run: (api: StepApi) => Promise<void>;
}

/** Players who join by themselves after the visitor's own phone, as [name, team]. */
const FRIENDS: [string, number][] = [
  ["Mart", 1],
  ["Liis", 0],
  ["Jaan", 1],
];

async function firstBuiltInSet(api: StepApi): Promise<string> {
  const select = (await api.waitFor("#gameSelector")) as HTMLSelectElement;
  for (let i = 0; i < 40; i++) {
    const option = Array.from(select.options).find((o) => o.value && !o.disabled);
    if (option) return option.value;
    await api.wait(100);
  }
  throw new Error("The demo question set did not load");
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: "welcome",
    title: "Welcome to the demo",
    body: "This is a practice room. Nothing you do here is sent anywhere, so click around freely. Each step does the job for you while you watch. You can skip the animation or go back at any time.",
    run: async (api) => {
      await api.wait(400);
    },
  },
  {
    id: "load",
    title: "Load a question set",
    body: "Every game starts with a question set. Pick one of the built-in sets, or upload your own file. The list follows the language you are using.",
    run: async (api) => {
      api.highlight("#gameSelector");
      api.caption(api.t("Choosing the demo set…"));
      await api.wait(900);
      await api.select("#gameSelector", await firstBuiltInSet(api));
      api.caption(null);
      api.highlight("#startRoundOneButton");
      await api.wait(1600);
    },
  },
  {
    id: "teams",
    title: "Name your teams",
    body: "Give both teams a name and the title screen a line of text. The TV and the players' phones show them right away.",
    run: async (api) => {
      api.highlight("#teamOneNameInput", "#teamTwoNameInput", "#titleTextInput");
      await api.wait(700);
      await api.type("#teamOneNameInput", api.t("Reds"));
      await api.type("#teamTwoNameInput", api.t("Blues"));
      await api.type("#titleTextInput", api.t("Family night"));
      await api.wait(900);
    },
  },
  {
    id: "players",
    title: "Players join on their phones",
    body: "Players open the site, type your 4-letter room code and a name, then pick a team. They show up in the lobby as they join.",
    run: async (api) => {
      api.showDevices({ phone: true });
      api.highlight("#lobbyJoinInfo");
      api.caption(api.t("The room code is in the lobby and in the top bar."));
      await api.wait(2200);
      api.highlight("@phone");
      api.caption(api.t("This is a player's phone."));
      await api.type("phone:#roomCodeInput", DEMO_ROOM);
      await api.type("phone:#playerNameInput", "Anna");
      await api.click("phone:#joinRoomButton");
      await api.click("phone:#joinTeam1");
      await api.click("phone:#registerBuzzerButton");
      api.highlight("#lobbyRoster");
      api.caption(api.t("Anna is in. Friends are joining too…"));
      for (const [name, team] of FRIENDS) {
        await api.wait(1000);
        api.server.addPlayer(name, team);
      }
      await api.wait(1500);
      api.caption(null);
    },
  },
  {
    id: "tv",
    title: "Put the board on the TV",
    body: "Click Open Game Window and move that tab to the TV or projector. This screen stays with you as the control panel.",
    run: async (api) => {
      api.showDevices({ tv: true });
      api.highlight("#openGameWindowButton");
      await api.wait(1200);
      await api.click("#openGameWindowButton");
      api.highlight("@tv");
      api.caption(api.t("In a real game this opens a new tab. Here the TV is on the right."));
      await api.wait(3000);
      api.caption(null);
    },
  },
  {
    id: "start",
    title: "Start round 1",
    body: "When everyone is in, press Start Round 1. The TV switches to the board and scoring begins.",
    run: async (api) => {
      api.highlight("#startRoundOneButton");
      await api.wait(800);
      await api.click("#startRoundOneButton");
      api.highlight("#currentRoundQuestionText", "@tv");
      await api.wait(2600);
    },
  },
  {
    id: "buzz",
    title: "Buzz in",
    body: "Players buzz from their phones. The first buzz shows on the TV and on your console, and buzzers reset when you change round.",
    run: async (api) => {
      api.highlight("@phone");
      await api.wait(900);
      await api.click("phone:#buzzerButton");
      api.highlight("#firstBuzzChip", "@tv");
      api.caption(api.t("The first buzz is shown on the TV and on your console."));
      await api.wait(2800);
      api.caption(null);
      api.highlight("#playersDrawerButton");
      await api.click("#playersDrawerButton");
      api.highlight("#playersDrawer");
      api.caption(api.t("The Players drawer lists the buzz order and who is on each team."));
      await api.wait(3200);
      api.caption(null);
      api.key("Escape");
      await api.wait(500);
    },
  },
  {
    id: "reveal",
    title: "Reveal answers",
    body: "Click an answer to flip it on the board. The pot grows with every answer. The keys 1 to 8 do the same, which is handy when your hands are busy.",
    run: async (api) => {
      api.highlight("#question0Button", "@tv");
      await api.click("#question0Button");
      await api.wait(1300);
      api.highlight("#question1Button", "@tv");
      await api.click("#question1Button");
      await api.wait(1300);
      api.highlight("#question2Button", "@tv");
      api.caption(api.t("Pressing the 3 key reveals the third answer."));
      await api.wait(1200);
      api.key("3");
      await api.wait(1800);
      api.caption(null);
    },
  },
  {
    id: "strikes",
    title: "Strikes and stealing",
    body: "A wrong answer is a strike: press Strike for the team that guessed. After 3 strikes the other team gets a chance to steal the pot.",
    run: async (api) => {
      api.highlight("#team0MistakeButton", "@tv");
      for (let i = 0; i < 3; i++) {
        await api.click("#team0MistakeButton");
        await api.wait(1100);
      }
      api.highlight("#stealHint");
      await api.wait(3200);
    },
  },
  {
    id: "bank",
    title: "Bank the points",
    body: "Give the pot to whoever wins the round. Made a mistake? Undo takes back the last action, even a bank.",
    run: async (api) => {
      api.highlight("#team1GivePointsButton", "@tv");
      await api.click("#team1GivePointsButton");
      api.highlight("#adminTeam1Points", "@tv");
      await api.wait(2400);
      api.caption(api.t("Banked the wrong team? Undo it."));
      api.highlight("#undoButton");
      await api.click("#undoButton");
      await api.wait(1200);
      api.caption(null);
      api.highlight("#team1GivePointsButton", "@tv");
      await api.click("#team1GivePointsButton");
      await api.wait(1800);
    },
  },
  {
    id: "rounds",
    title: "Next round and the Flow menu",
    body: "Next Round clears the strikes and buzzers and starts a fresh pot. The Flow menu jumps to any round, back to the title card, or on to Fast Money.",
    run: async (api) => {
      api.highlight("#nextRoundButton");
      await api.click("#nextRoundButton");
      api.highlight("@tv");
      await api.wait(2000);
      api.highlight("#flowMenuButton");
      await api.click("#flowMenuButton");
      api.caption(api.t("The Flow menu holds everything that changes where the game is."));
      await api.wait(3200);
      api.caption(null);
      api.key("Escape");
      await api.wait(500);
    },
  },
  {
    id: "pad",
    title: "A real buzzer",
    body: "A USB buzzer works like a keyboard key. It is one shared button, so the console asks Who was first? and you pick the team.",
    run: async (api) => {
      api.highlight("@tv");
      api.caption(api.t("Someone pressed the physical buzzer."));
      await api.wait(1200);
      api.server.padBuzz();
      await api.wait(1400);
      api.caption(null);
      api.highlight("#whoWasFirstDialog");
      await api.wait(2600);
      await api.click("#whoWasFirstTeam1");
      api.highlight("#firstBuzzChip", "@tv");
      await api.wait(2200);
    },
  },
  {
    id: "fastmoney",
    title: "Fast Money",
    body: "The final round. Start the timer, type each answer, pick the matching answer from the list and reveal it on the TV, then award the points.",
    run: async (api) => {
      api.highlight("#phaseFastMoneyButton");
      await api.click("#phaseFastMoneyButton");
      api.highlight("#finalRoundNumberText", "@tv");
      await api.wait(1800);
      api.highlight("#startTimerButton", "@tv");
      await api.click("#startTimerButton");
      api.highlight("#finalRoundAnswer0Input", "#finalRoundAnswer0Selector");
      await api.type("#finalRoundAnswer0Input", api.t("Dog"));
      await api.select("#finalRoundAnswer0Selector", "1");
      api.highlight("#finalRoundAnswer0RevealButton", "@tv");
      await api.click("#finalRoundAnswer0RevealButton");
      await api.wait(900);
      api.highlight("#finalRoundAnswers0SubmitButton", "@tv");
      await api.click("#finalRoundAnswers0SubmitButton");
      await api.click("#stopTimerButton");
      api.highlight("@tv");
      await api.wait(2400);
    },
  },
  {
    id: "done",
    title: "You are ready to host",
    body: "That is the whole game. The quickstart has a one-page cheat sheet, and the full guide covers every setting. When you are ready, start a real room.",
    run: async (api) => {
      await api.wait(400);
    },
  },
];
