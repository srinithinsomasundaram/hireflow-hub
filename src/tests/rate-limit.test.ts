import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit, getClientIp } from "../lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("checkRateLimit", () => {
  it("allows up to RL_MAX (5) requests per window", () => {
    const ip = `${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(checkRateLimit(ip, "job-a")).toBe(true);
    expect(checkRateLimit(ip, "job-a")).toBe(false);
  });

  it("isolates by jobId — different job is not blocked", () => {
    const ip = `${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(ip, "job-x");
    expect(checkRateLimit(ip, "job-y")).toBe(true);
  });

  it("isolates by IP — different IP is not blocked", () => {
    const ip1 = `${Math.random()}`;
    const ip2 = `${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(ip1, "job-z");
    expect(checkRateLimit(ip2, "job-z")).toBe(true);
  });

  it("resets after the window expires (10 minutes)", () => {
    vi.useFakeTimers();
    const ip = `${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(ip, "job-r");
    expect(checkRateLimit(ip, "job-r")).toBe(false);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(checkRateLimit(ip, "job-r")).toBe(true);
  });
});

describe("getClientIp", () => {
  it("returns x-real-ip when TRUSTED_PROXY is not set", () => {
    vi.unstubAllEnvs();
    delete process.env.TRUSTED_PROXY;
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" });
    expect(getClientIp(headers)).toBe("2.2.2.2");
  });

  it("trusts x-forwarded-for only when TRUSTED_PROXY=true", () => {
    vi.stubEnv("TRUSTED_PROXY", "true");
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 10.0.0.1", "x-real-ip": "2.2.2.2" });
    expect(getClientIp(headers)).toBe("1.1.1.1");
  });

  it("returns 'unknown' when no IP headers present and proxy not trusted", () => {
    vi.unstubAllEnvs();
    delete process.env.TRUSTED_PROXY;
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
