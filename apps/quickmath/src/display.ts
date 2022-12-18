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

const pushMessage = (msg: string, color: string) => {
  g.clear();
  g.setFontAlign(0, 0); // center font
  g.setFont("6x8", 2); // bitmap font, 2x magnified
  g.setColor(color);
  g.drawString(
    msg,
    Math.round(g.getWidth() / 2),
    Math.round(g.getHeight() / 2)
  );
};

const rainbowColors = [
  "#f44336",
  "#ff9800",
  "#ffeb3b",
  "#4caf50",
  "#2196f3",
  "#673ab7",
  "#ee82ee",
];
