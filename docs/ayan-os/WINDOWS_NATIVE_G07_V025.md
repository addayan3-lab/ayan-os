# 阿岩 OS V0.2.5 — G07 只读多 Agent 任务闭环
日期：2026-10-24。分支：ayan-os/base-validation；AI01 原生 Node 服务。

## 本轮实际完成
- 原版 Canvas 页面仍在 http://127.0.0.1:18081/canvas/ ，没有替换原有主页。
- 新任务页：http://127.0.0.1:18081/native/jobs/。
- 本机任务 API：GET /api/ayan/jobs；GET /api/ayan/jobs/:id；GET /api/ayan/jobs/:id/report；POST /api/ayan/jobs。
- POST 严格只接受 kind=h3-readonly-audit；需要 X-AYAN-Local=1 和本机来源校验，拒绝其他生成任务。
- 七个阶段：Codex 官方协议、OpenCode ACP、DeepSeek Harness ACP、ComfyUI 只读健康、字字动画 60 秒离线交接格式、4 个 H3 JSON 工作流盘点、生成 Markdown 报告。
- 任务回执持久化在 C:\AI\ayan-os-runtime\windows-native\jobs\{uuid}\receipt.json；报告为 report.md。
- 同时仅允许一单，重复提交合并；重启后正在执行的任务标记 interrupted，不自动重跑。
- 工作流只能只读扫描 C:\AI\ComfyUI-aki-h3\ComfyUI\user\default\workflows 下不超过 80 个小于 2MB 的 JSON。任务接口不接收自定义路径、Shell 命令或推理请求。
- 首次实机任务 18140c6c-0fb7-4e5c-89bc-700c75642ba3，7/7 阶段成功；4/4 工作流 JSON 结构有效，对应节点数为 28、29、30、36。
- 第一次报告将正在执行的报告生成阶段错误显示为未通过，已修复并新增回归测试，新报告不会再误报。

## 安全边界与验收
- 无付费 API、无 GPU 生成、无真实影视资产写入；仅测试协议、队列状态和交接格式。
- 字字动画宿主内真实插件调用、H3 节点运行兼容性、完全自主 Agent 任务派发尚未验证，不得作为已完成宣传。
- Bridge 13 项、原生 HTTP 1 项、任务引擎 6 项，共 20/20 自动测试通过。
- 复验命令：node --test scripts/ayan-os/native/audit.node-tests.mjs scripts/ayan-os/native/native.node-tests.mjs scripts/ayan-os/bridge/bridge.node-tests.mjs
- 后续重点：人工批准、任务取消和重试策略、任务队列、跨 Agent 隔离以及与原 Canvas 对话的安全集成。
