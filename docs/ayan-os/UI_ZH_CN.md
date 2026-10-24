# AYAN OS · 中文界面统一用词（2026-10-24）

## 原则
- 软件界面优先自然简体中文，不硬翻技术术语。
- 以下名称保留英文：Skills、Apps、Codex、OpenCode、MCP、API、GitHub、Docker、LLM、Python、Webhook、Agent Canvas 等。
- 有歧义的中文需改成直观操作名称，例如“机密”改为“凭据与密钥”。
- Agent 保留英文，避免被误解为 Windows 代理设置或网络代理。
- 不翻译命令行参数、路径、API 路由、JSON 字段、技能原始英文正文与提示词触发字段。

## 审查与实现
- 原有语言包共 2,934 条键，简体中文没有缺少的键，但有一批新增键仍沿用英文。
- scripts/ayan-os/i18n/zh-CN-overrides.json：经过人工检查的 103 条 UI 中文修正，允许保留术语。
- scripts/ayan-os/i18n/apply-zh-cn.cjs：只替换对应 zh-CN 值；验证 {{placeholders}} 严格不变；源文件采用就地微调以便最小 Git diff。
- src/i18n/translation.json：上游结构不变，其他语言不变。
- 运行环境当前使用 Docker 静态语言文件 /opt/agent-canvas/frontend/locales/zh-CN/openhands.json。
- scripts/ayan-os/i18n/deploy-zh-cn.ps1：备份、更新源翻译文件并热更新运行中的中文语言资源，不重启 Docker。

## 首批覆盖
- 命令菜单：搜索、导航、快捷动作、跳转说明、搜索不到时的帮助文案。
- 自动化设置：类型、定时、事件、Webhook、草稿、错误提示与测试状态。
- 设置导航：保留 Skills、Apps；Agent 配置、凭据与密钥更易理解。

## 验收
- JSON 格式、键数量、插值变量都要保持有效。
- 实时通过 /canvas/locales/zh-CN/openhands.json 返回中英术语正确。
- Agent Server /ready 返回 ready。
- 强制刷新网页（Ctrl+F5）并确认 UI 效果，视觉检查才算最终验收。
- 后续新增的未翻译文案可以继续按此文件追加，不修改 Agent 功能逻辑。

## 回滚
源码文件恢复至 Git 修改前版本，或使用 C:\AI\ayan-os-runtime\i18n-validation\translation-original.json。
运行环境把 C:\AI\ayan-os-runtime\i18n-validation\openhands.zh-CN-original.json 用 docker cp 放回容器相同路径。
保留备份，不删除任何现有用户配置和登录数据。
