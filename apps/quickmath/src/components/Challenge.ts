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
    // a(x-x1)(x-x2) -> (ax-ax1)(x-x2) -> ax^2 -x*ax2 -x*ax1 + ax1*x2 -> ax^2 - (ax2 + ax1)x + ax1*x2
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

    /*
      We want a quadratic form that when solved gives 2 integer solutions (x1,x2)
      Therefore we'll use the factorise form of a quadratic equation: `a(x-x1)(x-x2)` with x1 and x2 integer (otherwise it's useless)
      and then develope it giving us: ax^2 - (ax2 + ax1)x + ax1*x2
    */

    const left = `${a}*Math.pow(x,2)${b < 0 ? "" : "+"}${b}*x${
      c < 0 ? "" : "+"
    }${c}`;

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

  private static generateQuotien(): ChallengeShape {
    if (Math.random() >= 2 / 3) {
      /* We want to solve: (kx + q) / (k2*x + q2) = k3*x + q3
          If we try to simplify this expression it gives:
          (-k3k2)*x² + (k-k3q2-q3k2)*x + (q-q3q2)
          thus it's a quadratic form composed of k,q,k2,q2,k3,q3
          formula is (a)x² + (b)x + (c): (-k3k2)*x² + (k-k3q2-q3k2)*x + (q-q3q2)
          thus:
            a = -k3 * k2;              |  and k2 = -a/k3; k3 = -a/k2
            b = k - k3 * q2 - q3 * k2; |  and k = b+k3q2+q3k2; k3q2 = -b+k-q3k2; q3k2 = -b+k-k3q2
            c = q - q3 * q2;           |  and q = c+q3q2; q2 = -c+q/q3; q3 = -c+q/q2
          However we want a quadratic form that when solved gives 2 integer solutions (x1,x2)
          Unfortunately, there is no way to link the factorize form of a quadratic equation (that always give int roots) to the above result (impossible system)
          Thus we'll have to brutforce: generates random equation and solve them until you found a one with 1 integer solution.
          The risk involved in this method is that the probability of having a integer solution equation is too low and thus that it's takes too long for the user to load,
          Fortunately, I tried the "brute-force algorithm" a very large number of times and found that there was 5% chance that a given equation has a integer solution
          Beside this great news, each iteration there is 2 issues: has 1 int solution (with a probability of 5%) or not (with a probability of 1-5%=95%). The repetition of n iteration is therefore a Bernouilli scheme (each iteration is independant, identical and with 2 issues) of parameter n=<number of iteration> and p=0.05
          thus X is the variable counting the number of "success" (equation has a integer solution) follows the Binomial distribution law B(n=?;p=0.05);
          If we visualize this on a calculator (or by hand (good luck)), we found that for n=100 (100 iterations) there are  0.5% chance of getting 0 int solution equation that ok but a bit too high, however for n=1000 we have 5E-21% chance of getting 0 int solution equation! that ridiculously impossible of getting a 0 😂 and between 100 and 1000 iteration even for a smart watch there is not much difference thus n>=1000 (I chose 10_000 to be extra secure but I could've took 1e9 and even more).
      */

      let k = 0,
        q = 0;
      let k2 = 0,
        q2 = 0;
      let k3 = 0,
        q3 = 0;

      let answer_set: number[] = [];
      for (let index = 0; index < 1e4; index++) {
        (k = RandInt(-10, 10, true)), (q = RandInt(-10, 10, true));
        (k2 = RandInt(-10, 10, true)), (q2 = RandInt(-10, 10, true));
        (k3 = RandInt(-10, 10, true)), (q3 = RandInt(-10, 10, true));

        const a = -k3 * k2,
          b = k - k3 * q2 - q3 * k2,
          c = q - q3 * q2;

        const result = resolveQuadradic(a, b, c);
        const isInt =
          !result.isComplex &&
          (isInteger(result.result[0] as number) ||
            isInteger(result.result[1] as number));
        if (isInt) {
          answer_set.push(
            isInteger(result.result[0] as number)
              ? (result.result[0] as number)
              : (result.result[1] as number)
          );
          break;
        }
      }

      const answer = answer_set[RandInt(0, answer_set.length - 1)];
      const pos = {
        ltop: `${k}x${q < 0 ? "" : "+"}${q}`,
        lbottom: `${k2}x${q2 < 0 ? "" : "+"}${q2}`,
        right: `${k3}x${q3 < 0 ? "" : "+"}${q3}`,
      } satisfies Record<string, string>;
      const prompt = `(${pos.ltop})/(${pos.lbottom})=${pos.right}`;

      return {
        type: "equation",
        prompt,
        answer: answer.toString(),
        solution_set: answer_set.map((x) => x.toString()),
        fake_answers: generateFakeAnswers(answer, 10),
      };
    }

    /* We want: `(kx+q)/(k2x+q2) = p` and x and p integers
      If we try to solve the equation above it give: x = (-q+p*q2)/(k-p*k2)
      we want x and p integers
      First approach is pretty simple: we have to find a way for (-q+p*q2) to be divisible by (k-p*k2) (remainder should be 0)
      so we want: -q+p*q2 = b(k-p*k2)
      giving us           = -bp*k2 + bk
                              |     / |
                              q     p q2
      Per identification, we find that q2 = k; b = p; bpk2 = p²k2 = q
      We can now replace these value in the original equation giving us: (q2x+p²k2)/(k2x+q2) = p
      Unfortunately, if we try to resolve x new it'll give us: `x = p`
      That too bad because now the user after several games will see that everytime this type of question comes up the answer will always be the value on right hand side of the equation (aka p).
      Second/Final Approach: "fck it, I'll brute force": and by doing that I found that if we take k2 and q2 and square it for k and q that always gives at a certain point a integer x and p!
      it looks like this: (k2²x + q2²)/(k2x + q2) = p
      then we try (by bruteforcing) to see witch value of x gives a interger p.
       The risk involved in this method is that the probability of having a integer solution equation is too low and thus that it's takes too long for the user to load,
          Fortunately, I tried the "brute-force algorithm" a very large number of times and found that there was 10% chance that a given equation has a integer solution
          Beside this great news, each iteration there is 2 issues: has 1 int solution (with a probability of 10%) or not (with a probability of 1-10%=90%). The repetition of n iteration is therefore a Bernouilli scheme (each iteration is independant, identical and with 2 issues) of parameter n=<number of iteration> and p=0.1
          thus X is the variable counting the number of "success" (equation has a integer solution) follows the Binomial distribution law B(n=?;p=0.1);
          If we visualize this on a calculator (or by hand (good luck)), we found that for n=100 (100 iterations) there are  0.003% chance of getting 0 int solution equation that ok but a bit too unpredictable, however for n=1000 we have 2E-44% chance of getting 0 int solution equation! that ridiculously impossible of getting a 0 😂 and between 100 and 1000 iteration even for a smart watch there is not much difference thus n>=1000 (I chose 10_000 to be extra secure but I could've took 1e9 and even more).
    */

    let top = "",
      bot = "";
    let answer = 0,
      right = 0;
    for (let i = Math.random() >= 0.5 ? -1e2 : 1; i < 1e4; i++) {
      let k2 = RandInt(-10, 10, true),
        q2 = RandInt(-10, 10, true);

      while (Math.pow(k2, 2) / k2 === Math.pow(q2, 2) / q2)
        (k2 = RandInt(-10, 10, true)), (q2 = RandInt(-10, 10, true));

      top = `${Math.pow(k2, 2)}*x+${Math.pow(q2, 2)}`;
      bot = `${k2}*x${q2 < 0 ? "" : "+"}${q2}`;
      let $f_top = fx(top, "x"),
        $f_bot = fx(bot, "x");

      const result = $f_top(i) / $f_bot(i);

      if (isInteger(result)) {
        answer = i;
        right = result;
        break;
      }
    }

    const isSwitch = Math.random() >= 0.5;
    const prompt = `(${top})/${isSwitch ? "" : "("}${isSwitch ? right : bot}${
      isSwitch ? "" : ")"
    }=${isSwitch ? bot : right}`.replace(new RegExp("*", "gi"), "");

    return {
      type: "equation",
      prompt,
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: generateFakeAnswers(answer, 10),
    };
  }

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
    if (complexity === Difficulty.MEDIUM)
      return Math.random() >= 0.5
        ? this.generateQuotien()
        : this.generateQuadradic(false);
    return this.generateQuotien();
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
