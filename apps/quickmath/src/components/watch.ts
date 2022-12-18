type ScreenEvent = "tap" | "swipe";
class WatchEvents {
  private static DisplayEvent: WatchEvents;

  private tapListener: Record<string, (ev: TouchEvent) => void> = {};
  private swipeListener: Record<string, (ev: SwipeEvent) => void> = {};
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

  public on<E extends "tap" | "swipe" | "btn_pressed">(
    ev: E,
    cb: E extends "tap"
      ? (ev: TouchEvent) => void
      : E extends "swipe"
      ? (ev: SwipeEvent) => void
      : E extends "btn_pressed"
      ? () => void
      : never
  ): [success: boolean, id: string] {
    const uid = ev + randomUUID();

    if (ev === "tap") this.tapListener[uid] = cb as (ev: TouchEvent) => void;
    else if (ev === "swipe")
      this.swipeListener[uid] = cb as (ev: SwipeEvent) => void;
    else if (ev === "btn_pressed") this.btnListener[uid] = cb as () => void;
    else return [false, ""];

    return [true, uid];
  }

  public off(ev: "tap" | "swipe" | "btn_pressed", id: string): boolean {
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
  answerSet: number[];
};
type displayChallengeOptions = {
  promptOffset?: number;
  answerSet?: number[];
};
const displayChallenge = (
  challenge: ChallengeShape,
  options?: displayChallengeOptions
): displayChallengeReturn | undefined => {
  if (!challenge) return;
  console.log(challenge.solution_set);
  if (challenge.fake_answers.length < 3) return;
  if (challenge.solution_set.length <= 0) return;

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
  g.fillEllipse(mw - 75, mh - 35, mw + 75, mh + 35);

  /* datas/text */
  g.setColor("#ffffff");
  g.setFont("Vector", FONT_SIZE);

  // prompt
  g.drawString(
    challenge.prompt,
    mw - 75 - ((options && options.promptOffset) || 0),
    mh - FONT_SIZE / 2
  );

  // answers
  const ThreeFakes = suffleArray(challenge.fake_answers).slice(0, 3);
  const OneTrue = suffleArray(challenge.solution_set)[0];

  const answerSet =
    (options && options.answerSet) ||
    suffleArray(ThreeFakes.concat(OneTrue), 2);
  if (answerSet.length !== 4) return;

  g.drawString(answerSet[0], mw - 73, mh - 73 + FONT_SIZE / 2); // margin 15px top,left: 0
  g.drawString(answerSet[1], mw - 73, mh + 73 / 2 + FONT_SIZE / 2); // margin 15px bottom,left: 1
  g.drawString(answerSet[2], mw + 20, mh - 73 + FONT_SIZE / 2); // margin 15px top,right: 2
  g.drawString(answerSet[3], mw + 20, mh + 73 / 2 + FONT_SIZE / 2); // margin 15px bottom,right: 3

  return { rightPos: answerSet.indexOf(OneTrue) as 0 | 1 | 2 | 3, answerSet };
};
