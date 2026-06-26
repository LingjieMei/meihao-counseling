export const ENV = {
  appId: process.env.VITE_APP_ID ?? "meihao-counseling",
  cookieSecret: process.env.JWT_SECRET ?? "change-this-before-public-deploy",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
