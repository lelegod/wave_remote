// Clap-control domain logic: how many claps maps to which media command.
import type { ClapCommand } from "../../shared/types/messaging";

export const SEEK_SECONDS = 10;

export function commandForClapCount(count: number): ClapCommand | null {
  switch (count) {
    case 1:
      return { type: "TOGGLE_PLAY" };
    case 2:
      return { type: "SEEK_FORWARD", seconds: SEEK_SECONDS };
    case 3:
      return { type: "SEEK_BACKWARD", seconds: SEEK_SECONDS };
    default:
      return null;
  }
}
