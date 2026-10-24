# AYAN OS · 助手/服务接入状态（2026-10-24）

## 前提与原则
- 服务端：AI01 Docker / OpenHands Agent Canvas 1.33.0。
- 实验工作区只限 AYAN 的独立挂载目录；9630、ComfyUI 正式素材不应给 Agent 直接写权限。
- 不自动读取或迁移任何用户令牌 / 订阅登录文件。
- 未经明确批准不运行 GPU 生成、付费 API、全盘写入或外部自动发消息。

## 当前已配置
1. Ollama：local-qwen35-9b 与 local-qwen3vl-2b，均通过模型验证。
2. Agent：ayan-local-qwen35、ayan-local-vision，均为 OpenHands Agent。
3. Codex：新增 ayan-codex-subscription，ACP / Codex，绑定秘密名 CODEX_AUTH_JSON；**未授权，真实订阅调用尚未验收**。
4. OpenCode：新增 ayan-opencode，ACP / OpenCode；容器中 npx 可获取 OpenCode CLI 并成功返回版本；**尚未验证真实对话**。
5. ComfyUI：Docker 能访问 http://host.docker.internal:8188/system_stats（HTTP 200）。
   MCP 服务 ayan-comfyui-readonly 已保存并通过 /api/mcp/test（2 tools，工具调用成功）。
   专用 Agent ayan-comfy-inspector 绑定 local-qwen35-9b 和该 MCP。
   仅允许 GET /system_stats 和 GET /queue，输出简化健康信息及队列数量，绝不运行流程、调用 GPU 或修改队列。
   服务代码：scripts/ayan-os/mcp/comfyui-readonly.mjs。
   重建容器后执行 scripts/ayan-os/mcp/install-comfyui-readonly-mcp.ps1 恢复脚本。
6. OpenHands 69 条 Skill 简介中文显示翻译继续保留。

## 待用户授权或协议适配
- Codex 订阅：在本机 OpenHands「设置 → 机密」保存 CODEX_AUTH_JSON（禁止提交到 Git）；
  使用 ayan-codex-subscription 创建隔离测试对话；若 SQLite 再报错，先分析错误细节，不直接删除 .codex。
- WorkBuddy：已确认官方 Open API 支持本地助理任务，但需自行创建第三方应用、获审核及 OAuth 2.1 授权。
  不应未经用户授权从 WorkBuddy 桌面目录抽取凭据。
- DeepSeek Harness：官方 CLI 有 dsh --profile acp 入口；但 Docker 中没有 dsh 与对应模型登录，
  Windows 桌面程序的安装环境不可直接视为可复用的 Linux ACP 服务。本轮未伪装为已连接。
- 豆包桌面：没有确认当前客户端公开的 Agent 控制协议；不可假设复用免费桌面额度。
- GitHub 写入：AYAN OS Git 由 AI01 主机经已授权的 origin 推送；容器内不自动继承 GitHub 写入凭据。

## 界面使用路径
- 设置 → 代理：选择 ayan-codex-subscription / ayan-opencode / ayan-comfy-inspector。
- 自定义 → MCP Servers：查看 ayan-comfyui-readonly。
- 设置 → 机密：添加订阅登录（只需用户在可信本机界面操作）。
- 修改 Agent 配置只影响新建对话，旧会话不切换 Agent。

## 验收结论
- Profile 创建和保存不代表 Agent 真实任务已经通过。
- 当前已验证 ComfyUI MCP 只读工具；OpenCode CLI 版本；
  Codex 和 WorkBuddy 的订阅身份验证以及真实任务仍未通过。
