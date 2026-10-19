import { describe, expect, it, vi } from "vitest";

import {
  duration,
  inr,
  inrPerHour,
  pct,
  relTime,
  usd,
  usdPerHour,
} from "./format";

describe("inr", () => {
  it("converts paise to rupees with two decimals", () => {
    expect(inr(12_345)).toBe("₹123.45");
    expect(inr(100)).toBe("₹1.00");
    expect(inr(0)).toBe("₹0.00");
    expect(inr(5)).toBe("₹0.05");
  });

  it("groups in the Indian lakh/crore convention", () => {
    expect(inr(1_234_567_800)).toBe("₹1,23,45,678.00");
  });

  it("rounds, rather than truncates, a sub-paise fraction", () => {
    // Half a paise exists only mid-calculation, but it must not vanish.
    expect(inr(0.5)).toBe("₹0.01");
    expect(inr(0.4)).toBe("₹0.00");
  });

  it("honours a requested precision", () => {
    expect(inr(12_345, { decimals: 0 })).toBe("₹123");
    expect(inr(12_345, { decimals: 4 })).toBe("₹123.4500");
  });

  it("keeps the sign of a negative amount, after the symbol", () => {
    // The ₹ is prefixed by hand, so the minus sign lands inside it.
    expect(inr(-12_345)).toBe("₹-123.45");
  });
});

describe("usd", () => {
  it("fixes to two decimals by default", () => {
    expect(usd(1)).toBe("$1.00");
    expect(usd(1.005, 2)).toBe("$1.00");
    expect(usd(1.2345, 3)).toBe("$1.234");
  });
});

describe("per-hour conversions", () => {
  it("scales per-minute paise to the hour", () => {
    expect(inrPerHour(50)).toBe("₹30.00");
  });

  it("converts per-minute paise to dollars an hour", () => {
    // 50 paise/min = 3000 paise/h = ₹30 ≈ $0.34 at 1/88.
    expect(usdPerHour(50)).toBe("$0.34");
  });
});

describe("pct", () => {
  it("renders one decimal by default", () => {
    expect(pct(99.95)).toBe("100.0%");
    expect(pct(12.34, 2)).toBe("12.34%");
  });
});

describe("duration", () => {
  it("renders hours and zero-padded minutes", () => {
    expect(duration(0)).toBe("0h 00m");
    expect(duration(9 * 60_000)).toBe("0h 09m");
    expect(duration(125 * 60_000)).toBe("2h 05m");
  });

  it("floors a partial minute and clamps a negative span", () => {
    expect(duration(59_999)).toBe("0h 00m");
    expect(duration(-60_000)).toBe("0h 00m");
  });
});

describe("relTime", () => {
  it("dashes out a missing timestamp", () => {
    expect(relTime(null)).toBe("—");
    expect(relTime(undefined)).toBe("—");
  });

  it("describes the distance from now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    expect(relTime("2026-03-10T11:59:30.000Z")).toBe("just now");
    expect(relTime("2026-03-10T11:45:00.000Z")).toBe("15m ago");
    expect(relTime("2026-03-10T09:30:00.000Z")).toBe("2h 30m ago");
    expect(relTime("2026-03-07T12:00:00.000Z")).toBe("3d ago");

    vi.useRealTimers();
  });
});
