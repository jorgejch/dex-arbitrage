import { defineConfig, ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
  test: {
    coverage: {
      reporter: ["cobertura"],
      include: ["src/**/*"],
      exclude: ["src/abis/**/*"], // Exclude abis from coverage
    },
  },
};

export default defineConfig(config);
