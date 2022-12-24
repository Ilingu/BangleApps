const quit = () => {
  Bangle.setLocked(true);
  Bangle.showClock();
  Bangle.off();
};

const isSupportedHW = (process.env.HWVERSION as unknown as number) == 2;
if (!isSupportedHW) {
  let iteration = 0;
  let rainbowMsg = setInterval(() => {
    if (iteration > 20) {
      clearInterval(rainbowMsg);
      iteration = 0;
      return quit();
    }

    pushMessage(
      "Hardware \nnot supported!",
      rainbowColors[RandInt(0, rainbowColors.length - 1)]
    );
    iteration++;
  }, 1000);
}

/* Initialisation */
const globalConfig: GameConfig = {
  difficulty: 0,
  challenge: {
    type: "equation",
    exercises: ["affine"],
  },
};
const mainMenu = {
  "": { title: "Challenge complexity", selected: 1 },
  "Easy (Simple math)": () => {
    globalConfig.difficulty = Difficulty.EASY;
    E.showMenu(renderChallengeTypeMenu());
  },
  "Medium (Advanced math)": () => {
    globalConfig.difficulty = Difficulty.MEDIUM;
    E.showMenu(renderChallengeTypeMenu());
  },
  "Hard (Expert math)": () => {
    globalConfig.difficulty = Difficulty.HARD;
    E.showMenu(renderChallengeTypeMenu());
  },
  "< Exit": quit,
};

g.clear(true);
Bangle.setLocked(false);
Bangle.setLCDPower(1);
Bangle.setLCDTimeout(600); // 10min timeout
isSupportedHW && E.showMenu(mainMenu);
// Bangle.loadWidgets();
// Bangle.drawWidgets();
