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
Bangle.setLCDTimeout(600);
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
        const displayInfo = challenge.display();
        if (displayInfo === undefined || displayInfo.rightPos === undefined)
            return quit();
        let promptOffset = 0;
        const unsub = WatchEvents.listener.on("drag", (ev) => {
            if (ev.dx <= -1)
                promptOffset += 4;
            if (ev.dx >= 1)
                promptOffset -= 4;
            challenge.display({ promptOffset, answerSet: displayInfo.answerSet });
        });
        this.waitAnswer()
            .then((answer) => {
            WatchEvents.listener.off("drag", unsub[1]);
            const isRight = displayInfo.rightPos === answer;
            const rightAnswer = displayInfo.answerSet[displayInfo.rightPos];
            Display.displayResult(isRight, rightAnswer).then(() => this.newChallenge());
        })
            .catch(() => {
            WatchEvents.listener.off("drag", unsub[1]);
            this.newChallenge();
        });
    }
    waitAnswer() {
        return new Promise((res, rej) => {
            const unsub = WatchEvents.listener.on("tap", (ev) => {
                WatchEvents.listener.off("tap", unsub[1]);
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
class Challenge {
    constructor(complexity, type) {
        if (type === "algebra")
            this.challenge = Challenge.newAlgebraChallenge(complexity);
        else if (type === "equation")
            this.challenge = Challenge.newEquationChallenge(complexity);
        else
            this.challenge = Challenge.newAlgebraChallenge(complexity);
    }
    display(options) {
        return Display.displayChallenge(this.challenge, options);
    }
    static newAlgebraChallenge(complexity) {
        if (complexity === Difficulty.HARD && Math.random() >= 0.85) {
            const op = RandOperation(true, false, false);
            let complexA = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));
            let complexB = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));
            let answer;
            let prompt = "";
            switch (op) {
                case Operation.PLUS:
                    prompt = `${complexA.toString()} + ${complexB.toString()}`;
                    answer = complexA.Add(complexB);
                    break;
                case Operation.MINUS:
                    prompt = `${complexA.toString()} - ${complexB.toString()}`;
                    answer = complexA.Subtract(complexB);
                    break;
                case Operation.MULTIPLY:
                    prompt = `(${complexA.toString()})(${complexB.toString()})`;
                    answer = complexA.Multiply(complexB);
                    break;
                case Operation.DIVIDE:
                    complexA = complexA.Multiply(complexB);
                    prompt = `(${complexA.toString()}) / (${complexB.toString()})`;
                    answer = complexA.Divide(complexB);
                    break;
                default:
                    answer = new ComplexNumber(1, 1);
                    break;
            }
            const answerweight = answer.Abs() !== 0 ? Math.round(Math.log(answer.Abs())) : 0;
            const RandWeight = 10 + answerweight;
            const fake_answers = Array(10)
                .fill(null)
                .map(() => {
                let derivation = new ComplexNumber(RandInt(-RandWeight, RandWeight), RandInt(-RandWeight, RandWeight));
                let whileIt = 0;
                while (derivation.Abs() === 0) {
                    if (whileIt > 1e4) {
                        return null;
                    }
                    whileIt++;
                    derivation = new ComplexNumber(RandInt(-RandWeight, RandWeight), RandInt(-RandWeight, RandWeight));
                }
                return answer.Add(derivation);
            })
                .filter((x) => x)
                .map((fa) => {
                if (Math.random() >= 0.9)
                    return fa.Times(-1);
                if (Math.random() >= 0.9)
                    return fa.Conjugate();
                return fa;
            })
                .map((x) => x.toString());
            return {
                type: "complex_algebra",
                prompt,
                solution_set: [answer.toString()],
                fake_answers: fake_answers,
            };
        }
        const hardAlgebra = complexity >= Difficulty.MEDIUM;
        const opLen = RandInt(1, complexity + 2);
        let expressions = [];
        let jsprompt = "", userprompt = "";
        for (let i = 0; i < opLen; i++) {
            const op = RandOperation(true, hardAlgebra, hardAlgebra);
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
                b = RandInt(0, 5);
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
            const inBetweenOp = RandOperation(false, false, true);
            jsprompt += `(${expr.prompt})${OperationToSign[inBetweenOp.toString()]}`;
            userprompt += `(${uprompt})${OperationToSign[inBetweenOp.toString()]}`;
        }
        const answer = computeExpr(jsprompt);
        const answerweight = answer !== 0 ? Math.log(Math.abs(answer)) : 0;
        const fake_answers = Array(10)
            .fill(null)
            .map(() => {
            let derivation = RandInt(-(hardAlgebra ? 10 : 100) - answerweight, (hardAlgebra ? 10 : 100) + answerweight);
            let whileIt = 0;
            while (derivation === 0) {
                if (whileIt > 1e4) {
                    return null;
                }
                whileIt++;
                derivation = RandInt(-(hardAlgebra ? 10 : 100) - answerweight, (hardAlgebra ? 10 : 100) + answerweight);
            }
            return Math.round(answer + derivation);
        })
            .filter((x) => typeof x === "number")
            .map((fa) => {
            if (Math.random() >= 0.75)
                return -fa;
            return fa;
        })
            .map((x) => x.toString());
        return {
            prompt: userprompt,
            type: "algebra",
            solution_set: [`${answer}`],
            fake_answers: fake_answers,
        };
    }
}
Challenge.newEquationChallenge = (complexity) => {
    return {
        type: "equation",
        prompt: "-2x**2 + x + 1 = 0",
        fake_answers: ["0"],
        solution_set: ["1", "-0.5"],
    };
};
class WatchEvents {
    constructor() {
        this.tapListener = {};
        this.swipeListener = {};
        this.dragListener = {};
        this.btnListener = {};
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
        else if (ev === "drag")
            this.dragListener[uid] = cb;
        else if (ev === "btn_pressed")
            this.btnListener[uid] = cb;
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
        if (ev === "drag") {
            if (!this.dragListener[id])
                return false;
            delete this.dragListener[id];
            return true;
        }
        if (ev === "btn_pressed") {
            if (!this.btnListener[id])
                return false;
            delete this.btnListener[id];
            return true;
        }
        return false;
    }
    listenToScreenEvents() {
        Bangle.on("touch", (btn, xy) => {
            Object.values(this.tapListener).forEach((cb) => cb({ btn, xy }));
        });
        Bangle.on("drag", (ev) => {
            Object.values(this.dragListener).forEach((cb) => cb(ev));
        });
        Bangle.on("swipe", (directionLR, directionUD) => {
            Object.values(this.swipeListener).forEach((cb) => cb({ directionLR, directionUD }));
        });
    }
}
class Display {
    static displayResult(isRight, rightAnswer) {
        g.clear(true);
        if (isRight)
            g.setColor("#00ff00");
        else
            g.setColor("#ff0000");
        g.fillRect(0, 0, MAX_W, MAX_H);
        g.setColor("#ffffff");
        g.setFont("Vector", FONT_SIZE);
        g.setFontAlign(0, 0, 0);
        const str = isRight ? "Right!" : `Wrong!\nAnswer was:\n${rightAnswer}`;
        g.drawString(str, mw, mh);
        return new Promise((res) => {
            setTimeout(res, 4000);
        });
    }
    static computeFont(str, containerWidth, limit) {
        if (str.length * CHAR_LEN >= containerWidth) {
            const perfectSize = FONT_CHAR * (containerWidth / str.length);
            return perfectSize <= 10 && limit ? FONT_SIZE / 1.5 : perfectSize;
        }
        return FONT_SIZE;
    }
    static displayChallenge(challenge, options) {
        if (!challenge)
            return;
        console.log(challenge.solution_set);
        if (challenge.fake_answers.length < 3)
            return;
        if (challenge.solution_set.length <= 0)
            return;
        g.clear();
        g.setColor("#000000");
        g.fillRect(0, 0, MAX_W, MAX_H);
        g.setColor("#ffffff");
        g.fillRect(0, mh + 2, MAX_W, mh - 2);
        g.fillRect(mw - 2, 0, mw + 2, MAX_H);
        g.setColor("#f00");
        g.fillEllipse(mw - 75, mh - 35, mw + 75, mh + 35);
        g.setColor("#ffffff");
        g.setFontAlign(0, 0, 0);
        g.setFont("Vector", Display.computeFont(challenge.prompt, 150, true));
        g.drawString(challenge.prompt, mw - ((options && options.promptOffset) || 0), mh);
        const ThreeFakes = suffleArray(challenge.fake_answers).slice(0, 3);
        const OneTrue = suffleArray(challenge.solution_set)[0];
        const answerSet = (options && options.answerSet) ||
            suffleArray(ThreeFakes.concat(OneTrue), 2);
        if (answerSet.length !== 4)
            return;
        g.setFont("Vector", Display.computeFont(answerSet[0], 80, false));
        g.drawString(answerSet[0], mw - mw / 2, mh - mh / 2);
        g.setFont("Vector", Display.computeFont(answerSet[1], 80, false));
        g.drawString(answerSet[1], mw - mw / 2, mh + mh / 2);
        g.setFont("Vector", Display.computeFont(answerSet[2], 80, false));
        g.drawString(answerSet[2], mw + mw / 2, mh - mh / 2);
        g.setFont("Vector", Display.computeFont(answerSet[3], 80, false));
        g.drawString(answerSet[3], mw + mw / 2, mh + mh / 2);
        return { rightPos: answerSet.indexOf(OneTrue), answerSet };
    }
}
class ComplexNumber {
    constructor(realPart, imaginaryPart) {
        this.Real = () => {
            return this.n.real;
        };
        this.Imaginary = () => {
            return this.n.imaginary;
        };
        this.Add = (n2) => {
            const result = {
                real: this.n.real + n2.Real(),
                imaginary: this.n.imaginary + n2.Imaginary(),
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.Subtract = (n2) => {
            const result = {
                real: this.n.real - n2.Real(),
                imaginary: this.n.imaginary - n2.Imaginary(),
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.Multiply = (n2) => {
            const result = {
                real: this.n.real * n2.Real() - this.n.imaginary * n2.Imaginary(),
                imaginary: n2.Real() * this.n.imaginary + this.n.real * n2.Imaginary(),
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.Times = (factor) => {
            const result = {
                real: this.n.real * factor,
                imaginary: this.n.imaginary * factor,
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.Divide = (n2) => {
            const x2y2 = Math.pow(n2.Real(), 2) + Math.pow(n2.Imaginary(), 2);
            const result = {
                real: (this.n.real * n2.Real() + this.n.imaginary * n2.Imaginary()) / x2y2,
                imaginary: (n2.Real() * this.n.imaginary - this.n.real * n2.Imaginary()) / x2y2,
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.Conjugate = () => {
            const result = {
                real: this.n.real,
                imaginary: -this.n.imaginary,
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.Abs = () => {
            return Math.sqrt(Math.pow(this.n.real, 2) + Math.pow(this.n.imaginary, 2));
        };
        this.Exp = () => {
            const ea = Math.exp(this.n.real);
            const result = {
                real: ea * Math.cos(this.n.imaginary),
                imaginary: ea * Math.sin(this.n.imaginary),
            };
            return new ComplexNumber(result.real, result.imaginary);
        };
        this.n = {
            real: realPart,
            imaginary: imaginaryPart,
        };
    }
    toString() {
        return `${this.n.real}${this.n.imaginary < 0 ? "" : "+"}${this.n.imaginary}i`;
    }
}
const MAX_W = g.getWidth() - 1;
const MAX_H = g.getHeight() - 1;
const mw = Math.round(g.getWidth() / 2), mh = Math.round(g.getHeight() / 2);
const FONT_SIZE = 20;
const CHAR_LEN = 150 / 14;
const FONT_CHAR = FONT_SIZE / CHAR_LEN;
const RandInt = (min, max) => {
    if (min >= max) {
        const tempmax = max;
        max = min;
        min = tempmax;
    }
    const delta = max - min;
    return Math.round(Math.random() * delta) + min;
};
const RandOperation = (divide = true, power = false, modulo = false) => {
    const operation = [
        Operation.PLUS,
        Operation.MINUS,
        Operation.MULTIPLY,
    ];
    if (divide)
        operation.push(Operation.DIVIDE);
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
