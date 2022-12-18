const isSupportedHW = (process.env.HWVERSION as unknown as number) == 2;

const MAX_W = g.getWidth() - 1;
const MAX_H = g.getHeight() - 1;

const quit = () => {
  Bangle.setLocked(true);
  Bangle.showClock();
  Bangle.off();
};

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
g.reset();
// Bangle.loadWidgets();
// Bangle.drawWidgets();
// Bangle.setLCDTimeout(0);
Bangle.setLocked(false);
Bangle.setLCDPower(1);
isSupportedHW && E.showMenu(complexityMenu);
