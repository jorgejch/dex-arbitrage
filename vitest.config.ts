import {
  defineConfig,
  ViteUserConfig,
  coverageConfigDefaults,
} from "vitest/config";

const config: ViteUserConfig = {
  test: {
    coverage: {
      reporter: ["cobertura"],
      exclude: [
        "src/abis/**/*",
        "diagrams/**/*",
        "scripts/**/*",
        ...coverageConfigDefaults.exclude,
      ],
    },
  },
};

export default defineConfig(config);