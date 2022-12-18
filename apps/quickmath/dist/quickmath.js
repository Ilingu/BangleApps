"use strict";
class QuickMath {
  constructor(complexity) {
    this.generateChallenge = () => generateAlgebra(this.complexity);
    this.complexity = complexity;
  }
  static newGame(complexity) {
    if (!this.gameInstance) {
      this.gameInstance = new this(complexity);
    }
    return this.gameInstance;
  }
  newChallenge() {
    this.challenge = this.generateChallenge();
    this.displayChallenge();
    this.listenToAnswer();
  }
  displayChallenge() {
    var _a;
    if (!this.challenge) return;
    console.log({
      fake_answers: this.challenge.fake_answers,
      solution_set: this.challenge.solution_set,
    });
    if (this.challenge.fake_answers.length < 3) return;
    if (this.challenge.solution_set.length <= 0) return;
    let mw = Math.round(g.getWidth() / 2),
      mh = Math.round(g.getHeight() / 2);
    g.clear();
    g.setColor("#3c40c6");
    g.fillRect(0, 0, MAX_W, MAX_H);
    g.setColor("#ffffff");
    g.fillRect(0, mh + 2, MAX_W, mh - 2);
    g.fillRect(mw - 2, 0, mw + 2, MAX_H);
    g.setColor("#f53b57");
    g.fillEllipse(mw - 75, mh - 35, mw + 75, mh + 35);
    g.setColor("#ffffff");
    const FONT_SIZE = 20;
    g.setFont("Vector", FONT_SIZE);
    g.drawString(
      (_a = this.challenge) === null || _a === void 0 ? void 0 : _a.prompt,
      mw - 75,
      mh - FONT_SIZE / 2
    );
    const ThreeFakes = suffleArray(this.challenge.fake_answers).slice(0, 3);
    const OneTrue = suffleArray(this.challenge.solution_set)[0];
    const answerSet = suffleArray(ThreeFakes.concat(OneTrue), 2);
    if (answerSet.length !== 4) return;
    g.drawString(answerSet[0], mw - 73, mh - 73 + FONT_SIZE / 2);
    g.drawString(answerSet[1], mw - 73, mh + 73 / 2 + FONT_SIZE / 2);
    g.drawString(answerSet[2], mw + 20, mh - 73 + FONT_SIZE / 2);
    g.drawString(answerSet[3], mw + 20, mh + 73 / 2 + FONT_SIZE / 2);
  }
  listenToAnswer() {}
}
const generateAlgebra = (complexity) => {
  const hardAlgebra = complexity >= Difficulty.MEDIUM;
  const opLen = RandInt(1, hardAlgebra ? 3 : 2);
  let expressions = [];
  let prompt = "";
  {
    let skippedIteration = 0;
    for (let i = 0; i < opLen; i++) {
      const op = RandOperation(hardAlgebra);
      const sign = OperationToSign[op.toString()];
      const a = RandInt(-(hardAlgebra ? 1000 : 100), hardAlgebra ? 1000 : 100),
        b = RandInt(-(hardAlgebra ? 1000 : 100), hardAlgebra ? 1000 : 100);
      const isMinusMinus = sign === "-" && b < 0;
      const exprPrompt = `${a}${sign === "+" && b < 0 ? "" : sign}${
        isMinusMinus ? "(" : ""
      }${b}${isMinusMinus ? ")" : ""}`;
      const exprResult = computeExpr(exprPrompt);
      if (!isInteger(exprResult) && !hardAlgebra && skippedIteration < 1e4) {
        i--;
        skippedIteration++;
        continue;
      }
      const expr = {
        a,
        b,
        op,
        result: exprResult,
        prompt: exprPrompt,
      };
      expressions.push(expr);
    }
  }
  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i];
    if (i === expressions.length - 1) {
      prompt += `(${expr.prompt})`;
      break;
    }
    const inBetweenOp = RandOperation(hardAlgebra);
    prompt += `(${expr.prompt})${OperationToSign[inBetweenOp.toString()]}`;
  }
  const answer = computeExpr(prompt);
  const answerweight = Math.log(Math.abs(answer));
  const fake_answers = Array(10)
    .fill(null)
    .map(() =>
      Math.round(
        answer +
          RandInt(
            -(hardAlgebra ? 10 : 100) - answerweight,
            (hardAlgebra ? 10 : 100) + answerweight
          )
      )
    )
    .map((fa) => {
      if (Math.random() >= 0.75) return -fa;
      return fa;
    });
  return {
    prompt,
    type: "algebra",
    solution_set: [answer],
    fake_answers: fake_answers,
  };
};
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
const pushMessage = (msg, color) => {
  g.clear();
  g.setFontAlign(0, 0);
  g.setFont("6x8", 2);
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
const isSupportedHW = process.env.HWVERSION == 2;
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
let game;
const startGame = (complexity) => {
  game = QuickMath.newGame(complexity);
  game.newChallenge();
};
g.reset();
Bangle.setLocked(false);
Bangle.setLCDPower(1);
isSupportedHW && E.showMenu(complexityMenu);
var Difficulty;
(function (Difficulty) {
  Difficulty[(Difficulty["EASY"] = 0)] = "EASY";
  Difficulty[(Difficulty["MEDIUM"] = 1)] = "MEDIUM";
  Difficulty[(Difficulty["HARD"] = 2)] = "HARD";
})(Difficulty || (Difficulty = {}));
var Operation;
(function (Operation) {
  Operation[(Operation["PLUS"] = 0)] = "PLUS";
  Operation[(Operation["MINUS"] = 1)] = "MINUS";
  Operation[(Operation["MULTIPLY"] = 2)] = "MULTIPLY";
  Operation[(Operation["DIVIDE"] = 3)] = "DIVIDE";
  Operation[(Operation["MODULO"] = 4)] = "MODULO";
})(Operation || (Operation = {}));
const RandInt = (min, max) => {
  if (min >= max) {
    const tempmax = max;
    max = min;
    min = tempmax;
  }
  const delta = max - min;
  return Math.round(Math.random() * delta) + min;
};
const RandOperation = (modulo) => {
  const operation = [
    Operation.PLUS,
    Operation.MINUS,
    Operation.MULTIPLY,
    Operation.DIVIDE,
  ];
  if (modulo) operation.push(Operation.MODULO);
  return operation[RandInt(0, operation.length - 1)];
};
const OperationToSign = {
  0: "+",
  1: "-",
  2: "*",
  3: "/",
  4: "%",
};
const computeExpr = (expr) => {
  return Function(`"use strict"; return (${expr});`)();
};
const computeDerivative = (fn, x) => {
  const f = new Function("x", `return (${fn})`);
  const h = 1e-8;
  return Math.round((f(x + h) - f(x)) / h);
};
const suffleArray = (array, nb = 1) => {
  const copy = array.slice();
  for (let i = 0; i < nb; i++) copy.sort(() => Math.random() - 0.5);
  return copy;
};
const isInteger = (num) =>
  typeof num === "number" && isFinite(num) && Math.floor(num) === num;
