// const powRegex = /Math\.pow\(([0-9]+),([0-9]+)\)/;
class Challenge {
  public readonly challenge: ChallengeShape;

  constructor(complexity: Difficulty, type: ChallengeTypes) {
    if (type === "algebra")
      this.challenge = Challenge.newAlgebraChallenge(complexity);
    else if (type === "equation")
      this.challenge = Challenge.newEquationChallenge(complexity);
    else this.challenge = Challenge.newAlgebraChallenge(complexity);
  }

  public display(
    options?: Parameters<typeof Display.displayChallenge>[1]
  ): ReturnType<typeof Display.displayChallenge> {
    return Display.displayChallenge(this.challenge, options);
  }

  public static newEquationChallenge = (
    complexity: Difficulty
  ): ChallengeShape => {
    /*
      EASY: linear/affine equation, easy 2nd degree: "5x² - 8x = 0" -> "x(5x - 8) = 0"
      MEDIUM: quadradic equation, division eq
      HARD: complex eq, exp(x), ln(x)
    */
    return {
      type: "equation",
      prompt: "-2x**2 + x + 1 = 0",
      fake_answers: ["0"],
      solution_set: ["1", "-0.5"],
    };
  };

  public static newAlgebraChallenge(complexity: Difficulty): ChallengeShape {
    /* Complex Numbers Algebra, must be in hard mode, happen 15% of the time */
    if (complexity === Difficulty.HARD && Math.random() >= 0.85) {
      const op = RandOperation(true, false, false);

      let complexA = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));
      let complexB = new ComplexNumber(RandInt(-100, 100), RandInt(-100, 100));

      let answer: ComplexNumber;
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

      const answerweight =
        answer.Abs() !== 0 ? Math.round(Math.log(answer.Abs())) : 0;
      const RandWeight = 10 + answerweight;
      const fake_answers = Array(10)
        .fill(null)
        .map(() => {
          let derivation = new ComplexNumber(
            RandInt(-RandWeight, RandWeight),
            RandInt(-RandWeight, RandWeight)
          );

          let whileIt = 0;
          while (derivation.Abs() === 0) {
            if (whileIt > 1e4) {
              return null;
            }

            whileIt++;
            derivation = new ComplexNumber(
              RandInt(-RandWeight, RandWeight),
              RandInt(-RandWeight, RandWeight)
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

      return {
        type: "complex_algebra",
        prompt,
        solution_set: [answer.toString()],
        fake_answers: fake_answers,
      };
    }

    /* Real Numbers Algebra */
    const hardAlgebra = complexity >= Difficulty.MEDIUM;
    const opLen = RandInt(1, complexity + 2); // easy will be 2, medium 3, hard 4 expressions

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
        b = RandInt(-derivation, derivation);
        a = RandInt(-tenthDerivation, tenthDerivation) * b;
      } else if (op === Operation.POWER) {
        a = RandInt(-tenthDerivation, tenthDerivation);
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
    const answerweight = answer !== 0 ? Math.log(Math.abs(answer)) : 0;
    const fake_answers = Array(10)
      .fill(null)
      .map(() => {
        let derivation = RandInt(
          -(hardAlgebra ? 10 : 100) - answerweight,
          (hardAlgebra ? 10 : 100) + answerweight
        );

        let whileIt = 0;
        while (derivation === 0) {
          if (whileIt > 1e4) {
            return null;
          }

          whileIt++;
          derivation = RandInt(
            -(hardAlgebra ? 10 : 100) - answerweight,
            (hardAlgebra ? 10 : 100) + answerweight
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

    return {
      prompt: userprompt,
      type: "algebra",
      solution_set: [`${answer}`],
      fake_answers: fake_answers,
    };
  }
}
