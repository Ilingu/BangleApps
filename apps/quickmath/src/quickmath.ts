/**
 * @class - singleton
 */
class QuickMath {
  private complexity: Difficulty;
  private static gameInstance: QuickMath;

  private constructor(complexity: Difficulty) {
    this.complexity = complexity;
  }

  static newGame(complexity: Difficulty): QuickMath {
    if (!this.gameInstance) {
      this.gameInstance = new this(complexity);
    }

    return this.gameInstance;
  }

  public newChallenge(): void {
    const challenge = new Challenge(this.complexity, "algebra");
    const rightAnswerPos = challenge.display();
    if (rightAnswerPos === undefined) return quit();
    // no async/await in es6 nor in espruino interpreter and ts compile of async/await doesn't work -_-
    this.waitAnswer()
      .then((answer) => {
        console.log({ answer });
        console.log({ isRight: rightAnswerPos === answer });
      })
      .catch(this.newChallenge);
  }

  // 176x176

  private waitAnswer(): Promise<0 | 1 | 2 | 3> {
    return new Promise((res, rej) => {
      let unsub = ScreenEvents.listener.on("tap", (ev) => {
        ScreenEvents.listener.off("tap", unsub[1]);
        if (!ev["xy"]) return;
        const isLeft = ev.xy.x < mw,
          isTop = ev.xy.y < mh;

        if (isLeft && isTop) return res(0);
        if (isLeft && !isTop) return res(1);
        if (!isLeft && isTop) return res(2);
        if (!isLeft && !isTop) return res(3);
        return rej("no distinc area");
      });
    });
  }
}
