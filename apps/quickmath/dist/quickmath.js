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
        this.score = 0;
        this.complexity = complexity;
    }
    get userScore() {
        return this.score;
    }
    static newGame(complexity) {
        if (!this.gameInstance) {
            this.gameInstance = new this(complexity);
        }
        return this.gameInstance;
    }
    newChallenge() {
        const challenge = new Challenge(this.complexity, "equation");
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
            if (isRight)
                this.score++;
            Display.displayResult(isRight, this.score, rightAnswer).then(() => this.newChallenge());
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
            this.challenge = AlgebraChallenge.generate(complexity);
        else if (type === "equation")
            this.challenge = EquationChallenge.generate(complexity);
        else if (type === "gcd")
            this.challenge = GCDChallenge.generate();
        else
            this.challenge = AlgebraChallenge.generate(complexity);
    }
    display(options) {
        return Display.displayChallenge(this.challenge, options);
    }
}
class GCDChallenge extends Challenge {
    static generate() {
        const coef = RandInt(0, 100);
        const a = RandInt(-10, 10) * coef, b = RandInt(-10, 10) * coef;
        const answer = gcd(a, b);
        return {
            type: "gcd",
            prompt: `gcd(${a};${b})`,
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: generateFakeAnswers(answer, 10, true),
        };
    }
}
class EquationChallenge extends Challenge {
    static generateAffine() {
        const isDecimal = Math.random() >= 0.9;
        const a = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100), b = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);
        const left = `${a}*x${b < 0 ? "" : "+"}${b}`;
        const $f_left = fx(left, "x");
        const answer = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);
        const right = $f_left(answer);
        return {
            type: "equation",
            prompt: `${left.replace("*x", "x")}=${right}`,
            polynomialCoef: { a, b },
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: generateFakeAnswers(answer, 10, true),
        };
    }
    static generateQuadradic(isEasy) {
        const a = RandInt(-10, 10, true), x1 = RandInt(-10, 10), x2 = RandInt(-10, 10);
        const b = -a * (x2 + x1), c = a * x1 * x2;
        if (isEasy) {
            const left = `${a}*Math.pow(x,2)${b < 0 ? "" : "+"}${b}*x`;
            const answer = -b / a;
            return {
                type: "equation",
                prompt: `${left.replace("*x", "x").replace("*Math.pow(x,2)", "x^2")}=0`,
                answer: answer.toString(),
                polynomialCoef: { a, b, c: 0 },
                solution_set: [answer.toString()],
                fake_answers: generateFakeAnswers(answer, 10, true),
            };
        }
        const left = `${a}*Math.pow(x,2)${b < 0 ? "" : "+"}${b}*x${c < 0 ? "" : "+"}${c}`;
        const answer_set = [x1, x2];
        const answer = answer_set[RandInt(0, answer_set.length - 1)];
        return {
            type: "equation",
            prompt: `${left.replace("*x", "x").replace("*Math.pow(x,2)", "x^2")}=0`,
            polynomialCoef: { a, b, c },
            answer: answer.toString(),
            solution_set: answer_set.map((x) => x.toString()),
            fake_answers: generateFakeAnswers(answer, 10, true),
        };
    }
    static generateQuotien() {
        if (Math.random() >= 2 / 3) {
            let k = 0, q = 0;
            let k2 = 0, q2 = 0;
            let k3 = 0, q3 = 0;
            let answer_set = [];
            for (let index = 0; index < 1e4; index++) {
                (k = RandInt(-10, 10, true)), (q = RandInt(-10, 10, true));
                (k2 = RandInt(-10, 10, true)), (q2 = RandInt(-10, 10, true));
                (k3 = RandInt(-10, 10, true)), (q3 = RandInt(-10, 10, true));
                const a = -k3 * k2, b = k - k3 * q2 - q3 * k2, c = q - q3 * q2;
                const result = resolveQuadradic(a, b, c);
                const isInt = !result.isComplex &&
                    (isInteger(result.result[0]) ||
                        isInteger(result.result[1]));
                if (isInt) {
                    answer_set.push(isInteger(result.result[0])
                        ? result.result[0]
                        : result.result[1]);
                    break;
                }
            }
            const answer = answer_set[RandInt(0, answer_set.length - 1)];
            const pos = {
                ltop: `${k}x${q < 0 ? "" : "+"}${q}`,
                lbottom: `${k2}x${q2 < 0 ? "" : "+"}${q2}`,
                right: `${k3}x${q3 < 0 ? "" : "+"}${q3}`,
            };
            const prompt = `(${pos.ltop})/(${pos.lbottom})=${pos.right}`;
            return {
                type: "equation",
                prompt,
                answer: answer.toString(),
                solution_set: answer_set.map((x) => x.toString()),
                fake_answers: generateFakeAnswers(answer, 10, true),
            };
        }
        let top = "", bot = "";
        let answer = 0, right = 0;
        for (let i = Math.random() >= 0.5 ? -1e2 : 1; i < 1e4; i++) {
            let k2 = RandInt(-10, 10, true), q2 = RandInt(-10, 10, true);
            while (Math.pow(k2, 2) / k2 === Math.pow(q2, 2) / q2)
                (k2 = RandInt(-10, 10, true)), (q2 = RandInt(-10, 10, true));
            top = `${Math.pow(k2, 2)}*x+${Math.pow(q2, 2)}`;
            bot = `${k2}*x${q2 < 0 ? "" : "+"}${q2}`;
            let $f_top = fx(top, "x"), $f_bot = fx(bot, "x");
            const result = $f_top(i) / $f_bot(i);
            if (isInteger(result)) {
                answer = i;
                right = result;
                break;
            }
        }
        const isSwitch = Math.random() >= 0.5;
        const prompt = `(${top})/${isSwitch ? "" : "("}${isSwitch ? right : bot}${isSwitch ? "" : ")"}=${isSwitch ? bot : right}`.replace(new RegExp("*", "gi"), "");
        return {
            type: "equation",
            prompt,
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: generateFakeAnswers(answer, 10, true),
        };
    }
    static generateExp(easy) {
        if (easy) {
            const generate0Affine = () => {
                const a = RandInt(-10, 10);
                const b = RandInt(-10, 10) * a;
                return {
                    answer: (-b / a).toString(),
                    prompt: `${a}x${b < 0 ? "" : "+"}${b}`,
                };
            };
            const isAffine = Math.random() >= 0.5;
            const X = isAffine
                ? generate0Affine()
                : this.generateQuadradic(Math.random() >= 0.5);
            const multiply = RandInt(-1000, 1000);
            const KAdd = RandInt(-15000, 15000);
            const right = 1 * multiply + KAdd;
            const prompt = `${KAdd}${multiply < 0 ? "" : "+"}${multiply}exp(${X.prompt.split("=")[0]})=${right}`;
            const answer = X.answer;
            return {
                type: "equation",
                prompt,
                answer: answer,
                solution_set: [answer],
                fake_answers: generateFakeAnswers(parseInt(answer), 10, true),
            };
        }
        const isExpo = Math.random() >= 0.5;
        const d = RandInt(1, 10);
        const a = RandInt(-10, 10, true);
        if (Math.random() >= 0.5) {
            const b = RandInt(-10, 10);
            const Y = RandInt(1, 50);
            const answer = trimFloating0((Math.log(Y) - b * (isExpo ? 1 : Math.log(d))) /
                (a * (isExpo ? 1 : Math.log(d))), 4);
            return {
                type: "equation",
                prompt: `${isExpo ? "e" : d}^${a}x${b < 0 ? "" : "+"}${b}=${Y}`,
                answer: answer,
                solution_set: [answer],
                fake_answers: generateFakeAnswers(parseFloat(answer), 10, false),
            };
        }
        const b = RandInt(-10, 10, true), c = RandInt(Math.ceil(Math.pow(b, 2) / (4 * a)), 10);
        const Yextremum = Math.ceil(isExpo
            ? Math.exp(-Math.pow(b, 2) / (4 * a) + c)
            : Math.pow(d, -Math.pow(b, 2) / (4 * a) + c));
        console.log({ Yextremum, a, b, c, d, isExpo });
        const Y = RandInt(a > 0 ? Yextremum : 1, a > 0 ? 1e6 : Yextremum);
        const result = isExpo
            ? resolveQuadradic(a, b, -Math.log(Y) + c)
            : resolveQuadradic(Math.log(d) * a, Math.log(d) * b, -Math.log(Y) + c * Math.log(d));
        if (result.isComplex)
            return this.generateExp(true);
        const answer = trimFloating0(result.result[RandInt(0, result.result.length - 1)], 4);
        return {
            type: "equation",
            prompt: `${isExpo ? "e" : d}^(${a}x^2${b < 0 ? "" : "+"}${b}x${c < 0 ? "" : "+"}${c})=${Y}`,
            answer: answer,
            solution_set: [answer],
            fake_answers: generateFakeAnswers(parseFloat(answer), 10, false),
        };
    }
    static generateCosSin() {
        const ops = suffleArray(["cos", "sin", "tan"], 2);
        let jsPrompt = "";
        let prompt = "";
        const exprSize = RandInt(1, 3);
        for (let i = 0; i < exprSize; i++) {
            const multiply = Math.random() >= 0.8 ? RandInt(-10, 10, true) : 1;
            const op = ops[i];
            if (op === "cos") {
                jsPrompt += `${multiply}*Math.cos(x*2*Math.PI/360)+`;
                prompt += `${multiply === 1 ? "" : multiply}cos(x)+`;
            }
            else if (op === "sin") {
                jsPrompt += `${multiply}*Math.sin(x*2*Math.PI/360)+`;
                prompt += `${multiply === 1 ? "" : multiply}sin(x)+`;
            }
            else {
                jsPrompt += `${multiply}*Math.tan(x*2*Math.PI/360)+`;
                prompt += `${multiply === 1 ? "" : multiply}tan(x)+`;
            }
        }
        jsPrompt = jsPrompt
            .replace(/[\+-]+/gi, "-")
            .replace(/[\+]+$/, "")
            .replace(/[-]+$/, "");
        prompt = prompt
            .replace(/[\+-]+/gi, "-")
            .replace(/[\+]+$/, "")
            .replace(/[-]+$/, "");
        const rightInterval = prompt.includes("tan") ? 100 : exprSize >= 2 ? 2 : 1;
        const right = RandInt(-rightInterval, rightInterval);
        prompt += `=${right}`;
        let closestGap;
        let closestAnswer;
        const $f_expr = fx(jsPrompt, "x");
        for (let angle = 0; angle <= 360; angle++) {
            const gap = Math.abs($f_expr(angle) - right);
            if (gap < (closestGap === undefined ? gap + 1 : closestGap)) {
                closestGap = gap;
                closestAnswer = angle;
            }
        }
        console.log({ closestAnswer, closestGap, prompt, jsPrompt });
        if (!prompt.includes("tan") &&
            (closestGap === undefined ? 1 : closestGap) >= 1)
            closestAnswer = undefined;
        return {
            type: "equation",
            prompt,
            answer: (closestAnswer === undefined ? NaN : closestAnswer).toString(),
            solution_set: [
                (closestAnswer === undefined ? NaN : closestAnswer).toString(),
            ],
            fake_answers: generateFakeAnswers(closestAnswer || 0, 10, false),
        };
    }
    static generate(complexity) {
        return this.generateCosSin();
        if (complexity === Difficulty.EASY) {
            return Math.random() >= 0.75
                ? this.generateAffine()
                : this.generateQuadradic(true);
        }
        if (complexity === Difficulty.MEDIUM)
            return Math.random() >= 0.5
                ? this.generateQuotien()
                : this.generateQuadradic(false);
        return this.generateQuotien();
    }
}
class AlgebraChallenge extends Challenge {
    static generate(complexity) {
        if (complexity === Difficulty.HARD && Math.random() >= 0.85)
            return this.generateComplex();
        return this.generateReal(complexity);
    }
    static generateComplex() {
        const op = RandOperation(true, false, false);
        let complexA = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));
        let complexB = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));
        let answer;
        let prompt = "";
        switch (op) {
            case Operation.PLUS:
                prompt = `${complexA.toString()}+${complexB.toString()}`;
                answer = complexA.Add(complexB);
                break;
            case Operation.MINUS:
                prompt = `${complexA.toString()}-(${complexB.toString()})`;
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
        return {
            type: "complex_algebra",
            prompt,
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: genFakeComplexAnswers(answer, 10),
        };
    }
    static generateReal(complexity) {
        const hardAlgebra = complexity >= Difficulty.MEDIUM;
        const opLen = RandInt(1, complexity + 1);
        let expressions = [];
        let jsprompt = "", userprompt = "";
        for (let i = 0; i < opLen; i++) {
            const op = RandOperation(true, hardAlgebra, hardAlgebra);
            const sign = OperationToSign[op.toString()];
            const derivation = hardAlgebra ? 1000 : 100;
            const tenthDerivation = derivation / 10;
            let a, b;
            if (op === Operation.DIVIDE) {
                b = RandInt(-derivation, derivation, true);
                a = RandInt(-tenthDerivation, tenthDerivation) * b;
            }
            else if (op === Operation.POWER) {
                a = RandInt(-10, 10);
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
        return {
            prompt: userprompt,
            type: "algebra",
            answer: answer.toString(),
            solution_set: [`${answer}`],
            fake_answers: generateFakeAnswers(answer, hardAlgebra ? 10 : 100, true),
        };
    }
}
const genFakeComplexAnswers = (answer, RandWeight) => {
    const answerweight = answer.Abs() !== 0 ? Math.round(Math.log(answer.Abs())) : 0;
    return Array(10)
        .fill(null)
        .map(() => {
        let derivation = new ComplexNumber(RandInt(-RandWeight - answerweight, RandWeight + answerweight), RandInt(-RandWeight - answerweight, RandWeight + answerweight));
        let whileIt = 0;
        while (derivation.Abs() === 0) {
            if (whileIt > 1e4) {
                return null;
            }
            whileIt++;
            derivation = new ComplexNumber(RandInt(-RandWeight - answerweight, RandWeight + answerweight), RandInt(-RandWeight - answerweight, RandWeight + answerweight));
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
};
const generateFakeAnswers = (answer, derivationWeight, round) => {
    const answerweight = answer !== 0 ? Math.round(Math.log(Math.abs(answer))) : 0;
    return Array(10)
        .fill(null)
        .map(() => {
        let derivation = RandInt(-derivationWeight - answerweight, derivationWeight + answerweight);
        let whileIt = 0;
        while (derivation === 0) {
            if (whileIt > 1e4) {
                return null;
            }
            whileIt++;
            derivation = RandInt(-derivationWeight - answerweight, derivationWeight + answerweight);
        }
        return round ? Math.round(answer + derivation) : answer + derivation;
    })
        .filter((x) => typeof x === "number")
        .map((fa) => {
        if (Math.random() >= 0.8)
            return -fa;
        return fa;
    })
        .map((x) => x.toString());
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
    static displayResult(isRight, score, rightAnswer) {
        g.clear(true);
        if (isRight)
            g.setColor("#00ff00");
        else
            g.setColor("#ff0000");
        g.fillRect(0, 0, MAX_W, MAX_H);
        g.setColor("#ffffff");
        g.setFont("Vector", FONT_SIZE);
        g.setFontAlign(0, 0, 0);
        const str = isRight
            ? `Right!\nScore: ${score}`
            : `Wrong!\nAnswer was:\n${rightAnswer}`;
        g.drawString(str, mw, mh);
        return new Promise((res) => {
            let nextQuestionTimeout = setTimeout(res, 10000);
            const unsub = WatchEvents.listener.on("tap", () => {
                WatchEvents.listener.off("tap", unsub[1]);
                clearTimeout(nextQuestionTimeout);
                res();
            });
        });
    }
    static computeFont(str, containerWidth, limit) {
        if (str.length * CHAR_LEN >= containerWidth) {
            const perfectSize = FONT_CHAR * (containerWidth / str.length);
            return perfectSize <= 12 && limit ? FONT_SIZE / 1.5 : perfectSize;
        }
        return FONT_SIZE;
    }
    static displayChallenge(challenge, options) {
        if (!challenge)
            return;
        console.log(challenge.answer);
        if (challenge.fake_answers.length < 3)
            return;
        if (challenge.answer.length <= 0)
            return;
        g.clear();
        g.setColor("#000000");
        g.fillRect(0, 0, MAX_W, MAX_H);
        g.setColor("#ffffff");
        g.fillRect(0, mh + 2, MAX_W, mh - 2);
        g.fillRect(mw - 2, 0, mw + 2, MAX_H);
        g.setColor("#f00");
        g.fillEllipse(0, mh - 35, MAX_W + 1, mh + 35);
        g.setColor("#ffffff");
        g.setFontAlign(0, 0, 0);
        g.setFont("Vector", Display.computeFont(challenge.prompt, 176, true));
        g.drawString(challenge.prompt, mw - ((options && options.promptOffset) || 0), mh);
        const ThreeFakes = suffleArray(challenge.fake_answers).slice(0, 3);
        const OneTrue = challenge.answer;
        const answerSet = (options && options.answerSet) ||
            suffleArray(ThreeFakes.concat(OneTrue), 2);
        if (answerSet.length !== 4)
            return;
        g.setFont("Vector", Display.computeFont(answerSet[0], 80, false));
        g.drawString(answerSet[0], mw - mw / 2, mh - mh / 2 - FONT_SIZE / 2);
        g.setFont("Vector", Display.computeFont(answerSet[1], 80, false));
        g.drawString(answerSet[1], mw - mw / 2, mh + mh / 2 + FONT_SIZE / 2);
        g.setFont("Vector", Display.computeFont(answerSet[2], 80, false));
        g.drawString(answerSet[2], mw + mw / 2, mh - mh / 2 - FONT_SIZE / 2);
        g.setFont("Vector", Display.computeFont(answerSet[3], 80, false));
        g.drawString(answerSet[3], mw + mw / 2, mh + mh / 2 + FONT_SIZE / 2);
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
    IsInteger() {
        return isInteger(this.n.real) && isInteger(this.n.imaginary);
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
const RandInt = (min, max, nozero = false) => {
    if (min >= max) {
        const tempmax = max;
        max = min;
        min = tempmax;
    }
    const delta = max - min;
    let result = Math.round(Math.random() * delta) + min;
    if (nozero)
        while (result === 0)
            result = Math.round(Math.random() * delta) + min;
    return result;
};
const RandFloat = (min, max, fixed) => {
    if (min >= max) {
        const tempmax = max;
        max = min;
        min = tempmax;
    }
    const delta = max - min;
    return parseFloat((Math.random() * delta + min).toFixed(fixed));
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
const isInteger = (num) => typeof num === "number" && isFinite(num) && Math.floor(num) === num;
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
const fx = (fn, variable) => new Function(variable, `return (${fn})`);
const computeDerivative = (fn, x) => {
    const f = fx(fn, "x");
    const h = 1e-8;
    return Math.round((f(x + h) - f(x)) / h);
};
const resolveQuadradic = (a, b, c) => {
    const delta = Math.pow(b, 2) - 4 * a * c;
    if (delta < 0) {
        const x1 = new ComplexNumber(-b / (2 * a), Math.sqrt(-delta) / (2 * a));
        return { isComplex: true, result: [x1, x1.Conjugate()] };
    }
    const x1 = (-b - Math.sqrt(delta)) / (2 * a), x2 = (-b + Math.sqrt(delta)) / (2 * a);
    return { isComplex: false, result: [x1, x2] };
};
const gcd = (a, b) => {
    if (b === 0)
        return a;
    return gcd(Math.abs(b), Math.abs(a % b));
};
const trimFloating0 = (num, fixed) => !isInteger(num) ? num.toFixed(fixed).replace(/0+$/, "") : `${num}`;
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
const randomUUID = () => Date.now().toString() + Math.random().toString(36);
const sumArray = (numbers) => numbers.reduce((total, currentValue) => total + currentValue, 0);
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
