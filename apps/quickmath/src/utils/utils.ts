const suffleArray = <T = never>(array: T[], nb = 1): T[] => {
  const copy = array.slice(); // espruino intepreter doesn't support spead operator
  for (let i = 0; i < nb; i++) copy.sort(() => Math.random() - 0.5);
  return copy;
};

const randomUUID = (): string =>
  Date.now().toString() + Math.random().toString(36);

const rainbowColors = [
  "#f44336",
  "#ff9800",
  "#ffeb3b",
  "#4caf50",
  "#2196f3",
  "#673ab7",
  "#ee82ee",
];

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
