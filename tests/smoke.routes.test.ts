// ================================
// BuyAMinute — Route smoke tests
// ================================

import HomePage from "../app/page";
import LoginPage from "../app/login/page";
import SignupPage from "../app/signup/page";
import CallHubPage from "../app/call/page";
import CallRequestPage from "../app/call/request/[username]/page";
import CallIncomingPage from "../app/call/incoming/page";
import CallSessionPage from "../app/call/[id]/page";
import CallReceiptPage from "../app/call/[id]/receipt/page";
import { buildAuthRedirect } from "../components/auth/AuthGuard";
import { GET as getIncoming } from "../app/api/calls/mock/incoming/route";
import { POST as postRequest } from "../app/api/calls/mock/request/route";

describe("Route smoke tests", () => {
  it("loads landing, auth, and call page modules", () => {
    expect(typeof HomePage).toBe("function");
    expect(typeof LoginPage).toBe("function");
    expect(typeof SignupPage).toBe("function");
    expect(typeof CallHubPage).toBe("function");
    expect(typeof CallRequestPage).toBe("function");
    expect(typeof CallIncomingPage).toBe("function");
    expect(typeof CallSessionPage).toBe("function");
    expect(typeof CallReceiptPage).toBe("function");
  });

  it("builds auth guard redirect URLs", () => {
    expect(buildAuthRedirect({ pathname: "/call", expired: false })).toBe(
      "/login?reason=signin&next=%2Fcall"
    );
    expect(buildAuthRedirect({ pathname: "/call", expired: true })).toBe(
      "/login?reason=expired&next=%2Fcall"
    );
  });

  it("returns mock incoming requests", async () => {
    const res = await getIncoming();
    expect(res.status).toBe(200);
  });

  it("accepts mock request payloads", async () => {
    const res = await postRequest(
      new Request("http://localhost/api/calls/mock/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "demo", mode: "voice" }),
      })
    );
    expect(res.status).toBe(200);
  });
});
