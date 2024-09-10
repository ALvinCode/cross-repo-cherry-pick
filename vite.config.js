import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"), // 入口文件
      name: "Crcp", // 库的全局变量名称
      fileName: "crcp", // 输出文件的命名规则
    },
    rollupOptions: {
      external: ["chalk", "child_process", "process", "inquirer"],
      output: {
        globals: {
          chalk: "chalk",
          child_process: "child_process",
          process: "process",
          inquirer: "inquirer",
        },
      },
    },
    minify: "terser",
  },
});
