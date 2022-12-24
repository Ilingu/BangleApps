const generateExercises = () => ({
  EquationExercises: (
    [
      "affine", // easy and more
      "quadratic", // easy and more
      globalConfig.difficulty >= Difficulty.MEDIUM ? "quotient" : null, // medium and more
      globalConfig.difficulty >= Difficulty.MEDIUM ? "exp" : null, // medium and more
      globalConfig.difficulty >= Difficulty.HARD ? "cossin" : null, // hard
    ] as EquationChallenges[]
  ).filter((d) => d),
  AlgebraExercises: (
    [
      globalConfig.difficulty >= Difficulty.HARD ? "complex" : null, // hard
      globalConfig.difficulty >= Difficulty.HARD ? "ln" : null, // hard
      globalConfig.difficulty >= Difficulty.MEDIUM ? "power" : null, // medium and more
      "real", // easy and more
    ] as AlgebraChallenges[]
  ).filter((d) => d),
  ArithmeticExercises: (
    [
      globalConfig.difficulty >= Difficulty.MEDIUM ? "gcd" : null, // medium and more
    ] as ArithmeticChallenges[]
  ).filter((d) => d),
});
const renderExerciseTypeMenu = () => {
  let fields: Record<string, () => void> = {};
  const renderFields = (
    exercise: (EquationChallenges | AlgebraChallenges | ArithmeticChallenges)[]
  ) => {
    exercise.forEach((txt) => {
      fields[txt] = () => {
        E.showMenu();
        g.clear();
        globalConfig.challenge.exercises = [txt];
        QuickMath.newGame();
      };
    });
  };

  const exo = generateExercises();
  if (globalConfig.challenge.type === "equation")
    renderFields(exo.EquationExercises);
  if (globalConfig.challenge.type === "algebra")
    renderFields(exo.AlgebraExercises);
  if (globalConfig.challenge.type === "arithmetic")
    renderFields(exo.ArithmeticExercises);

  // Espruino interpreter don't support the spread operator 😭
  const menu = Object.assign(
    {
      "": { title: "Exercises Type", selected: 1 },
    },
    fields,
    {
      Random: () => {
        E.showMenu();
        g.clear();
        globalConfig.challenge.exercises =
          globalConfig.challenge.type === "equation"
            ? exo.EquationExercises
            : globalConfig.challenge.type === "algebra"
            ? exo.AlgebraExercises
            : exo.ArithmeticExercises;
        QuickMath.newGame();
      },
      "< Back": () => E.showMenu(renderChallengeTypeMenu()),
    }
  );
  return menu;
};

const renderChallengeTypeMenu = () => {
  const menu: any = {
    "": { title: "Challenge Type", selected: 1 },
    Algebra: () => {
      globalConfig.challenge.type = "algebra";
      E.showMenu(renderExerciseTypeMenu());
    },
    Equation: () => {
      globalConfig.challenge.type = "equation";
      E.showMenu(renderExerciseTypeMenu());
    },
    Arithmetic: () => {
      globalConfig.challenge.type = "arithmetic";
      E.showMenu(renderExerciseTypeMenu());
    },
    Random: () => {
      E.showMenu();
      g.clear();
      globalConfig.challenge.type = "random";
      QuickMath.newGame();
    },
    "< Back": () => E.showMenu(mainMenu),
  };

  if (globalConfig.difficulty <= Difficulty.EASY) delete menu.Arithmetic;
  return menu;
};
