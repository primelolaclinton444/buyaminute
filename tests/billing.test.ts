// ================================
// BuyAMinute — Billing Tests
// Phase 5
// ================================

import { describe, expect, it } from "./test-helpers";
import { computeBillableSeconds } from "../lib/billing";
import { PREVIEW_SECONDS } from "../lib/constants";

describe("Billing engine math", () => {
  it("applies 30s preview on first eligible call", () => {
    const connected = 40;
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: connected,
      previewApplied: true,
    });

    expect(billable).toBe(connected - PREVIEW_SECONDS); // 10
  });

  it("does not apply preview when lock exists", () => {
    const connected = 40;
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: connected,
      previewApplied: false,
    });

    expect(billable).toBe(40);
  });

  it("call ends before preview completes: billable is 0", () => {
    const connected = 20;
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: connected,
      previewApplied: true,
    });

    expect(billable).toBe(0);
  });

  it("disconnect at 31s with preview: billable is 1s", () => {
    const connected = 31;
    const billable = computeBillableSeconds({
      connectedOverlapSeconds: connected,
      previewApplied: true,
    });

    expect(billable).toBe(1);
  });

  it("zero or negative overlap yields 0 billable", () => {
    expect(
      computeBillableSeconds({
        connectedOverlapSeconds: 0,
        previewApplied: true,
      })
    ).toBe(0);

    expect(
      computeBillableSeconds({
        connectedOverlapSeconds: -5,
        previewApplied: false,
      })
    ).toBe(0);
  });
});
