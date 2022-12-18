const RandInt = (min: number, max: number): number => {
  if (min >= max) {
    const tempmax = max; // espruino interpreter doesn't support "[x, y] = [y, x];"
    max = min;
    min = tempmax;
  }

  const delta = max - min;
  return Math.round(Math.random() * delta) + min;
};

const RandOperation = (power = false, modulo = false): Operation => {
  const operation: Operation[] = [
    Operation.PLUS,
    Operation.MINUS,
    Operation.MULTIPLY,
    Operation.DIVIDE,
  ];
  if (power) operation.push(Operation.POWER);
  if (modulo) operation.push(Operation.MODULO);

  return operation[RandInt(0, operation.length - 1)];
};

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

// compute f'(x)
const computeDerivative = (fn: string, x: number): number => {
  const f = new Function("x", `return (${fn})`);
  const h = 1e-8; // Step size
  return Math.round((f(x + h) - f(x)) / h); // df
};
