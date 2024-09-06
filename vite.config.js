import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts"; // 生成 TypeScript 类型声明文件

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"), // 入口文件
      name: "Crcp", // 库的全局变量名称
      formats: ["es", "umd"], // 输出的格式
      fileName: (format) => `crcp.${format}.js`, // 输出文件的命名规则
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
  plugins: [
    dts({
      insertTypesEntry: true, // 在 package.json 中插入类型声明文件的条目
    }),
  ],
});
