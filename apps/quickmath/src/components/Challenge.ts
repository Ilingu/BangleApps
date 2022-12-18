const powRegex = /Math\.pow\(([0-9]+),([0-9]+)\)/;
class Challenge {
  public challenge: ChallengeShape;

  constructor(complexity: Difficulty, type: ChallengeTypes) {
    if (type === "algebra")
      this.challenge = Challenge.newAlgebraChallenge(complexity);
    else if (type === "equation")
      this.challenge = Challenge.newEquationChallenge(complexity);
    else this.challenge = Challenge.newAlgebraChallenge(complexity);
  }

  public display(): 0 | 1 | 2 | 3 | undefined {
    return displayChallenge(this.challenge);
  }

  public static newEquationChallenge = (
    complexity: Difficulty
  ): ChallengeShape => {
    return {
      type: "equation",
      prompt: "-2x**2 + x + 1 = 0",
      fake_answers: [0],
      solution_set: [1, -0.5],
    };
  };

  public static newAlgebraChallenge(complexity: Difficulty): ChallengeShape {
    const hardAlgebra = complexity >= Difficulty.MEDIUM;
    const opLen = RandInt(1, hardAlgebra ? 3 : 2);

    let expressions: Expr[] = [];
    let jsprompt = "",
      userprompt = "";

    for (let i = 0; i < opLen; i++) {
      const op = RandOperation(hardAlgebra, hardAlgebra);
      const sign: Signs = OperationToSign[op.toString()];

      const derivation = hardAlgebra ? 1000 : 100;
      const tenthDerivation = derivation / 10;

      let a: number, b: number;
      if (op === Operation.DIVIDE) {
        b = RandInt(-derivation, derivation);
        a = RandInt(-tenthDerivation, tenthDerivation) * b;
      } else if (op === Operation.POWER) {
        a = RandInt(-tenthDerivation, tenthDerivation);
        b = RandInt(-5, 5);
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
      const inBetweenOp = RandOperation(false, true); // no power sign
      jsprompt += `(${expr.prompt})${OperationToSign[inBetweenOp.toString()]}`;
      userprompt += `(${uprompt})${OperationToSign[inBetweenOp.toString()]}`;
    }

    const answer = computeExpr(jsprompt);
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
        if (Math.random() >= 0.75) return -fa; // swap sign with a probability of 25%
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
