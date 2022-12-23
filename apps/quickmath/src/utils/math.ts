const RandInt = (min: number, max: number, nozero = false): number => {
  if (min >= max) {
    const tempmax = max; // espruino interpreter doesn't support "[x, y] = [y, x];"
    max = min;
    min = tempmax;
  }

  const delta = max - min;
  let result = Math.round(Math.random() * delta) + min;
  if (nozero)
    while (result === 0) result = Math.round(Math.random() * delta) + min;
  return result;
};

const RandFloat = (min: number, max: number, fixed: number): number => {
  if (min >= max) {
    const tempmax = max; // espruino interpreter doesn't support "[x, y] = [y, x];"
    max = min;
    min = tempmax;
  }

  const delta = max - min;
  return parseFloat((Math.random() * delta + min).toFixed(fixed));
};

const RandOperation = (
  divide = true,
  power = false,
  modulo = false
): Operation => {
  const operation: Operation[] = [
    Operation.PLUS,
    Operation.MINUS,
    Operation.MULTIPLY,
  ];
  if (divide) operation.push(Operation.DIVIDE);
  if (power) operation.push(Operation.POWER);
  if (modulo) operation.push(Operation.MODULO);

  return operation[RandInt(0, operation.length - 1)];
};

// Number.isInteger() not implemented in espruino interpreter
const isInteger = (num: number): boolean =>
  typeof num === "number" && isFinite(num) && Math.floor(num) === num;

const OperationToSign: Record<Operation, Signs> = {
  "0": "+",
  "1": "-",
  "2": "*",
  "3": "/",
  "4": "**",
  "5": "%",
};

const computeExpr = (expr: string): number => {
  return Function(`"use strict"; return (${expr});`)();
};

const fx = (fn: string, variable: "x" | "y" | "n") =>
  new Function(variable, `return (${fn})`);

// compute f'(x)
const computeDerivative = (fn: string, x: number): number => {
  const f = fx(fn, "x");
  const h = 1e-8; // Step size
  return Math.round((f(x + h) - f(x)) / h); // df
};

const resolveQuadradic = (
  a: number,
  b: number,
  c: number
): {
  isComplex: boolean;
  result: [x1: number | ComplexNumber, x2: number | ComplexNumber];
} => {
  const delta = Math.pow(b, 2) - 4 * a * c;
  if (delta < 0) {
    const x1 = new ComplexNumber(-b / (2 * a), Math.sqrt(-delta) / (2 * a));
    return { isComplex: true, result: [x1, x1.Conjugate()] };
  }

  const x1 = (-b - Math.sqrt(delta)) / (2 * a),
    x2 = (-b + Math.sqrt(delta)) / (2 * a);
  return { isComplex: false, result: [x1, x2] };
};

const gcd = (a: number, b: number): number => {
  if (b === 0) return a;
  return gcd(Math.abs(b), Math.abs(a % b));
};

const trimFloating0 = (num: number, fixed: number): string =>
  !isInteger(num) ? num.toFixed(fixed).replace(/0+$/, "") : `${num}`;
