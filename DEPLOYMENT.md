# 美好心理咨询督导系统：独立部署说明

这个版本已经去掉 Manus 专属前端运行时、调试采集脚本、OAuth 登录跳转和 analytics 占位脚本。系统使用自己的 Node.js 服务、MySQL 数据库、手机号密码登录和 JWT Cookie 会话。

## 1. 准备环境

需要安装：

- Node.js 20 或更高版本
- pnpm
- MySQL 8 或兼容数据库

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少填写：

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET=一段足够长的随机字符串
VITE_APP_ID=meihao-counseling
PORT=3000
```

`JWT_SECRET` 和 `VITE_APP_ID` 部署后尽量保持不变，否则已登录用户需要重新登录。

## 3. 安装、建表、创建管理员

```bash
pnpm install
pnpm db:push
ADMIN_PHONE=13800000000 ADMIN_PASSWORD=ChangeMe123 ADMIN_NAME=管理员 pnpm seed:admin
```

Windows PowerShell 可以这样写：

```powershell
$env:ADMIN_PHONE="13800000000"; $env:ADMIN_PASSWORD="ChangeMe123"; $env:ADMIN_NAME="管理员"; pnpm seed:admin
```

## 4. 构建和启动

```bash
pnpm build
pnpm start
```

启动后访问：

```text
http://localhost:3000
```

线上部署时，把 `PORT`、`DATABASE_URL`、`JWT_SECRET` 配到你的部署平台环境变量里即可。适合部署到 Render、Railway、Fly.io、VPS、宝塔 Node 项目等能运行 Node 服务和连接 MySQL 的地方。

## 5. 重要说明

- 这个项目不是纯静态网页，不能只上传 `dist/public` 到静态空间，因为登录、病例、咨询记录、督导批注都依赖后端 API 和数据库。
- 原来的 Manus OAuth 已不再作为登录入口；现在首页就是手机号/密码登录。
- AI 督导、语音、地图、文件存储等功能如果仍调用第三方服务，需要另外配置对应 API Key 或后续替换为你自己的服务。