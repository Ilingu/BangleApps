/**
 * @class - singleton
 */
class QuickMath {
  private complexity: Difficulty;
  private static gameInstance: QuickMath;

  public challenge: Challenge | undefined;

  private constructor(complexity: Difficulty) {
    this.complexity = complexity;
  }

  static newGame(complexity: Difficulty): QuickMath {
    if (!this.gameInstance) {
      this.gameInstance = new this(complexity);
    }

    return this.gameInstance;
  }

  public newChallenge() {
    this.challenge = this.generateChallenge();
    this.displayChallenge();
    this.listenToAnswer();
  }

  // 176x176

  private displayChallenge() {
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

    /* layout */

    // Answers set
    g.setColor("#3c40c6");
    g.fillRect(0, 0, MAX_W, MAX_H);

    // area delimitors
    g.setColor("#ffffff");
    g.fillRect(0, mh + 2, MAX_W, mh - 2); // horizontal line
    g.fillRect(mw - 2, 0, mw + 2, MAX_H); // vertical line

    // Prompt
    g.setColor("#f53b57");
    g.fillEllipse(mw - 75, mh - 35, mw + 75, mh + 35);

    /* datas/text */
    g.setColor("#ffffff");
    const FONT_SIZE = 20;
    g.setFont("Vector", FONT_SIZE);

    // prompt
    g.drawString(this.challenge?.prompt, mw - 75, mh - FONT_SIZE / 2);

    // answers
    const ThreeFakes = suffleArray(this.challenge.fake_answers).slice(0, 3);
    const OneTrue = suffleArray(this.challenge.solution_set)[0];

    const answerSet = suffleArray(ThreeFakes.concat(OneTrue), 2);
    if (answerSet.length !== 4) return;

    g.drawString(answerSet[0], mw - 73, mh - 73 + FONT_SIZE / 2); // margin 15px top,left
    g.drawString(answerSet[1], mw - 73, mh + 73 / 2 + FONT_SIZE / 2); // margin 15px bottom,left
    g.drawString(answerSet[2], mw + 20, mh - 73 + FONT_SIZE / 2); // margin 15px top,right
    g.drawString(answerSet[3], mw + 20, mh + 73 / 2 + FONT_SIZE / 2); // margin 15px bottom,right
  }

  private listenToAnswer() {
    // this.currentQuestion = undefined;
  }

  /**
   * @returns {Challenge} - the math challenge
   */
  private generateChallenge = (): Challenge => generateAlgebra(this.complexity);
}

const generateAlgebra = (complexity: Difficulty): Challenge => {
  const hardAlgebra = complexity >= Difficulty.MEDIUM;
  const opLen = RandInt(1, hardAlgebra ? 3 : 2);

  let expressions: Expr[] = [];
  let prompt = "";

  {
    let skippedIteration = 0;
    for (let i = 0; i < opLen; i++) {
      const op = RandOperation(hardAlgebra);
      const sign: Signs = OperationToSign[op.toString()];
      const a = RandInt(-(hardAlgebra ? 1000 : 100), hardAlgebra ? 1000 : 100),
        b = RandInt(-(hardAlgebra ? 1000 : 100), hardAlgebra ? 1000 : 100); // espruino intepreter doesn't support es5 transpile code nor array/object defferencing

      const isMinusMinus = sign === "-" && b < 0;
      const exprPrompt = `${a}${sign === "+" && b < 0 ? "" : sign}${
        isMinusMinus ? "(" : ""
      }${b}${isMinusMinus ? ")" : ""}`;
      const exprResult = computeExpr(exprPrompt);
      if (!isInteger(exprResult) && !hardAlgebra && skippedIteration < 1e3) {
        i--;
        skippedIteration++;
        continue; // if the a/b is not a int and that we are in easy mode: redo the iteration
      }

      const expr: Expr = {
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
      if (Math.random() >= 0.75) return -fa; // swap sign with a probability of 25%
      return fa;
    });

  return {
    prompt,
    type: "algebra",
    solution_set: [answer],
    fake_answers: fake_answers,
  };
};
