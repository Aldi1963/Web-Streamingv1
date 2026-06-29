import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    test: {
      environment: "node",
      env: {
        APP_URL: "http://localhost:3000",
        DATABASE_URL: "mysql://test:test@localhost:3306/test",
        AUTH_SECRET: "test-secret-at-least-32-characters-long",
        CLIPKU_API_BASE_URL: "https://api.clipku.com",
        ...env,
      },
    }
  };
});
