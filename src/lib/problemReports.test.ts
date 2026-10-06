import { describe, expect, it } from "vitest";
import { isIgnoredError } from "./problemReports";

describe("isIgnoredError", () => {
  it("ignores browser extensions and cross-origin noise", () => {
    expect(isIgnoredError("TypeError: x is undefined", "chrome-extension://abc/content.js")).toBe(true);
    expect(isIgnoredError("Script error.")).toBe(true);
    expect(isIgnoredError("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
  });

  it("keeps the site's own errors", () => {
    expect(isIgnoredError("TypeError: deck is undefined", "https://bluememo.eu/_next/static/chunks/app.js")).toBe(false);
  });
});
