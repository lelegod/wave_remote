test("jest and ts-jest run TypeScript", () => {
  const double = (n: number): number => n * 2;
  expect(double(21)).toBe(42);
});
