type ChallengeTypes = "algebra" | "complex_algebra" | "equation" | "gcd";

enum Difficulty {
  EASY, // simple algebra, calculus and equation (1st order, 1st-2nd degree), human computable
  MEDIUM, // like Easy but with larger number
  HARD, // derivatives, exp(), gcd(a, b), modulo, ln(), primitives, differential equations, complex numbers -_-
}
enum Operation {
  PLUS,
  MINUS,
  MULTIPLY,
  DIVIDE,
  POWER,
  MODULO,
}

type Signs = "+" | "-" | "*" | "/" | "**" | "%";

interface Complex {
  real: number;
  imaginary: number;
}

interface Expr {
  a: number;
  b: number;
  op: Operation;
  result: number;
  prompt: string;
}

type TypeWatchEvents = "tap" | "swipe" | "drag" | "btn_pressed";

interface ChallengeShape {
  type: ChallengeTypes;
  prompt: string;
  answer: string;
  solution_set: string[];
  fake_answers: string[];
}

interface TouchEvent {
  /**
   * 1 for left, 2 for right
   */
  btn: 1 | 2;
  /**
   * position of the touch
   */
  xy: {
    x: number;
    y: number;
  };
}
type swipeValues = -1 | 0 | 1;
interface SwipeEvent {
  /**
   * -1 for left, 1 for right, 0 for up/down
   */
  directionLR: swipeValues;
  /**
   * -1 for up, 1 for down, 0 for left/right
   */
  directionUD: swipeValues;
}

interface DragEvent {
  /**
   * x pos of the finger
   */
  x: number;
  /**
   * y pos of the finger
   */
  y: number;
  /**
   * -1 for left, 1 for right, 0 for up/down
   */
  dx: number;
  /**
   * -1 for up, 1 for down, 0 for left/right
   */
  dy: number;
  /**
   * b containing number of touch points (currently 1 or 0)
   */
  b: number;
}
