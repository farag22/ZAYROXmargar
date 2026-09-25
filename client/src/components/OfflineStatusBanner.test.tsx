// @vitest-environment jsdom
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfflineStatusBanner } from "./OfflineStatusBanner";

describe("OfflineStatusBanner", () => {
  it("shows a clear offline message and a short reconnect message", async () => {
    const { unmount } = render(<OfflineStatusBanner />);
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByText("أنت تعمل دون اتصال — يمكنك تصفح ما تم فتحه سابقاً")).toBeTruthy();
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(screen.getByText("عاد الاتصال بالإنترنت")).toBeTruthy();
    unmount();
  });
});
