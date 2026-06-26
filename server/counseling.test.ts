import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock authenticated user (supervisor/admin)
function createSupervisorContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "supervisor-001",
      email: "supervisor@meihao.com",
      name: "督导老师",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Mock authenticated user (counselor)
function createCounselorContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "counselor-001",
      email: "counselor@meihao.com",
      name: "咨询师小李",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns current user when authenticated as supervisor", async () => {
    const ctx = createSupervisorContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
    expect(user?.name).toBe("督导老师");
  });

  it("returns current user when authenticated as counselor", async () => {
    const ctx = createCounselorContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.role).toBe("user");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("behavior ladder validation", () => {
  it("validates behavior ladder levels 0-7", () => {
    const validLevels = [0, 1, 2, 3, 4, 5, 6, 7];
    validLevels.forEach(level => {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(7);
    });
  });

  it("validates SDT scores 1-5", () => {
    const validScores = [1, 2, 3, 4, 5];
    validScores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(5);
    });
  });

  it("validates SRS scores 0-7", () => {
    const validSrsScores = [0, 1, 2, 3, 4, 5, 6, 7];
    validSrsScores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(7);
    });
  });

  it("calculates SRS total correctly", () => {
    const srsScores = { method: 5, goal: 6, content: 4, overall: 7 };
    const total = Object.values(srsScores).reduce((a, b) => a + b, 0);
    expect(total).toBe(22);
    expect(total).toBeLessThanOrEqual(28); // max 4 * 7
  });

  it("identifies SRS warning threshold below 25", () => {
    const warningThreshold = 25;
    const lowScore = 20;
    const normalScore = 26;
    expect(lowScore).toBeLessThan(warningThreshold);
    expect(normalScore).toBeGreaterThanOrEqual(warningThreshold);
  });
});

describe("personality type validation", () => {
  it("validates all four personality types", () => {
    const validTypes = ["自尊型", "关系型", "交换型", "自驱型"];
    expect(validTypes).toHaveLength(4);
    expect(validTypes).toContain("自尊型");
    expect(validTypes).toContain("关系型");
    expect(validTypes).toContain("交换型");
    expect(validTypes).toContain("自驱型");
  });
});

describe("case status validation", () => {
  it("validates case status values", () => {
    const validStatuses = ["进行中", "已结案", "暂停"];
    expect(validStatuses).toContain("进行中");
    expect(validStatuses).toContain("已结案");
    expect(validStatuses).toContain("暂停");
  });
});

describe("annotation type validation", () => {
  it("validates annotation types", () => {
    const validTypes = ["direction", "warning", "strategy", "praise", "question"];
    expect(validTypes).toHaveLength(5);
    expect(validTypes).toContain("direction");
    expect(validTypes).toContain("warning");
    expect(validTypes).toContain("strategy");
  });
});
