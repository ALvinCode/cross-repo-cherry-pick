# cross-repo-cherry-pick

Perform cherry-pick operations between projects to reduce duplication of work when developing the same module for projects with only partial differences. This allows multiple projects to be maintained independently and synchronized.

## 特性

- **跨项目 Cherry-Pick**：在不同项目之间执行 cherry-pick 操作，减少重复工作。
- **独立维护**：允许多个项目独立维护，并保持同步。
- **命令行工具**：提供简单易用的命令行工具。

## 安装

使用 npm 安装：

```bash
npm install -g cross-repo-cherry-pick
```

# Usage

提示：source-repo请尽量使用ssh协议，以避免输入密码。

基本命令

```bash
crcp <source-repo> <source-branch> <commit-hash> <target-repo> <target-branch>
```

示例

```bash
crcp git@github.com/user/source-repo.git main abc123 git@github.com/user/target-repo.git develop
```

# 配置

你可以在项目根目录下创建一个 .crcpconfig 文件来配置默认选项：
  
```json
{
  "sourceRepo": "git@github.com/user/source-repo.git",
  "sourceBranch": "main",
  "targetRepo": "git@github.com/user/target-repo.git",
  "targetBranch": "develop"
}
```

# 许可证

MIT

# 作者

Kuo.Zheng
