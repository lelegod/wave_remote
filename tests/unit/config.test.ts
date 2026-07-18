import { mapOs, isValidEmail } from "../../src/shared/config";

test("isValidEmail accepts real addresses and rejects malformed ones", () => {
  expect(isValidEmail("user@example.com")).toBe(true);
  expect(isValidEmail("a.b+c@sub.domain.io")).toBe(true);
  expect(isValidEmail("nope")).toBe(false);
  expect(isValidEmail("no@domain")).toBe(false);
  expect(isValidEmail("has space@x.com")).toBe(false);
  expect(isValidEmail("")).toBe(false);
});

test("mapOs maps platform strings to coarse buckets", () => {
  expect(mapOs("Win32")).toBe("Windows");
  expect(mapOs("MacIntel")).toBe("macOS");
  expect(mapOs("CrOS x86_64")).toBe("ChromeOS");
  expect(mapOs("Linux x86_64")).toBe("Linux");
  expect(mapOs("something")).toBe("Other");
});
