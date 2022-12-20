// const powRegex = /Math\.pow\(([0-9]+),([0-9]+)\)/;
class Challenge {
  public readonly challenge: ChallengeShape;

  constructor(complexity: Difficulty, type: ChallengeTypes) {
    if (type === "algebra")
      this.challenge = AlgebraChallenge.generate(complexity);
    else if (type === "equation")
      this.challenge = EquationChallenge.generate(complexity);
    else if (type === "gcd") this.challenge = GCDChallenge.generate();
    else this.challenge = AlgebraChallenge.generate(complexity);
  }

  public display(
    options?: Parameters<typeof Display.displayChallenge>[1]
  ): ReturnType<typeof Display.displayChallenge> {
    return Display.displayChallenge(this.challenge, options);
  }
}

class GCDChallenge extends Challenge {
  public static generate(): ChallengeShape {
    const coef = RandInt(0, 100);
    const a = RandInt(-10, 10) * coef,
      b = RandInt(-10, 10) * coef;

    const answer = gcd(a, b);

    return {
      type: "gcd",
      prompt: `gcd(${a};${b})`,
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: generateFakeAnswers(answer, 10),
    };
  }
}

class EquationChallenge extends Challenge {
  /* Step to generate an equation in a programming langage

  1. generate the left hand side of the equation
  2. choose a random "x" value
  3. compute the left hand side with this value of x
  4. you now have the right hand side
  
  */

  private static generateAffine(): ChallengeShape {
    const isDecimal = Math.random() >= 0.9;
    const a = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100),
      b = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);

    const left = `${a}*x${b < 0 ? "" : "+"}${b}`;
    const $f_left = fx(left, "x"); // function that can computer "left" expr

    const answer = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);
    const right = $f_left(answer); // we computer "left" expr with `x = answer`

    return {
      type: "equation",
      prompt: `${left.replace("*x", "x")}=${right}`,
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: generateFakeAnswers(answer, 10),
    };
  }

  private static generateQuadradic(isEasy: boolean): ChallengeShape {
    const a = RandInt(-10, 10, true),
      x1 = RandInt(-10, 10),
      x2 = RandInt(-10, 10);
    // a(x-x1)(x-x2) -> (ax-ax1)(x-x2) -> ax^2 -x*ax2 -x*ax1 + ax1*x2 -> ax^2 - x(ax2 + ax1) + ax1*x2
    const b = -a * (x2 + x1),
      c = a * x1 * x2;

    if (isEasy) {
      const left = `${a}*Math.pow(x,2)${b < 0 ? "" : "+"}${b}*x`;
      const answer = -b / a;

      return {
        type: "equation",
        prompt: `${left.replace("*x", "x").replace("*Math.pow(x,2)", "x^2")}=0`,
        answer: answer.toString(),
        solution_set: [answer.toString()],
        fake_answers: generateFakeAnswers(answer, 10),
      };
    }

    const left = `${a}*Math.pow(x,2)${b < 0 ? "" : "+"}${b}*x${
      c < 0 ? "" : "+"
    }${c}`;
    // const delta = Math.pow(b, 2) - 4 * a * c;

    // 2 soliton in Real field
    const answer_set = [x1, x2];
    const answer = answer_set[RandInt(0, answer_set.length - 1)];

    return {
      type: "equation",
      prompt: `${left.replace("*x", "x").replace("*Math.pow(x,2)", "x^2")}=0`,
      answer: answer.toString(),
      solution_set: answer_set.map((x) => x.toString()),
      fake_answers: generateFakeAnswers(answer, 10),
    };
  }
  // private static generateQuotien() {}
  // private static generateCosSin() {}
  // private static generateExp() {}
  // private static generateLn() {}

  public static generate(complexity: Difficulty): ChallengeShape {
    /*
      EASY: linear/affine equation, easy 2nd degree: "5x² - 8x = 0" -> "x(5x - 8) = 0"
      MEDIUM: quadradic equation, division eq
      HARD: exp(x), ln(x)
    */
    if (complexity === Difficulty.EASY) {
      return Math.random() >= 0.75
        ? this.generateAffine()
        : this.generateQuadradic(true);
    }
    return this.generateQuadradic(false);
  }
}

class AlgebraChallenge extends Challenge {
  public static generate(complexity: Difficulty): ChallengeShape {
    /* Complex Numbers Algebra, must be in hard mode, happen 15% of the time */
    if (complexity === Difficulty.HARD && Math.random() >= 0.85)
      return this.generateComplex();

    /* Real Numbers Algebra */
    return this.generateReal(complexity);
  }

  /* Complex Numbers Algebra */

  private static generateComplex(): ChallengeShape {
    const op = RandOperation(true, false, false);

    let complexA = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));
    let complexB = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));

    let answer: ComplexNumber;
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

  /* Real Numbers Algebra */
  private static generateReal(complexity: Difficulty): ChallengeShape {
    const hardAlgebra = complexity >= Difficulty.MEDIUM;
    const opLen = RandInt(1, complexity + 1); // easy will be 1, medium 2, hard 3 expressions

    let expressions: Expr[] = [];
    let jsprompt = "",
      userprompt = "";

    for (let i = 0; i < opLen; i++) {
      const op = RandOperation(true, hardAlgebra, hardAlgebra);
      const sign: Signs = OperationToSign[op.toString()];

      const derivation = hardAlgebra ? 1000 : 100;
      const tenthDerivation = derivation / 10;

      let a: number, b: number;
      if (op === Operation.DIVIDE) {
        b = RandInt(-derivation, derivation, true);
        a = RandInt(-tenthDerivation, tenthDerivation) * b;
      } else if (op === Operation.POWER) {
        a = RandInt(-10, 10);
        b = RandInt(0, 5); // no neg power (because it produce a floating number)
      } else {
        a = RandInt(-derivation, derivation);
        b = RandInt(-derivation, derivation); // espruino intepreter doesn't support es5 transpile code nor array/object defferencing
      }

      const wrapA = sign === "**" && a < 0;
      const wrapB = (sign === "-" || sign === "*" || sign === "**") && b < 0;
      let exprPrompt = `${wrapA ? "(" : ""}${a}${wrapA ? ")" : ""}${
        sign === "+" && b < 0 ? "" : sign
      }${wrapB ? "(" : ""}${b}${wrapB ? ")" : ""}`;
      if (op === Operation.POWER) exprPrompt = `Math.pow(${a},${b})`;

      const exprResult = computeExpr(exprPrompt);

      const expr: Expr = {
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
      const uprompt =
        expr.op === Operation.POWER ? `${expr.a}^${expr.b}` : expr.prompt;

      if (i === expressions.length - 1) {
        jsprompt += `(${expr.prompt})`;
        userprompt += `(${uprompt})`;
        break;
      }
      const inBetweenOp = RandOperation(false, false, true); // no power nor divide sign
      jsprompt += `(${expr.prompt})${OperationToSign[inBetweenOp.toString()]}`;
      userprompt += `(${uprompt})${OperationToSign[inBetweenOp.toString()]}`;
    }

    const answer = computeExpr(jsprompt);
    return {
      prompt: userprompt,
      type: "algebra",
      answer: answer.toString(),
      solution_set: [`${answer}`],
      fake_answers: generateFakeAnswers(answer, hardAlgebra ? 10 : 100),
    };
  }
}

const genFakeComplexAnswers = (
  answer: ComplexNumber,
  RandWeight: number
): string[] => {
  const answerweight =
    answer.Abs() !== 0 ? Math.round(Math.log(answer.Abs())) : 0;
  return Array(10)
    .fill(null)
    .map(() => {
      let derivation = new ComplexNumber(
        RandInt(-RandWeight - answerweight, RandWeight + answerweight),
        RandInt(-RandWeight - answerweight, RandWeight + answerweight)
      );

      let whileIt = 0;
      while (derivation.Abs() === 0) {
        if (whileIt > 1e4) {
          return null;
        }

        whileIt++;
        derivation = new ComplexNumber(
          RandInt(-RandWeight - answerweight, RandWeight + answerweight),
          RandInt(-RandWeight - answerweight, RandWeight + answerweight)
        );
      }

      return answer.Add(derivation);
    })
    .filter((x) => x)
    .map((fa) => {
      // 20% chance of change
      if (Math.random() >= 0.9) return (fa as ComplexNumber).Times(-1); // swap sign with a probability of 10%
      if (Math.random() >= 0.9) return (fa as ComplexNumber).Conjugate(); // conjuguate with a probability of 10%
      return fa as ComplexNumber;
    })
    .map((x) => x.toString());
};

const generateFakeAnswers = (
  answer: number,
  derivationWeight: number
): string[] => {
  const answerweight =
    answer !== 0 ? Math.round(Math.log(Math.abs(answer))) : 0;
  return Array(10)
    .fill(null)
    .map(() => {
      let derivation = RandInt(
        -derivationWeight - answerweight,
        derivationWeight + answerweight
      );

      let whileIt = 0;
      while (derivation === 0) {
        if (whileIt > 1e4) {
          return null;
        }

        whileIt++;
        derivation = RandInt(
          -derivationWeight - answerweight,
          derivationWeight + answerweight
        );
      }

      return Math.round(answer + derivation);
    })
    .filter((x) => typeof x === "number")
    .map((fa) => {
      if (Math.random() >= 0.75) return -(fa as number); // swap sign with a probability of 25%
      return fa as number;
    })
    .map((x) => x.toString());
};
