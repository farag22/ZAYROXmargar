import { describe, expect, it } from "vitest";
import { canSubmitNetworkAction } from "./offline";

describe("offline network action policy", () => {
  it("allows a network action when the browser is online", () => {
    expect(canSubmitNetworkAction(true)).toBe(true);
  });

  it("blocks network actions while offline so the client can retry safely", () => {
    expect(canSubmitNetworkAction(false)).toBe(false);
  });
});
