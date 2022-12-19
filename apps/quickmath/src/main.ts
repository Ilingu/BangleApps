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

let game: QuickMath;
const startGame = (complexity: Difficulty) => {
  game = QuickMath.newGame(complexity);
  game.newChallenge();
};

/* Initialisation */
const complexityMenu = {
  "": { title: "Challenge complexity", selected: 1 },
  "Easy (Simple math)": () => {
    E.showMenu();
    startGame(Difficulty.EASY);
  },
  "Medium (Advanced math)": () => {
    E.showMenu();
    startGame(Difficulty.MEDIUM);
  },
  "Hard (Expert math)": () => {
    E.showMenu();
    startGame(Difficulty.HARD);
  },
  "< Exit": E.showMenu,
};

g.clear(true);
Bangle.setLocked(false);
Bangle.setLCDPower(1);
Bangle.setLCDTimeout(600); // 10min timeout
isSupportedHW && E.showMenu(complexityMenu);
// Bangle.loadWidgets();
// Bangle.drawWidgets();
