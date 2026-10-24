# AYAN OS · MCP / Plugins / Automate 目录中文简介 (2026-10-24)

## 用户界面目标

对 OpenHands 1.33.0 当前运行中的三个动态目录补齐中文简介，同时完善自动化概览文字。
保留 MCP、Plugins、Skills、Apps、GitHub、Slack、Codex、API 等名称；技术参数、CLI 命令、API 路由与各 Agent 提示词保持原文。

## 覆盖实证

- MCP 官方 Integration Catalog：79/79 条，逐条以 id 对照，未漏译或出现多余 id。
- Plugins 本地 Marketplace：9/9 条；来自 /api/plugins/marketplace，仅获取非秘密的名字与简介。
- Automation 官方 Catalog：23/23 条，逐条以 id 对照，无漏译或额外 id。
- 共 111 条独立插件与自动化目录中文简介。
- 自动化页面其他基础描述、菜单、Dashboard 指标与模板分类按明确审校文本显示中文。

## 数据与实现

- public/ayan-os/catalog-intros.zh-CN.json：111 条中文简介的稳定 ID 对照表。
- public/ayan-os/catalog-intros.zh-CN.js：运行于 zh-CN 时的显示层翻译，支持目录卡片、MCP 安装详情、Plugin 详情和 Automation 的卡片、概览。
- src/root.tsx：源码构建保留相同的资源引用。
- scripts/ayan-os/i18n/patch-catalog-html.cjs：对正在运行的官方 Docker 前端 HTML 增加可回滚的 script 引用。
- scripts/ayan-os/i18n/install-catalog-intros-zh.ps1：部署资源并检查 HTTP 和 Agent Server 状态。

本方案只修改可见页面文字，不修改 API 返回的原始英文目录或用户 Agent 的任务输入。
保留英文原文为鼠标悬停提示；不认识的新条目仍保持原文。

## 运行中部署

在 AI01 执行：

powershell -NoProfile -ExecutionPolicy Bypass -File "C:\AI\ayan-os\scripts\ayan-os\i18n\install-catalog-intros-zh.ps1"

界面访问 http://127.0.0.1:18080/canvas/mcp、
http://127.0.0.1:18080/canvas/skills/plugins、
http://127.0.0.1:18080/canvas/automations/templates、
http://127.0.0.1:18080/canvas/automations；
按 Ctrl+F5 强制刷新。必要时重新打开页面。
未执行浏览器实际目视截图对比；此项仍需用户确认。

## 安全与回滚

没有安装或启用新的 MCP/Plugin，没有运行任何 Automation，没有调用模型/GPU，没有修改影视资产或登录凭据。
当前运行时静态 HTML 安装器会在容器内保留 index.html.ayan-before-catalog-intros；
恢复此备份即可撤销运行时翻译入口。
源码层的 src/root.tsx 对应新增 script 行可独立撤销。
热部署资源在 Docker 重建后可能丢失，应再次运行安装脚本。
