class WatchEvents {
  private static DisplayEvent: WatchEvents;

  private tapListener: Record<string, (ev: TouchEvent) => void> = {};
  private swipeListener: Record<string, (ev: SwipeEvent) => void> = {};
  private dragListener: Record<string, (ev: DragEvent) => void> = {};
  private btnListener: Record<string, () => void> = {};

  private constructor() {
    this.listenToScreenEvents();
  }

  static get listener(): WatchEvents {
    if (!this.DisplayEvent) {
      this.DisplayEvent = new this();
    }

    return this.DisplayEvent;
  }

  public on<E extends TypeWatchEvents>(
    ev: E,
    cb: E extends "tap"
      ? (ev: TouchEvent) => void
      : E extends "swipe"
      ? (ev: SwipeEvent) => void
      : E extends "btn_pressed"
      ? () => void
      : E extends "drag"
      ? (ev: DragEvent) => void
      : never
  ): [success: boolean, id: string] {
    const uid = ev + randomUUID();

    if (ev === "tap") this.tapListener[uid] = cb as (ev: TouchEvent) => void;
    else if (ev === "swipe")
      this.swipeListener[uid] = cb as (ev: SwipeEvent) => void;
    else if (ev === "drag")
      this.dragListener[uid] = cb as (ev: DragEvent) => void;
    else if (ev === "btn_pressed") this.btnListener[uid] = cb as () => void;
    else return [false, ""];

    return [true, uid];
  }

  public off(ev: TypeWatchEvents, id: string): boolean {
    if (!id.startsWith(ev)) return false;

    if (ev === "tap") {
      if (!this.tapListener[id]) return false;
      delete this.tapListener[id];
      return true;
    }
    if (ev === "swipe") {
      if (!this.swipeListener[id]) return false;
      delete this.swipeListener[id];
      return true;
    }
    if (ev === "drag") {
      if (!this.dragListener[id]) return false;
      delete this.dragListener[id];
      return true;
    }
    if (ev === "btn_pressed") {
      if (!this.btnListener[id]) return false;
      delete this.btnListener[id];
      return true;
    }

    return false;
  }

  private listenToScreenEvents() {
    Bangle.on("touch", (btn: any, xy: any) => {
      Object.values(this.tapListener).forEach((cb) => cb({ btn, xy }));
    });
    Bangle.on("drag", (ev: DragEvent) => {
      Object.values(this.dragListener).forEach((cb) => cb(ev));
    });
    Bangle.on("swipe", (directionLR: swipeValues, directionUD: swipeValues) => {
      Object.values(this.swipeListener).forEach((cb) =>
        cb({ directionLR, directionUD })
      );
    });

    /*
    // BTN listener
    setWatch(() => Object.values(this.btnListener).forEach((cb) => cb()), BTN, {
      edge: "rising",
      debounce: 50,
      repeat: true,
    });
    */
  }
}

type displayChallengeReturn = {
  rightPos: 0 | 1 | 2 | 3;
  answerSet: string[];
};
type displayChallengeOptions = {
  promptOffset?: number;
  answerSet?: string[];
};

// 176x176 pixels
class Display {
  static displayResult(
    isRight: boolean,
    score: number,
    rightAnswer?: string
  ): Promise<void> {
    g.clear(true);

    if (isRight) g.setColor("#00ff00");
    else g.setColor("#ff0000");
    g.fillRect(0, 0, MAX_W, MAX_H);

    g.setColor("#ffffff");
    g.setFont("Vector", FONT_SIZE);
    g.setFontAlign(0, 0, 0);

    const str = isRight
      ? `Right!\nScore: ${score}`
      : `Wrong!\nAnswer was:\n${rightAnswer}`;
    g.drawString(str, mw, mh);

    return new Promise<void>((res) => {
      let nextQuestionTimeout = setTimeout(res, 10_000); // 10s
      const unsub = WatchEvents.listener.on("tap", () => {
        WatchEvents.listener.off("tap", unsub[1]);
        clearTimeout(nextQuestionTimeout);
        res();
      });
    });
  }

  static computeFont(
    str: string,
    containerWidth: number,
    limit: boolean
  ): number {
    if (str.length * CHAR_LEN >= containerWidth) {
      const perfectSize = FONT_CHAR * (containerWidth / str.length);
      return perfectSize <= 12 && limit ? FONT_SIZE / 1.5 : perfectSize;
    }
    return FONT_SIZE;
  }

  static displayChallenge(
    challenge: ChallengeShape,
    options?: displayChallengeOptions
  ): displayChallengeReturn | undefined {
    if (!challenge) return;
    if (challenge.fake_answers.length < 3) return;
    if (challenge.answer.length <= 0) return;

    g.clear();

    /* layout */

    // Answers set
    g.setColor("#000000");
    g.fillRect(0, 0, MAX_W, MAX_H);

    // area delimitors
    g.setColor("#ffffff");
    g.fillRect(0, mh + 2, MAX_W, mh - 2); // horizontal line
    g.fillRect(mw - 2, 0, mw + 2, MAX_H); // vertical line

    // Prompt
    g.setColor("#f00");
    g.fillEllipse(0, mh - 35, MAX_W + 1, mh + 35);

    /* datas/text */
    g.setColor("#ffffff");
    g.setFontAlign(0, 0, 0);

    // prompt
    g.setFont("Vector", Display.computeFont(challenge.prompt, 176, true));
    g.drawString(
      challenge.prompt,
      mw - ((options && options.promptOffset) || 0),
      mh
    );

    // answers
    const ThreeFakes = suffleArray(challenge.fake_answers).slice(0, 3);
    const OneTrue = challenge.answer;

    const answerSet =
      (options && options.answerSet) ||
      suffleArray(ThreeFakes.concat(OneTrue), 2);
    if (answerSet.length !== 4) return;

    g.setFont("Vector", Display.computeFont(answerSet[0], 80, false));
    g.drawString(answerSet[0], mw - mw / 2, mh - mh / 2 - FONT_SIZE / 2); // margin 15px top,left: 0

    g.setFont("Vector", Display.computeFont(answerSet[1], 80, false));
    g.drawString(answerSet[1], mw - mw / 2, mh + mh / 2 + FONT_SIZE / 2); // margin 15px bottom,left: 1

    g.setFont("Vector", Display.computeFont(answerSet[2], 80, false));
    g.drawString(answerSet[2], mw + mw / 2, mh - mh / 2 - FONT_SIZE / 2); // margin 15px top,right: 2

    g.setFont("Vector", Display.computeFont(answerSet[3], 80, false));
    g.drawString(answerSet[3], mw + mw / 2, mh + mh / 2 + FONT_SIZE / 2); // margin 15px bottom,right: 3

    return { rightPos: answerSet.indexOf(OneTrue) as 0 | 1 | 2 | 3, answerSet };
  }
}
