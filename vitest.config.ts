import {
  defineConfig,
  ViteUserConfig,
  coverageConfigDefaults,
} from "vitest/config";

const config: ViteUserConfig = {
  test: {
    coverage: {
      reporter: ["cobertura"],
      include: ["src/**/*"],
      exclude: ["src/abis/**/*",  ...coverageConfigDefaults.exclude], // Exclude abis from coverage
    },
  },
};

export default defineConfig(config);
