class ComplexNumber {
  public readonly n: Complex;

  constructor(realPart: number, imaginaryPart: number) {
    this.n = {
      real: realPart,
      imaginary: imaginaryPart,
    };
  }

  public Real = (): number => {
    return this.n.real;
  };

  public Imaginary = (): number => {
    return this.n.imaginary;
  };

  public Add = (n2: ComplexNumber): ComplexNumber => {
    const result = {
      real: this.n.real + n2.Real(),
      imaginary: this.n.imaginary + n2.Imaginary(),
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public Subtract = (n2: ComplexNumber): ComplexNumber => {
    const result = {
      real: this.n.real - n2.Real(),
      imaginary: this.n.imaginary - n2.Imaginary(),
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public Multiply = (n2: ComplexNumber): ComplexNumber => {
    // (a+ib)(x+iy) = (ax - by) + i(ay+xb)
    const result = {
      real: this.n.real * n2.Real() - this.n.imaginary * n2.Imaginary(),
      imaginary: n2.Real() * this.n.imaginary + this.n.real * n2.Imaginary(),
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public Times = (factor: number): ComplexNumber => {
    // k(a+ib) -> ka + kbi
    const result = {
      real: this.n.real * factor,
      imaginary: this.n.imaginary * factor,
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public Divide = (n2: ComplexNumber): ComplexNumber => {
    /*
		a+ib					(a+ib)(x-iy)				(ax + by) + i(xb - ay)					(ax + by)		(xb - ay)
		------   ->> 	-------------  ->>	--------------------------  ->> --------- + --------- i
		x+iy					(x+iy)(x-iy)								x²+y²											x²+y²				x²+y²
	*/
    const x2y2 = Math.pow(n2.Real(), 2) + Math.pow(n2.Imaginary(), 2);
    const result = {
      real:
        (this.n.real * n2.Real() + this.n.imaginary * n2.Imaginary()) / x2y2,
      imaginary:
        (n2.Real() * this.n.imaginary - this.n.real * n2.Imaginary()) / x2y2,
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public Conjugate = (): ComplexNumber => {
    const result = {
      real: this.n.real,
      imaginary: -this.n.imaginary,
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public Abs = (): number => {
    return Math.sqrt(Math.pow(this.n.real, 2) + Math.pow(this.n.imaginary, 2));
  };

  public Exp = (): ComplexNumber => {
    // e^(a + i * b) = e^a * e^(i * b) = e^a * (cos(b) + i * sin(b)) = e^a*cos(b) + e^a*sin(b)*i
    const ea = Math.exp(this.n.real);
    const result = {
      real: ea * Math.cos(this.n.imaginary),
      imaginary: ea * Math.sin(this.n.imaginary),
    };
    return new ComplexNumber(result.real, result.imaginary);
  };

  public IsInteger(): boolean {
    return isInteger(this.n.real) && isInteger(this.n.imaginary);
  }

  public toString() {
    return `${this.n.real}${this.n.imaginary < 0 ? "" : "+"}${
      this.n.imaginary
    }i`;
  }
}
