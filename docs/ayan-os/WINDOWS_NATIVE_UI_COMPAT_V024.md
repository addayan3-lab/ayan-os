# 阿岩 OS V0.2.4 — 恢复原版 Canvas 界面与静态 Logo

日期：2026-10-24。工作分支：`ayan-os/base-validation`。不合并 main。

## 修复的实际问题

1. 先前 `18081` 的 `/` 显示另一套简化控制台，和原有 `18080/canvas/` 视觉结构不一致。现在 `18081/` 默认重定向到 `18081/canvas/`，原版 Canvas 资源与路径由 Windows Node 兼容代理透明转发给原 Docker 服务 `18080`。
2. **静态 Logo** 直接复用已确认的本机 `public/ayan-os/branding/ayan-mark.webp`，将副本 `ayan-mark-static.webp` 纳入代码；导航、浏览器图标及桌面快捷方式统一使用同款静态图像。原始 `branding/` 用户文件未修改，不在版本提交中。
3. 原生 Bridge、状态、能力列表、回执等功能仍由 Windows 本地 Node `18081/api/...` 实现；原简化控制台保留在 `18081/native/` 作为运维页面，而非默认首页。桌面快捷方式仍指向 Windows 原生启动脚本，图标换为 `ayan-os-static.ico`，旧快捷方式已备份。

## 关键限制——不虚报“全部脱离 Docker”

- **Windows Agent Bridge** 已经原生，无需 Docker 就能进行本机官方 CLI/ACP/MCP 只读检查。
- **完整 Canvas UI 及原版对话、Skills、Plugins、Automate 后端仍然需要原 Docker 容器运行**。兼容代理并不等于将这些后端服务重写到 Windows。
- 如 Docker 停止，Windows Bridge `18081/native/` 仍可打开、服务健康检查仍正常，但完整 `18081/canvas/` 暂不可用。
- 下一阶段才是逐个将 Canvas 的数据层、会话、工作区、Automation/Skills 后端迁移到 Windows 本地，保留原界面并解除 Docker 依赖；迁移前不得宣称原生功能完全等价。

## 实机验收

```powershell
cd C:\AI\ayan-os
node --test scripts\ayan-os\bridge\bridge.node-tests.mjs
node --test scripts\ayan-os\native\native.node-tests.mjs
node scripts\ayan-os\native\canvas-compat.smoke.mjs
Invoke-RestMethod http://127.0.0.1:18081/api/health
```

本次检验结果：
- Bridge 单测 13/13 通过；原生 HTTP 单测 1/1 通过。
- `18081/` → `302 /canvas/`。
- `18081/canvas/` 和 `18080/canvas/` 原版 HTML **SHA-256 完全相同**，同时 `/canvas/conversations` HTTP 200。
- 完整界面静态金色 Logo 和品牌脚本 HTTP 200，脚本引用 `ayan-mark-static.webp`，没有 Logo 动画。
- `18081/native/` HTTP 200；`18081/api/health` 返回 `version=0.2.4` 且明确标记 `originalBackendRequiresDocker=true`。
- 桌面快捷方式图标指向新文件 `ayan-os-static.ico`，原快捷方式保留本地备份。

## 回滚

静态 Logo：恢复 `public/ayan-os/ayan-brand.js` 的旧引用，重新执行 `scripts/ayan-os/i18n/install-ayan-brand.ps1`；桌面快捷方式可从 `C:\AI\ayan-os-runtime\windows-native\backup-shortcuts` 恢复。
Windows 兼容入口：撤销 `server.mjs` 的代理层并重启指定的 Windows Native Node 服务；原 Docker `18080` 完全不受此路由修改影响。
禁止对任何正式影视资产进行写入，不使用付费 API、不启动新 GPU 任务、不读取凭据。

## 此次开发范围

此版本仅修复界面一致性与 Logo 选择。此前路线图 G05 的字字动画宿主内执行验证，以及 G07 真正多 Agent 任务派发，仍然待完成。
