// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StorefrontTemplateManager } from "./StorefrontTemplateManager";

const row = { shopId: 9, shopName: "متجر النور", shopSlug: "alnoor", storefrontTemplate: "classic" as const, logoUrl: null, coverImageUrl: null, description: "منتجات موثوقة", ownerName: "مالك المتجر", ownerEmail: null };

describe("معاينة قالب المتجر في الإدارة", () => {
  it("لا تحفظ اختيار المعاينة حتى يضغط المدير اعتماد القالب", async () => {
    const user = userEvent.setup(); const onCommit = vi.fn();
    render(<StorefrontTemplateManager rows={[row]} pending={false} onCommit={onCommit}/>);
    await user.selectOptions(screen.getByLabelText("معاينة قالب متجر النور"), "fashion");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("هذه معاينة مؤقتة؛ لم يُطبّق أي تغيير على المتجر.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "اعتماد القالب" }));
    expect(onCommit).toHaveBeenCalledWith(9, "fashion");
  });
});
