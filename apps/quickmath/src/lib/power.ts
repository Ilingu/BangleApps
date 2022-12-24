enum PowerOps {
  MULTIPLY,
  DIVIDE,
  INVERSE,
  POWER,
  SQRT,
}

class PowerNumber {
  public readonly base: number;
  public readonly a: number;

  constructor(base: number, a: number) {
    this.base = base;
    this.a = a;
  }

  public static multiply(a: PowerNumber, b: PowerNumber) {
    if (a.base != b.base) return null;
    return new PowerNumber(a.base, a.a + b.a);
  }

  public static divide(a: PowerNumber, b: PowerNumber) {
    if (a.base != b.base) return null;
    return new PowerNumber(a.base, a.a - b.a);
  }

  public inserse() {
    return new PowerNumber(this.base, -this.a);
  }

  public power(b: number) {
    return new PowerNumber(this.base, this.a * b);
  }

  public sqrt() {
    return new PowerNumber(this.base, this.a / 2);
  }

  public toString(isInversed: boolean, isSqrt: boolean) {
    let copy = new PowerNumber(this.base, this.a);
    if (isInversed) copy = new PowerNumber(this.base, this.a * -1);
    if (isSqrt) copy = new PowerNumber(this.base, this.a * 2);

    return `${isInversed ? "(1/" : isSqrt ? "sqrt(" : ""}${copy.base}^${
      copy.a
    }${isInversed || isSqrt ? ")" : ""}`;
  }
}
