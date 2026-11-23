import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "ph-gov-directory",
    "compatibilityDate": "2026-09-21",
    "observability": {
      "enabled": true
    },
    "entrypoint": "dist/_worker.js/index.js",
    "compatibilityFlags": [
      "global_fetch_strictly_public"
    ],
    "env": {
      "ASSETS": {
        "type": "assets"
      }
    }
  }
});
