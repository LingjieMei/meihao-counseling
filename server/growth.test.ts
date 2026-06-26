import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCounselorGrowth: vi.fn().mockResolvedValue(null),
    calculateCounselorRadar: vi.fn().mockResolvedValue({
      effect: 60,
      retention: 75,
      alliance: 80,
      productivity: 55,
      growth: 40,
    }),
    upsertCounselorGrowth: vi.fn().mockResolvedValue(undefined),
    createTrainingRecord: vi.fn().mockResolvedValue(undefined),
    getTrainingRecordsByCounselor: vi.fn().mockResolvedValue([]),
    deleteTrainingRecord: vi.fn().mockResolvedValue(undefined),
    loginWithPhone: vi.fn().mockResolvedValue(null),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user", id = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "phone",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("growth.get", () => {
  it("returns growth data and radar for own counselor", async () => {
    const ctx = createUserContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.growth.get({ counselorId: 1 });

    expect(result).toHaveProperty("growth");
    expect(result).toHaveProperty("radar");
    expect(result.radar).toMatchObject({
      effect: expect.any(Number),
      retention: expect.any(Number),
      alliance: expect.any(Number),
      productivity: expect.any(Number),
      growth: expect.any(Number),
    });
  });

  it("throws FORBIDDEN when user tries to access another counselor's data", async () => {
    const ctx = createUserContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.growth.get({ counselorId: 99 })).rejects.toThrow();
  });

  it("allows admin to access any counselor's data", async () => {
    const ctx = createUserContext("admin", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.growth.get({ counselorId: 99 });
    expect(result).toHaveProperty("radar");
  });
});

describe("growth.updateStyle", () => {
  it("updates style quadrant successfully", async () => {
    const ctx = createUserContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.growth.updateStyle({ styleQuadrant: "guardian" });
    expect(result).toEqual({ success: true });
  });

  it("rejects invalid style quadrant", async () => {
    const ctx = createUserContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.growth.updateStyle({ styleQuadrant: "invalid" as any })
    ).rejects.toThrow();
  });
});

describe("growth.listTraining", () => {
  it("returns empty list when no training records", async () => {
    const ctx = createUserContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.growth.listTraining({ counselorId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth.loginWithPhone", () => {
  it("throws UNAUTHORIZED when credentials are wrong", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPhone({ phone: "13800000000", password: "wrongpass" })
    ).rejects.toThrow();
  });
});
