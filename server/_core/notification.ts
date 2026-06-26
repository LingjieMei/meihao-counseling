/**
 * 通知服务 —— 独立部署版本
 *
 * 原 Manus Forge 通知服务已移除。
 * 当前实现为 stub：调用时仅在服务器日志中打印通知内容，不发送任何外部请求。
 *
 * 如需真实通知，可在此处接入：
 *   - 邮件（nodemailer）
 *   - 企业微信 / 钉钉 Webhook
 *   - Slack Webhook
 *   - 自定义 HTTP 接口
 */

import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "通知标题不能为空。" });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "通知内容不能为空。" });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `通知标题不能超过 ${TITLE_MAX_LENGTH} 个字符。` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `通知内容不能超过 ${CONTENT_MAX_LENGTH} 个字符。` });
  }

  return { title, content };
};

/**
 * 发送系统通知（当前为日志 stub，可按需替换为真实通知渠道）
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);
  // 独立部署模式：仅记录日志，不发送外部请求
  console.log(`[Notification] ${title}\n${content}`);
  return true;
}
