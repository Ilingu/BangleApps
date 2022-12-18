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

    const displayInfo = challenge.display();
    if (displayInfo === undefined || displayInfo.rightPos === undefined)
      return quit();

    let promptOffset = 0;
    const unsub = WatchEvents.listener.on("swipe", (ev) => {
      console.log(ev);
      const MAX_PROMPT = challenge.challenge.prompt.length * CHAR_LEN;
      // left
      if (ev.directionLR === -1 && promptOffset < MAX_PROMPT)
        promptOffset += 30;
      // right
      if (ev.directionLR === 1 && promptOffset > 0) promptOffset -= 30;
      challenge.display({ promptOffset, answerSet: displayInfo.answerSet });
    });

    // no async/await in es6 nor in espruino interpreter and ts compile of async/await doesn't work -_-
    this.waitAnswer()
      .then((answer) => {
        WatchEvents.listener.off("swipe", unsub[1]);
        const isRight = displayInfo.rightPos === answer;
        console.log({ isRight, answer });
      })
      .catch(() => {
        WatchEvents.listener.off("swipe", unsub[1]); // no "finally()" on espruino interpreter -_-
        this.newChallenge();
      });
  }

  // 176x176

  private waitAnswer(): Promise<0 | 1 | 2 | 3> {
    return new Promise((res, rej) => {
      const unsub = WatchEvents.listener.on("tap", (ev) => {
        WatchEvents.listener.off("tap", unsub[1]);
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
