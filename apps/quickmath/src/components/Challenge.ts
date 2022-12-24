// const powRegex = /Math\.pow\(([0-9]+),([0-9]+)\)/;
class Challenge {
  public readonly challenge: ChallengeShape;

  constructor(config: GameConfig) {
    const RandType = () =>
      suffleArray(["arithmetic", "equation", "algebra"])[
        RandInt(0, 2)
      ] as ChallengeTypes;
    const RandExo = () =>
      suffleArray(config.challenge.exercise)[
        RandInt(0, config.challenge.exercise.length - 1)
      ];

    const type =
      config.challenge.type === "random" ? RandType() : config.challenge.type;
    const exo = RandExo();
    if (type === "equation") {
      if (exo === "affine") this.challenge = EquationChallenge.generateAffine();
      else if (exo === "quadratic")
        this.challenge = EquationChallenge.generateQuadradic(
          config.difficulty === Difficulty.EASY
        );
      else if (exo === "quotient")
        this.challenge = EquationChallenge.generateQuotien();
      else if (exo === "exp")
        this.challenge = EquationChallenge.generateExp(
          config.difficulty >= Difficulty.MEDIUM
        );
      else if (exo === "cossin")
        this.challenge = EquationChallenge.generateCosSin();
      else this.challenge = Challenge.defaultChallenge();
    } else if (type === "algebra") {
      if (exo === "complex")
        this.challenge = AlgebraChallenge.generateComplex();
      else if (exo === "real")
        this.challenge = AlgebraChallenge.generateReal(config.difficulty);
      else if (exo === "ln") this.challenge = AlgebraChallenge.generateLnExpr();
      else if (exo === "power")
        this.challenge = AlgebraChallenge.generatePowerExpr();
      else this.challenge = Challenge.defaultChallenge();
    } else this.challenge = ArithmeticChallenge.generateGCD();
  }

  private static defaultChallenge(): ChallengeShape {
    return {
      prompt: "NaN",
      answer: NaN.toString(),
      solution_set: [NaN.toString()],
      fake_answers: [NaN.toString(), NaN.toString(), NaN.toString()],
    };
  }

  public display(
    options?: Parameters<typeof Display.displayChallenge>[1]
  ): ReturnType<typeof Display.displayChallenge> {
    return Display.displayChallenge(this.challenge, options);
  }
}

class ArithmeticChallenge extends Challenge {
  public static generateGCD(): ChallengeShape {
    const coef = RandInt(0, 100);
    const a = RandInt(-10, 10) * coef,
      b = RandInt(-10, 10) * coef;

    const answer = gcd(a, b);

    return {
      prompt: `gcd(${a};${b})`,
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: generateFakeAnswers(answer, 10, true),
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

  public static generateAffine(): ChallengeShape & {
    polynomialCoef: { a: number; b: number };
  } {
    const isDecimal = Math.random() >= 0.9;
    const a = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100),
      b = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);

    const left = `${a}*x${b < 0 ? "" : "+"}${b}`;
    const $f_left = fx(left, "x"); // function that can computer "left" expr

    const answer = isDecimal ? RandFloat(-100, 100, 1) : RandInt(-100, 100);
    const right = $f_left(answer); // we computer "left" expr with `x = answer`

    return {
      prompt: `${left.replace("*x", "x")}=${right}`,
      polynomialCoef: { a, b },
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: generateFakeAnswers(answer, 10, true),
    };
  }

  public static generateQuadradic(isEasy: boolean): ChallengeShape & {
    polynomialCoef: { a: number; b: number; c: number };
  } {
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
        prompt: `${left.replace("*x", "x").replace("*Math.pow(x,2)", "x^2")}=0`,
        answer: answer.toString(),
        polynomialCoef: { a, b, c: 0 },
        solution_set: [answer.toString()],
        fake_answers: generateFakeAnswers(answer, 10, true),
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
      prompt: `${left.replace("*x", "x").replace("*Math.pow(x,2)", "x^2")}=0`,
      polynomialCoef: { a, b, c },
      answer: answer.toString(),
      solution_set: answer_set.map((x) => x.toString()),
      fake_answers: generateFakeAnswers(answer, 10, true),
    };
  }

  public static generateQuotien(): ChallengeShape {
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
        prompt,
        answer: answer.toString(),
        solution_set: answer_set.map((x) => x.toString()),
        fake_answers: generateFakeAnswers(answer, 10, true),
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
      prompt,
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: generateFakeAnswers(answer, 10, true),
    };
  }

  public static generateExp(easy: boolean): ChallengeShape {
    if (easy) {
      const generate0Affine = (): ChallengeShape => {
        const a = RandInt(-10, 10);
        const b = RandInt(-10, 10) * a;
        return {
          answer: (-b / a).toString(),
          prompt: `${a}x${b < 0 ? "" : "+"}${b}`,
        } as ChallengeShape;
      };

      const isAffine = Math.random() >= 0.5;
      const X = isAffine
        ? generate0Affine()
        : this.generateQuadradic(Math.random() >= 0.5);
      const multiply = RandInt(-1000, 1000);
      const KAdd = RandInt(-15_000, 15_000);

      const right = 1 * multiply + KAdd;
      const prompt = `${KAdd}${multiply < 0 ? "" : "+"}${multiply}exp(${
        X.prompt.split("=")[0]
      })=${right}`;

      const answer = X.answer; // exp(X) = 1 (exp(0)) <=> X = 0
      return {
        prompt,
        answer: answer,
        solution_set: [answer],
        fake_answers: generateFakeAnswers(parseInt(answer), 10, true),
      };
    }

    /* Two types of challenge:
        1. exp(ax+b)=y (affine) + with natural numbers
        2. exp(ax²+bx+c)=y (quadratic) + with natural numbers
        note: y=f(x)
      --> it would've been a burden to search a formula where both x and y were natural integers so I just compute y and then resolve "x" and round it to 10^-4
      --> Why do I resolve "x" and not compute y with a defined value of x? -> go and see the 2 functions above and you will see that for certain unpredictable value of "x" there is no real solution f(x), hower these functions are continute, thus all the f(x) (here "y") are defined thus all y in [-Inf; +Inf] have a associated x, thus I choose simplicity.
    */

    const isExpo = Math.random() >= 0.5;
    const d = RandInt(1, 10);

    const a = RandInt(-10, 10, true);
    // affine
    if (Math.random() >= 0.5) {
      /* 1. exp(ax+b)=y (affine)
        If we try to isolate "x" and resolve it we found:
          x = (ln(y)-b)/a     defined with y>0 and a != 0
          (note this formula works with all types of the affine function: exp(x±b) and exp(ax))
        for the special case: `d^(ax+b)=y` where d is a natural integer number
          x = (ln(y)-b*ln(d))/(a*ln(d))
          (note this formula works with all types of the affine function: d^(x±b) and d^(ax))
       */
      const b = RandInt(-10, 10);
      const Y = RandInt(1, 50); // there is no negative Y value (ln(Y))

      const answer = trimFloating0(
        (Math.log(Y) - b * (isExpo ? 1 : Math.log(d))) /
          (a * (isExpo ? 1 : Math.log(d))),
        4
      );

      return {
        prompt: `${isExpo ? "e" : d}^${a}x${b < 0 ? "" : "+"}${b}=${Y}`,
        answer: answer,
        solution_set: [answer],
        fake_answers: generateFakeAnswers(parseFloat(answer), 10, false),
      };
    }

    /* 2. exp(ax²+bx+c)=y (y=f(x)) (quadratic)
        If we try to isolate "x" and resolve it we found that resolving x is the same as resolving:
          ax²+bx-ln(y)+c = 0     quadratic of parameters: a=a; b=b; c=-ln(y)+c defined with y>0
          we want to know the extremum of this quadratic equation (to not choose a "y" that have no x solution)
          thus we study the derivatives of the initial funcition giving us: f'(x)=(2ax+b)*exp(ax²+bx+c)
          The sign of f'(x) is determined by "2ax+b" (exp(X) always > 0) thus the only "root" of f'(x) and thus the "x-extremum" of f(x) is 2ax+b=0 <=> x = -b/(2a)
          If we reinject the extremum x-value into f(x) it give the formula to compute the extremum of f(x), if a<0 it's a maximum otherwise it's a minimum: extremum of f(x) = exp((-b²/(4a)) + c)
        for the special case: `d^(ax²+bx+c)=y` where d is a natural integer number
          finding "x" is the same as finding the root of: a*ln(d)x² + b*ln(d)x - ln(y)+c*ln(d) = 0 
          (or: ln(d)*(ax²+bx+c)-ln(y) = 0)
          and the extremum formula is (maximum if a<0, minimum otherwise): f(x) = d^((-b²/(4a)) + c)
     */

    const b = RandInt(-10, 10, true),
      c = RandInt(Math.ceil(Math.pow(b, 2) / (4 * a)), 10);
    const Yextremum = Math.ceil(
      isExpo
        ? Math.exp(-Math.pow(b, 2) / (4 * a) + c)
        : Math.pow(d, -Math.pow(b, 2) / (4 * a) + c)
    ); // beyond Ymax there is no solution x real
    console.log({ Yextremum, a, b, c, d, isExpo });
    const Y = RandInt(a > 0 ? Yextremum : 1, a > 0 ? 1e6 : Yextremum); // there is no negative Y value (ln(Y))

    const result = isExpo
      ? resolveQuadradic(a, b, -Math.log(Y) + c)
      : resolveQuadradic(
          Math.log(d) * a,
          Math.log(d) * b,
          -Math.log(Y) + c * Math.log(d)
        );
    if (result.isComplex) return this.generateExp(true);
    const answer = trimFloating0(
      result.result[RandInt(0, result.result.length - 1)] as number,
      4
    );

    return {
      prompt: `${isExpo ? "e" : d}^(${a}x^2${b < 0 ? "" : "+"}${b}x${
        c < 0 ? "" : "+"
      }${c})=${Y}`,
      answer: answer,
      solution_set: [answer],
      fake_answers: generateFakeAnswers(parseFloat(answer), 10, false),
    };
  }

  public static generateCosSin(): ChallengeShape {
    type opsType = ("cos" | "sin" | "tan")[];
    const ops: opsType = suffleArray(["cos", "sin", "tan"], 2);

    let jsPrompt = "";
    let prompt = "";

    const exprSize = RandInt(1, 3);
    for (let i = 0; i < exprSize; i++) {
      const multiply = Math.random() >= 0.8 ? RandInt(-10, 10, true) : 1;
      const op = ops[i];

      if (op === "cos") {
        jsPrompt += `${multiply}*Math.cos(x*2*Math.PI/360)+`;
        prompt += `${multiply === 1 ? "" : multiply}cos(x)+`;
      } else if (op === "sin") {
        jsPrompt += `${multiply}*Math.sin(x*2*Math.PI/360)+`;
        prompt += `${multiply === 1 ? "" : multiply}sin(x)+`;
      } else {
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

    let closestGap: number | undefined;
    let closestAnswer: number | undefined;

    const $f_expr = fx(jsPrompt, "x");
    for (let angle = 0; angle <= 360; angle++) {
      const gap = Math.abs($f_expr(angle) - right);
      if (gap < (closestGap === undefined ? gap + 1 : closestGap)) {
        closestGap = gap;
        closestAnswer = angle;
      }
    }

    console.log({ closestAnswer, closestGap, prompt, jsPrompt });
    if (
      !prompt.includes("tan") &&
      (closestGap === undefined ? 1 : closestGap) >= 1
    )
      closestAnswer = undefined;

    return {
      prompt,
      answer: (closestAnswer === undefined ? NaN : closestAnswer).toString(), // no "??" in espruino interpreter -_-
      solution_set: [
        (closestAnswer === undefined ? NaN : closestAnswer).toString(),
      ],
      fake_answers: generateFakeAnswers(closestAnswer || 0, 10, false),
    };
  }
}

class AlgebraChallenge extends Challenge {
  /* Complex Numbers Algebra */
  public static generateComplex(): ChallengeShape {
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
      prompt,
      answer: answer.toString(),
      solution_set: [answer.toString()],
      fake_answers: genFakeComplexAnswers(answer, 10),
    };
  }

  /* Real Numbers Algebra */
  public static generateLnExpr(): ChallengeShape {
    let prompt = "";
    let answer: number | undefined;
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
      } else if (op === Operation.MINUS) {
        const abnum = Math.random() >= 0.8 ? RandInt(1, 5) * num : 1;

        answer /= num;
        prompt += `-ln(${abnum === 1 ? num : `${abnum * num}/${abnum}`})`;
      } else {
        num = RandInt(1, 5);
        answer = Math.pow(answer, num);
        prompt = `(${prompt})*${num}`;
      }
    }

    answer = Math.round(answer as number);
    return {
      prompt,
      answer: `ln(${(answer as number).toString()})`,
      solution_set: [(answer as number).toString()],
      fake_answers: generateFakeAnswers(answer as number, 10, true).map(
        (fa) => `ln(${Math.abs(parseFloat(fa))})`
      ),
    };
  }

  public static generatePowerExpr(): ChallengeShape {
    const base = RandInt(1, 9);

    let prompt = "";
    let answer: PowerNumber | undefined;
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
        answer = PowerNumber.multiply(answer, num) as PowerNumber;
        prompt += `*${num.toString(isInversed, isSqrt)}`;
      } else if (op === PowerOps.DIVIDE) {
        answer = PowerNumber.divide(answer, num) as PowerNumber;
        prompt += `/${num.toString(isInversed, isSqrt)}`;
      } else {
        const b = RandInt(-10, 10);
        answer = answer.power(b);
        prompt = `(${prompt})^${b}`;
      }
    }

    const isInversed = Math.random() >= 0.8;
    const isSqrt = !isInversed && Math.random() >= 0.8;
    return {
      prompt,
      answer: (answer as PowerNumber).toString(isInversed, isSqrt),
      solution_set: [(answer as PowerNumber).toString(false, false)],
      fake_answers: generateFakeAnswers((answer || { a: 0 }).a, 10, true).map(
        (fa) => `${base}^${fa}`
      ),
    };
  }

  public static generateReal(complexity: Difficulty): ChallengeShape {
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
      answer: answer.toString(),
      solution_set: [`${answer}`],
      fake_answers: generateFakeAnswers(answer, hardAlgebra ? 10 : 100, true),
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
  derivationWeight: number,
  round: boolean
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

      return round ? Math.round(answer + derivation) : answer + derivation;
    })
    .filter((x) => typeof x === "number")
    .map((fa) => {
      if (Math.random() >= 0.8) return -(fa as number); // swap sign with a probability of 20%
      return fa as number;
    })
    .map((x) => x.toString());
};
