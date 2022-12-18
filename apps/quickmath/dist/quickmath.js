"use strict";
const quit = () => {
    Bangle.setLocked(true);
    Bangle.showClock();
    Bangle.off();
};
const isSupportedHW = process.env.HWVERSION == 2;
if (!isSupportedHW) {
    let iteration = 0;
    let rainbowMsg = setInterval(() => {
        if (iteration > 20) {
            clearInterval(rainbowMsg);
            iteration = 0;
            return quit();
        }
        pushMessage("Hardware \nnot supported!", rainbowColors[RandInt(0, rainbowColors.length - 1)]);
        iteration++;
    }, 1000);
}
let game;
const startGame = (complexity) => {
    game = QuickMath.newGame(complexity);
    game.newChallenge();
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
g.clear(true);
Bangle.setLocked(false);
Bangle.setLCDPower(1);
isSupportedHW && E.showMenu(complexityMenu);
class QuickMath {
    constructor(complexity) {
        this.complexity = complexity;
    }
    static newGame(complexity) {
        if (!this.gameInstance) {
            this.gameInstance = new this(complexity);
        }
        return this.gameInstance;
    }
    newChallenge() {
        const challenge = new Challenge(this.complexity, "algebra");
        const rightAnswerPos = challenge.display();
        if (rightAnswerPos === undefined)
            return quit();
        this.waitAnswer()
            .then((answer) => {
            console.log({ answer });
            console.log({ isRight: rightAnswerPos === answer });
        })
            .catch(this.newChallenge);
    }
    waitAnswer() {
        return new Promise((res, rej) => {
            let unsub = ScreenEvents.listener.on("tap", (ev) => {
                ScreenEvents.listener.off("tap", unsub[1]);
                if (!ev["xy"])
                    return;
                const isLeft = ev.xy.x < mw, isTop = ev.xy.y < mh;
                if (isLeft && isTop)
                    return res(0);
                if (isLeft && !isTop)
                    return res(1);
                if (!isLeft && isTop)
                    return res(2);
                if (!isLeft && !isTop)
                    return res(3);
                return rej("no distinc area");
            });
        });
    }
}
const powRegex = /Math\.pow\(([0-9]+),([0-9]+)\)/;
class Challenge {
    constructor(complexity, type) {
        if (type === "algebra")
            this.challenge = Challenge.newAlgebraChallenge(complexity);
        else if (type === "equation")
            this.challenge = Challenge.newEquationChallenge(complexity);
        else
            this.challenge = Challenge.newAlgebraChallenge(complexity);
    }
    display() {
        return displayChallenge(this.challenge);
    }
    static newAlgebraChallenge(complexity) {
        const hardAlgebra = complexity >= Difficulty.MEDIUM;
        const opLen = RandInt(1, hardAlgebra ? 3 : 2);
        let expressions = [];
        let jsprompt = "", userprompt = "";
        for (let i = 0; i < opLen; i++) {
            const op = RandOperation(hardAlgebra, hardAlgebra);
            const sign = OperationToSign[op.toString()];
            const derivation = hardAlgebra ? 1000 : 100;
            const tenthDerivation = derivation / 10;
            let a, b;
            if (op === Operation.DIVIDE) {
                b = RandInt(-derivation, derivation);
                a = RandInt(-tenthDerivation, tenthDerivation) * b;
            }
            else if (op === Operation.POWER) {
                a = RandInt(-tenthDerivation, tenthDerivation);
                b = RandInt(-5, 5);
            }
            else {
                a = RandInt(-derivation, derivation);
                b = RandInt(-derivation, derivation);
            }
            const wrapA = sign === "**" && a < 0;
            const wrapB = (sign === "-" || sign === "*" || sign === "**") && b < 0;
            let exprPrompt = `${wrapA ? "(" : ""}${a}${wrapA ? ")" : ""}${sign === "+" && b < 0 ? "" : sign}${wrapB ? "(" : ""}${b}${wrapB ? ")" : ""}`;
            if (op === Operation.POWER)
                exprPrompt = `Math.pow(${a},${b})`;
            const exprResult = computeExpr(exprPrompt);
            const expr = {
                a,
                b,
                op,
                result: exprResult,
                prompt: exprPrompt,
            };
            expressions.push(expr);
        }
        for (let i = 0; i < expressions.length; i++) {
            const expr = expressions[i];
            const uprompt = expr.op === Operation.POWER ? `${expr.a}^${expr.b}` : expr.prompt;
            if (i === expressions.length - 1) {
                jsprompt += `(${expr.prompt})`;
                userprompt += `(${uprompt})`;
                break;
            }
            const inBetweenOp = RandOperation(false, true);
            jsprompt += `(${expr.prompt})${OperationToSign[inBetweenOp.toString()]}`;
            userprompt += `(${uprompt})${OperationToSign[inBetweenOp.toString()]}`;
        }
        const answer = computeExpr(jsprompt);
        const answerweight = Math.log(Math.abs(answer));
        const fake_answers = Array(10)
            .fill(null)
            .map(() => Math.round(answer +
            RandInt(-(hardAlgebra ? 10 : 100) - answerweight, (hardAlgebra ? 10 : 100) + answerweight)))
            .map((fa) => {
            if (Math.random() >= 0.75)
                return -fa;
            return fa;
        });
        return {
            prompt: userprompt,
            type: "algebra",
            solution_set: [answer],
            fake_answers: fake_answers,
        };
    }
}
Challenge.newEquationChallenge = (complexity) => {
    return {
        type: "equation",
        prompt: "-2x**2 + x + 1 = 0",
        fake_answers: [0],
        solution_set: [1, -0.5],
    };
};
class ScreenEvents {
    constructor() {
        this.tapListener = {};
        this.swipeListener = {};
        this.listenToScreenEvents();
    }
    static get listener() {
        if (!this.DisplayEvent) {
            this.DisplayEvent = new this();
        }
        return this.DisplayEvent;
    }
    on(ev, cb) {
        const uid = ev + randomUUID();
        if (ev === "tap")
            this.tapListener[uid] = cb;
        else if (ev === "swipe")
            this.swipeListener[uid] = cb;
        else
            return [false, ""];
        return [true, uid];
    }
    off(ev, id) {
        if (!id.startsWith(ev))
            return false;
        if (ev === "tap") {
            if (!this.tapListener[id])
                return false;
            delete this.tapListener[id];
            return true;
        }
        if (ev === "swipe") {
            if (!this.swipeListener[id])
                return false;
            delete this.swipeListener[id];
            return true;
        }
        return false;
    }
    listenToScreenEvents() {
        Bangle.on("touch", (btn, xy) => {
            Object.values(this.tapListener).forEach((cb) => cb({ btn, xy }));
        });
        Bangle.on("swipe", (directionLR, directionUD) => {
            Object.values(this.swipeListener).forEach((cb) => cb({ directionLR, directionUD }));
        });
    }
}
const displayChallenge = (challenge) => {
    if (!challenge)
        return;
    console.log(challenge.solution_set);
    if (challenge.fake_answers.length < 3)
        return;
    if (challenge.solution_set.length <= 0)
        return;
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
    g.drawString(challenge.prompt, mw - 75, mh - FONT_SIZE / 2);
    const ThreeFakes = suffleArray(challenge.fake_answers).slice(0, 3);
    const OneTrue = suffleArray(challenge.solution_set)[0];
    const answerSet = suffleArray(ThreeFakes.concat(OneTrue), 2);
    if (answerSet.length !== 4)
        return;
    g.drawString(answerSet[0], mw - 73, mh - 73 + FONT_SIZE / 2);
    g.drawString(answerSet[1], mw - 73, mh + 73 / 2 + FONT_SIZE / 2);
    g.drawString(answerSet[2], mw + 20, mh - 73 + FONT_SIZE / 2);
    g.drawString(answerSet[3], mw + 20, mh + 73 / 2 + FONT_SIZE / 2);
    return answerSet.indexOf(OneTrue);
};
const MAX_W = g.getWidth() - 1;
const MAX_H = g.getHeight() - 1;
const mw = Math.round(g.getWidth() / 2), mh = Math.round(g.getHeight() / 2);
const RandInt = (min, max) => {
    if (min >= max) {
        const tempmax = max;
        max = min;
        min = tempmax;
    }
    const delta = max - min;
    return Math.round(Math.random() * delta) + min;
};
const RandOperation = (power = false, modulo = false) => {
    const operation = [
        Operation.PLUS,
        Operation.MINUS,
        Operation.MULTIPLY,
        Operation.DIVIDE,
    ];
    if (power)
        operation.push(Operation.POWER);
    if (modulo)
        operation.push(Operation.MODULO);
    return operation[RandInt(0, operation.length - 1)];
};
const OperationToSign = {
    "0": "+",
    "1": "-",
    "2": "*",
    "3": "/",
    "4": "**",
    "5": "%",
};
const computeExpr = (expr) => {
    return Function(`"use strict"; return (${expr});`)();
};
const computeDerivative = (fn, x) => {
    const f = new Function("x", `return (${fn})`);
    const h = 1e-8;
    return Math.round((f(x + h) - f(x)) / h);
};
var Difficulty;
(function (Difficulty) {
    Difficulty[Difficulty["EASY"] = 0] = "EASY";
    Difficulty[Difficulty["MEDIUM"] = 1] = "MEDIUM";
    Difficulty[Difficulty["HARD"] = 2] = "HARD";
})(Difficulty || (Difficulty = {}));
var Operation;
(function (Operation) {
    Operation[Operation["PLUS"] = 0] = "PLUS";
    Operation[Operation["MINUS"] = 1] = "MINUS";
    Operation[Operation["MULTIPLY"] = 2] = "MULTIPLY";
    Operation[Operation["DIVIDE"] = 3] = "DIVIDE";
    Operation[Operation["POWER"] = 4] = "POWER";
    Operation[Operation["MODULO"] = 5] = "MODULO";
})(Operation || (Operation = {}));
const suffleArray = (array, nb = 1) => {
    const copy = array.slice();
    for (let i = 0; i < nb; i++)
        copy.sort(() => Math.random() - 0.5);
    return copy;
};
const isInteger = (num) => typeof num === "number" && isFinite(num) && Math.floor(num) === num;
const randomUUID = () => Date.now().toString() + Math.random().toString(36);
const rainbowColors = [
    "#f44336",
    "#ff9800",
    "#ffeb3b",
    "#4caf50",
    "#2196f3",
    "#673ab7",
    "#ee82ee",
];
const pushMessage = (msg, color) => {
    g.clear();
    g.setFontAlign(0, 0);
    g.setFont("6x8", 2);
    g.setColor(color);
    g.drawString(msg, Math.round(g.getWidth() / 2), Math.round(g.getHeight() / 2));
};
