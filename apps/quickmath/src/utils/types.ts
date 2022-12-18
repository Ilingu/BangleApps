type ChallengeTypes = "algebra" | "equation" | "inequation";

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

interface Expr {
  a: number;
  b: number;
  op: Operation;
  result: number;
  prompt: string;
}

interface ChallengeShape {
  type: ChallengeTypes;
  prompt: string;
  solution_set: number[];
  fake_answers: number[];
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
  directionLR: swipeValues;
  directionUD: swipeValues;
}
