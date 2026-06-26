/**
 * 会话管理层 —— 独立部署版本
 *
 * 已移除所有 Manus OAuth 相关代码（OAuthService、exchangeCodeForToken、
 * getUserInfo、getUserInfoWithJwt 等）。
 * 仅保留基于 JWT + Cookie 的本地会话签发与验证功能，
 * 以及从请求中读取已登录用户的 authenticateRequest 方法。
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Utility
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

/** Result of `sdk.authenticateRequest`. */
export type AuthenticatedUser = User;

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  /**
   * 为用户签发一个 JWT 会话 Cookie 值
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({
      openId,
      appId: ENV.appId,
      name: options.name ?? "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  /**
   * 验证 JWT 会话 Cookie，返回 payload 或 null
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return { openId, appId, name };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * 从 HTTP 请求中读取并验证会话，返回已登录的用户对象
   */
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 优先从 Cookie 读取
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 兜底：从 Authorization: Bearer <token> 读取（适用于 Safari ITP / WebView 场景）
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

    return user;
  }
}

export const sdk = new SDKServer();
