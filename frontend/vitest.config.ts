import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "../supabase/functions/chat/**/*.test.ts",
    ],
    server: {
      deps: {
        inline: [/supabase\/functions\/chat/],
      },
    },
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
      VITE_PROMPT_TEST_SUPABASE_URL: "https://staging.example.supabase.co",
      VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY: "test-staging-anon-key",
      VITE_PROMPT_TEST_CHAT_FUNCTION: "chat-staging",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Edge functions import Deno `npm:` specifiers; stub for unit tests (see src/test/stubs).
      "npm:ai": path.resolve(__dirname, "./src/test/stubs/npmAi.ts"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
