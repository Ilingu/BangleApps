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
const globalConfig = {
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
Bangle.setLCDTimeout(600);
isSupportedHW && E.showMenu(mainMenu);
class QuickMath {
    constructor() {
        this.config = globalConfig;
        this.score = 0;
    }
    get userScore() {
        return this.score;
    }
    static newGame() {
        if (!this.gameInstance) {
            this.gameInstance = new this();
        }
        this.gameInstance.newChallenge();
        return this.gameInstance;
    }
    newChallenge() {
        const challenge = new Challenge(this.config);
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
var _a;
class Challenge {
    constructor(config) {
        const RandType = () => suffleArray([
            "equation",
            "algebra",
            "arithmetic",
            "function",
        ])[RandInt(0, 3)];
        const RandExoByType = (type) => {
            const exo = generateExercises();
            let exercises = [];
            if (type === "equation")
                exercises = exo.EquationExercises;
            else if (type === "algebra")
                exercises = exo.AlgebraExercises;
            else if (type === "arithmetic")
                exercises = exo.ArithmeticExercises;
            else
                exercises = exo.FunctionExercises;
            return suffleArray(exercises)[RandInt(0, exercises.length - 1)];
        };
        const RandExoUser = () => suffleArray(config.challenge.exercises)[RandInt(0, config.challenge.exercises.length - 1)];
        const type = config.challenge.type === "random" ? RandType() : config.challenge.type;
        const exo = config.challenge.type === "random" ? RandExoByType(type) : RandExoUser();
        if (type === "equation") {
            if (exo === "affine")
                this.challenge = EquationChallenge.generateAffine();
            else if (exo === "quadratic")
                this.challenge = EquationChallenge.generateQuadradic(config.difficulty === Difficulty.EASY);
            else if (exo === "quotient")
                this.challenge = EquationChallenge.generateQuotien();
            else if (exo === "exp")
                this.challenge = EquationChallenge.generateExp(config.difficulty <= Difficulty.MEDIUM);
            else if (exo === "cossin")
                this.challenge = EquationChallenge.generateCosSin();
            else
                this.challenge = Challenge.defaultChallenge();
        }
        else if (type === "algebra") {
            if (exo === "complex")
                this.challenge = AlgebraChallenge.generateComplex();
            else if (exo === "real")
                this.challenge = AlgebraChallenge.generateReal(config.difficulty);
            else if (exo === "ln")
                this.challenge = AlgebraChallenge.generateLnExpr();
            else if (exo === "power")
                this.challenge = AlgebraChallenge.generatePowerExpr();
            else
                this.challenge = Challenge.defaultChallenge();
        }
        else if (type === "arithmetic")
            this.challenge = ArithmeticChallenge.generateGCD();
        else
            this.challenge = FunctionChallenge.generateDerivatives();
    }
    static defaultChallenge() {
        return {
            prompt: "NaN",
            answer: NaN.toString(),
            solution_set: [NaN.toString()],
            fake_answers: [NaN.toString(), NaN.toString(), NaN.toString()],
        };
    }
    display(options) {
        return Display.displayChallenge(this.challenge, options);
    }
}
class ArithmeticChallenge extends Challenge {
    static generateGCD() {
        const coef = RandInt(0, 100);
        const a = RandInt(-10, 10) * coef, b = RandInt(-10, 10) * coef;
        const answer = gcd(a, b);
        return {
            prompt: `gcd(${a};${b})`,
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: generateFakeAnswers(answer, 10, true),
        };
    }
}
class FunctionChallenge extends Challenge {
    static ln() {
        const KAdd = RandInt(-10, 10);
        const mult = RandInt(-10, 10, true);
        const poly = Math.random() >= 0.8
            ? this.polynomial(RandInt(1, 2))
            : { uprompt: "x", jsprompt: "x", type: "ln" };
        return {
            uprompt: `${KAdd !== 0 ? KAdd : ""}+${mult}ln|${poly.uprompt}|`,
            jsprompt: `${KAdd !== 0 ? KAdd : ""}+${mult}*Math.log(Math.abs(${poly.jsprompt}))`,
            type: "ln",
        };
    }
    static exp() {
        const KAdd = RandInt(-10, 10);
        const mult = RandInt(-10, 10, true);
        const poly = Math.random() >= 0.9
            ? { uprompt: "x", jsprompt: "x", type: "exp" }
            : this.polynomial(RandInt(1, 2));
        return {
            uprompt: `${KAdd !== 0 ? KAdd : ""}+${mult}e^${poly.uprompt}`,
            jsprompt: `${KAdd !== 0 ? KAdd : ""}+${mult}*Math.exp(${poly.jsprompt})`,
            type: "exp",
        };
    }
    static generateDerivatives() {
        const RandType = () => suffleArray(["polynomial", "ln", "exp"], 2)[RandInt(0, 3)];
        const RandMode = () => suffleArray(["u+v", "ku", "u*v", "u/v"], 2)[RandInt(0, 3)];
        const mode = RandMode();
        const u = this.newfn(RandType()), v = this.newfn(RandType());
        let answer, fn;
        const dx = RandInt(-10, 10, true);
        if (mode === "u+v") {
            fn = `${u.uprompt}+${v.uprompt}`;
            answer = computeDerivative(`${u.jsprompt}+${v.jsprompt}`, dx);
        }
        else if (mode === "ku") {
            const k = this.newfn("constant");
            fn = `${k.uprompt}*(${u.uprompt})`;
            answer = computeDerivative(`${k.jsprompt}*(${u.jsprompt})`, dx);
        }
        else if (mode === "u*v") {
            fn = `(${u.uprompt})*(${v.uprompt})`;
            answer = computeDerivative(`(${u.jsprompt})*(${v.jsprompt})`, dx);
        }
        else {
            fn = `(${u.uprompt})/(${v.uprompt})`;
            answer = computeDerivative(`(${u.jsprompt})/(${v.jsprompt})`, dx);
        }
        answer = parseFloat(trimFloating0(answer, 2));
        if (Math.floor(Math.abs(answer) + 1) - Math.abs(answer) <= 0.01)
            answer = Math.round(answer);
        fn = fn.replace(/\*x/gi, "x").replace(/\+-/gi, "-");
        return {
            prompt: `f(x)=${fn}\nf'(${dx})?`,
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: generateFakeAnswers(answer, 10, true),
        };
    }
}
_a = FunctionChallenge;
FunctionChallenge.polynomial = (degree) => {
    let jsprompt = "", uprompt = "";
    for (let deg = degree; deg >= 0; deg--) {
        const coef = RandInt(-10, 10, true);
        jsprompt += `${coef}${deg === 0 ? "" : `*Math.pow(x,${deg})+`}`;
        uprompt += `${coef === 1 ? "" : coef === -1 ? "-" : coef}${deg === 0 ? "" : `x${deg === 1 ? "" : `^${deg}`}+`}`;
    }
    return { uprompt, jsprompt, type: "polynomial" };
};
FunctionChallenge.newfn = (type) => {
    if (type === "polynomial")
        return _a.polynomial(RandInt(1, 3));
    if (type === "exp")
        return _a.exp();
    if (type === "ln")
        return _a.ln();
    const k = RandInt(-10, 10, true).toString();
    return { uprompt: k, jsprompt: k, type: "constant" };
};
class EquationChallenge extends Challenge {
    static generateAffine() {
        const isDecimal = Math.random() >= 0.9;
        const a = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100), b = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);
        const left = `${a}*x${b < 0 ? "" : "+"}${b}`;
        const $f_left = fx(left, "x");
        const answer = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);
        const right = $f_left(answer);
        return {
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
        const prompt = `(${top})/${isSwitch ? "" : "("}${isSwitch ? right : bot}${isSwitch ? "" : ")"}=${isSwitch ? bot : right}`.replace(/\*/gi, "");
        return {
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
                prompt,
                answer: answer,
                solution_set: [answer],
                fake_answers: generateFakeAnswers(parseInt(answer), 10, true),
            };
        }
        const isExpo = Math.random() >= 0.5;
        const d = RandInt(2, 10);
        const a = RandInt(-10, 10, true);
        if (Math.random() >= 0.5) {
            const b = RandInt(-10, 10);
            const Y = RandInt(1, 50);
            const answer = trimFloating0((Math.log(Y) - b * (isExpo ? 1 : Math.log(d))) /
                (a * (isExpo ? 1 : Math.log(d))), 4);
            return {
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
        const Y = RandInt(a > 0 ? Yextremum : 1, a > 0 ? 1e6 : Yextremum);
        const result = isExpo
            ? resolveQuadradic(a, b, -Math.log(Y) + c)
            : resolveQuadradic(Math.log(d) * a, Math.log(d) * b, -Math.log(Y) + c * Math.log(d));
        if (result.isComplex)
            return this.generateExp(true);
        const answer = trimFloating0(result.result[RandInt(0, result.result.length - 1)], 4);
        return {
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
            .replace(/\+-/gi, "-")
            .replace(/[\+]+$/, "")
            .replace(/[-]+$/, "");
        prompt = prompt
            .replace(/\+-/gi, "-")
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
        if (!prompt.includes("tan") &&
            (closestGap === undefined ? 1 : closestGap) >= 1)
            closestAnswer = undefined;
        return {
            prompt,
            answer: (closestAnswer === undefined ? NaN : closestAnswer).toString(),
            solution_set: [
                (closestAnswer === undefined ? NaN : closestAnswer).toString(),
            ],
            fake_answers: generateFakeAnswers(closestAnswer || 0, 10, false),
        };
    }
}
class AlgebraChallenge extends Challenge {
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
            prompt,
            answer: answer.toString(),
            solution_set: [answer.toString()],
            fake_answers: genFakeComplexAnswers(answer, 10),
        };
    }
    static generateLnExpr() {
        let prompt = "";
        let answer;
        for (let i = 0; i < 3; i++) {
            let num = RandInt(1, 30);
            if (!answer) {
                answer = num;
                prompt += `ln(${num})`;
                continue;
            }
            const op = RandOperation();
            if (op === Operation.PLUS) {
                const abnum = Math.random() >= 0.8 ? RandInt(1, 5) : 1;
                const newnum = num * abnum;
                answer *= newnum;
                prompt += `+ln(${abnum === 1 ? newnum : `${num}*${abnum}`})`;
            }
            else if (op === Operation.MINUS) {
                const abnum = Math.random() >= 0.8 ? RandInt(1, 5) * num : 1;
                answer /= num;
                prompt += `-ln(${abnum === 1 ? num : `${abnum * num}/${abnum}`})`;
            }
            else {
                num = RandInt(1, 5);
                answer = Math.pow(answer, num);
                prompt = `(${prompt})*${num}`;
            }
        }
        answer = Math.round(answer);
        return {
            prompt,
            answer: `ln(${answer.toString()})`,
            solution_set: [answer.toString()],
            fake_answers: generateFakeAnswers(answer, 10, true).map((fa) => `ln(${Math.abs(parseFloat(fa))})`),
        };
    }
    static generatePowerExpr() {
        const base = RandInt(1, 9);
        let prompt = "";
        let answer;
        for (let i = 0; i < 3; i++) {
            const num = new PowerNumber(base, RandInt(-10, 10));
            const isInversed = Math.random() >= 0.8;
            const isSqrt = !isInversed && Math.random() >= 0.8;
            if (!answer) {
                answer = num;
                prompt += num.toString(isInversed, isSqrt);
                continue;
            }
            const op = RandPowerOperation();
            if (op === PowerOps.MULTIPLY) {
                answer = PowerNumber.multiply(answer, num);
                prompt += `*${num.toString(isInversed, isSqrt)}`;
            }
            else if (op === PowerOps.DIVIDE) {
                answer = PowerNumber.divide(answer, num);
                prompt += `/${num.toString(isInversed, isSqrt)}`;
            }
            else {
                const b = RandInt(-10, 10);
                answer = answer.power(b);
                prompt = `(${prompt})^${b}`;
            }
        }
        const isInversed = Math.random() >= 0.8;
        const isSqrt = !isInversed && Math.random() >= 0.8;
        return {
            prompt,
            answer: answer.toString(isInversed, isSqrt),
            solution_set: [answer.toString(false, false)],
            fake_answers: generateFakeAnswers((answer || { a: 0 }).a, 10, true).map((fa) => `${base}^${fa}`),
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
const generateExercises = () => ({
    EquationExercises: [
        "affine",
        "quadratic",
        globalConfig.difficulty >= Difficulty.MEDIUM ? "quotient" : null,
        globalConfig.difficulty >= Difficulty.MEDIUM ? "exp" : null,
        globalConfig.difficulty >= Difficulty.HARD ? "cossin" : null,
    ].filter((d) => d),
    AlgebraExercises: [
        globalConfig.difficulty >= Difficulty.HARD ? "complex" : null,
        globalConfig.difficulty >= Difficulty.HARD ? "ln" : null,
        globalConfig.difficulty >= Difficulty.MEDIUM ? "power" : null,
        "real",
    ].filter((d) => d),
    ArithmeticExercises: [
        globalConfig.difficulty >= Difficulty.MEDIUM ? "gcd" : null,
    ].filter((d) => d),
    FunctionExercises: [
        globalConfig.difficulty >= Difficulty.MEDIUM ? "derivatives" : null,
    ].filter((d) => d),
});
const renderExerciseTypeMenu = () => {
    let fields = {};
    const renderFields = (exercise) => {
        exercise.forEach((txt) => {
            fields[txt] = () => {
                E.showMenu();
                g.clear();
                globalConfig.challenge.exercises = [txt];
                QuickMath.newGame();
            };
        });
    };
    const exo = generateExercises();
    if (globalConfig.challenge.type === "equation")
        renderFields(exo.EquationExercises);
    if (globalConfig.challenge.type === "algebra")
        renderFields(exo.AlgebraExercises);
    if (globalConfig.challenge.type === "arithmetic")
        renderFields(exo.ArithmeticExercises);
    if (globalConfig.challenge.type === "function")
        renderFields(exo.FunctionExercises);
    const menu = Object.assign({
        "": { title: "Exercises Type", selected: 1 },
    }, fields, {
        Random: () => {
            E.showMenu();
            g.clear();
            globalConfig.challenge.exercises =
                globalConfig.challenge.type === "equation"
                    ? exo.EquationExercises
                    : globalConfig.challenge.type === "algebra"
                        ? exo.AlgebraExercises
                        : globalConfig.challenge.type === "arithmetic"
                            ? exo.ArithmeticExercises
                            : exo.FunctionExercises;
            QuickMath.newGame();
        },
        "< Back": () => E.showMenu(renderChallengeTypeMenu()),
    });
    return menu;
};
const renderChallengeTypeMenu = () => {
    const menu = {
        "": { title: "Challenge Type", selected: 1 },
        Algebra: () => {
            globalConfig.challenge.type = "algebra";
            E.showMenu(renderExerciseTypeMenu());
        },
        Equation: () => {
            globalConfig.challenge.type = "equation";
            E.showMenu(renderExerciseTypeMenu());
        },
        Arithmetic: () => {
            globalConfig.challenge.type = "arithmetic";
            E.showMenu(renderExerciseTypeMenu());
        },
        Function: () => {
            globalConfig.challenge.type = "function";
            E.showMenu(renderExerciseTypeMenu());
        },
        Random: () => {
            E.showMenu();
            g.clear();
            globalConfig.challenge.type = "random";
            QuickMath.newGame();
        },
        "< Back": () => E.showMenu(mainMenu),
    };
    if (globalConfig.difficulty <= Difficulty.EASY) {
        delete menu.Arithmetic;
        delete menu.Function;
    }
    return menu;
};
var PowerOps;
(function (PowerOps) {
    PowerOps[PowerOps["MULTIPLY"] = 0] = "MULTIPLY";
    PowerOps[PowerOps["DIVIDE"] = 1] = "DIVIDE";
    PowerOps[PowerOps["INVERSE"] = 2] = "INVERSE";
    PowerOps[PowerOps["POWER"] = 3] = "POWER";
    PowerOps[PowerOps["SQRT"] = 4] = "SQRT";
})(PowerOps || (PowerOps = {}));
class PowerNumber {
    constructor(base, a) {
        this.base = base;
        this.a = a;
    }
    static multiply(a, b) {
        if (a.base != b.base)
            return null;
        return new PowerNumber(a.base, a.a + b.a);
    }
    static divide(a, b) {
        if (a.base != b.base)
            return null;
        return new PowerNumber(a.base, a.a - b.a);
    }
    inserse() {
        return new PowerNumber(this.base, -this.a);
    }
    power(b) {
        return new PowerNumber(this.base, this.a * b);
    }
    sqrt() {
        return new PowerNumber(this.base, this.a / 2);
    }
    toString(isInversed, isSqrt) {
        let copy = new PowerNumber(this.base, this.a);
        if (isInversed)
            copy = new PowerNumber(this.base, this.a * -1);
        if (isSqrt)
            copy = new PowerNumber(this.base, this.a * 2);
        return `${isInversed ? "(1/" : isSqrt ? "sqrt(" : ""}${copy.base}^${copy.a}${isInversed || isSqrt ? ")" : ""}`;
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
const RandPowerOperation = () => {
    let operation = [
        PowerOps.MULTIPLY,
        PowerOps.DIVIDE,
        PowerOps.INVERSE,
        PowerOps.POWER,
        PowerOps.SQRT,
    ];
    operation = suffleArray(operation, 2);
    return operation[RandInt(0, operation.length - 1)];
};
const RandOperation = (divide = true, power = false, modulo = false) => {
    let operation = [
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
    operation = suffleArray(operation, 2);
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
    return (f(x + h) - f(x)) / h;
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
