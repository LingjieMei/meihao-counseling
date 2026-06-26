import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "../drizzle/schema";

const databaseUrl = process.env.DATABASE_URL;
const phone = process.env.ADMIN_PHONE;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "管理员";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!phone || !password) {
  throw new Error("ADMIN_PHONE and ADMIN_PASSWORD are required");
}

if (password.length < 6) {
  throw new Error("ADMIN_PASSWORD must be at least 6 characters");
}

const db = drizzle(databaseUrl);
const passwordHash = await bcrypt.hash(password, 10);
const openId = `phone_${phone}`;
const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

if (existing.length > 0) {
  await db
    .update(users)
    .set({
      openId,
      name,
      passwordHash,
      loginMethod: "phone",
      role: "admin",
      lastSignedIn: new Date(),
    })
    .where(eq(users.phone, phone));
  console.log(`Admin user updated: ${phone}`);
} else {
  await db.insert(users).values({
    openId,
    name,
    phone,
    passwordHash,
    loginMethod: "phone",
    role: "admin",
    lastSignedIn: new Date(),
  });
  console.log(`Admin user created: ${phone}`);
}