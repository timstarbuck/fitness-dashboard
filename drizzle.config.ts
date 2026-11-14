import { defineConfig } from "drizzle-kit";

if (typeof process.loadEnvFile !== "function") {
  throw new Error("Loading .env.local requires Node.js 20.12 or newer.");
}

process.loadEnvFile(".env.local");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .env.local or the environment.");
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
