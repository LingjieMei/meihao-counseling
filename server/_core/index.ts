import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storageGetSignedUrl } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // 配置请求体大小限制（支持文件上传）
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 文件访问代理路由：当未配置 S3_PUBLIC_BASE_URL 时，通过此路由生成签名 URL 并重定向
  // 如果已配置 S3_PUBLIC_BASE_URL，前端会直接访问公开 URL，此路由不会被调用
  app.get("/api/storage/:key(*)", async (req, res) => {
    try {
      const key = decodeURIComponent(req.params.key);
      const signedUrl = await storageGetSignedUrl(key);
      res.redirect(307, signedUrl);
    } catch (error) {
      console.error("[Storage] Failed to generate signed URL:", error);
      res.status(500).json({ error: "Storage access failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 开发模式使用 Vite，生产模式使用静态文件
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
