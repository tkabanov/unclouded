import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync } from "fs";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { buildAppleAppSiteAssociation, buildAssetLinks } from "./src/lib/platform/wellKnownFiles";

/** MOB-12: emit /.well-known association files from build env (see wellKnownFiles.ts). */
function wellKnownFiles(): Plugin {
  return {
    name: "unclouded-well-known",
    apply: "build",
    generateBundle() {
      const identityPath = path.resolve(__dirname, "../mobile/app-identity.json");
      const { appId } = JSON.parse(readFileSync(identityPath, "utf8")) as { appId: string };
      const input = {
        appId,
        appleTeamId: process.env.APPLE_TEAM_ID,
        androidCertSha256: process.env.ANDROID_CERT_SHA256,
      };
      this.emitFile({
        type: "asset",
        fileName: ".well-known/apple-app-site-association",
        source: buildAppleAppSiteAssociation(input),
      });
      this.emitFile({ type: "asset", fileName: ".well-known/assetlinks.json", source: buildAssetLinks(input) });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "::",
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), wellKnownFiles(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
