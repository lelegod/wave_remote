import { commandForClapCount, SEEK_SECONDS } from "../../src/messaging/messages";

test("1 clap toggles play", () => {
  expect(commandForClapCount(1)).toEqual({ type: "TOGGLE_PLAY" });
});

test("2 claps seek forward by SEEK_SECONDS", () => {
  expect(commandForClapCount(2)).toEqual({ type: "SEEK_FORWARD", seconds: SEEK_SECONDS });
});

test("3 claps seek backward by SEEK_SECONDS", () => {
  expect(commandForClapCount(3)).toEqual({ type: "SEEK_BACKWARD", seconds: SEEK_SECONDS });
});

test("other clap counts map to null", () => {
  expect(commandForClapCount(0)).toBeNull();
  expect(commandForClapCount(4)).toBeNull();
});
