# 模幻AI工具 (Mohuan AI Tools)

> 硅基链路（modelswitch.org）网关一键配置工具

跨平台桌面应用，支持 macOS / Windows / Linux，为 Claude Code、Codex、Gemini CLI 等 AI 编程工具提供一键配置，统一对接 [modelswitch.org](https://modelswitch.org/) 网关。

## 功能特性

- **一键配置** — 自动写入 Claude Code / Codex / Gemini CLI 的配置文件，无需手动编辑
- **统一网关** — 所有请求走 `https://modelswitch.org/v1`，开箱即用
- **API Key 快捷填入** — 支持从剪贴板一键粘贴 API Key
- **余额查询** — 登录后实时查看账户余额和用量统计
- **一键启动** — 快速启动 Claude Code / Codex 命令行工具
- **多语言** — 支持中文 / English / 日本語

## 安装

### macOS
下载 `modelswitch-tools-<版本>-macOS.dmg`，拖入 Applications 文件夹即可。

### Windows
下载 `modelswitch-tools-<版本>-Windows-Setup.exe` 安装，或 `modelswitch-tools-<版本>-Windows-Portable.zip` 绿色版。

### Linux
下载 `modelswitch-tools-<版本>-Linux-<架构>.deb` / `.AppImage` 安装。

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Rust](https://www.rust-lang.org/tools/install) >= 1.85

### 本地开发

```bash
pnpm install
pnpm tauri dev
```

### 构建

```bash
pnpm tauri build
```

## 技术栈

- [Tauri 2](https://v2.tauri.app/) — 跨平台桌面框架
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Rust](https://www.rust-lang.org/) — 后端逻辑
- [Tailwind CSS](https://tailwindcss.com/) — 样式

## License

MIT
