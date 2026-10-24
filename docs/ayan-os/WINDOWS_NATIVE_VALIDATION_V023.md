# 阿岩 OS Windows Native V0.2.3 — 实机验收（2026-10-24）

## 本轮已经执行的工作（不是定时提醒）

目标分段：G02 Codex、G03 OpenCode ACP、G04 DeepSeek Harness ACP。
工作环境：AI01 本机 Windows；项目分支 \`ayan-os/base-validation\`；
客户端版本入口 \`scripts/ayan-os/native/version.mjs\`。
验收脚本：\`node scripts/ayan-os/native/live-acceptance.mjs\`。

### 真实检查通过

- G02 Codex：Windows 官方 CLI 版本 \`0.163.0-alpha.11.2\`，官方 \`login status\` 检测到 ChatGPT 订阅登录；\`app-server --stdio\` 的 initialize 成功。**未读取或复制登录令牌；未请求推理**。
- G03 OpenCode：Windows CLI \`2.1.2\`，官方 ACP v1 initialize 成功，连续两次连接成功；客户端未创建 session，未请求模型回答。
- G04 DeepSeek Harness：桌面版本 \`0.2.1-rc.2\`，官方 ACP v1 initialize 连续两次成功。登录状态未验证，不能把 ACP 握手等同于模型可调用。
- G06 的只读检查附带完成：ComfyUI 系统健康和 queue-counts 成功；未触发 GPU 或生成。
- G05 只有独立插件烟雾测试：字字动画官方文档校验/60 秒脚本 handoff 校验通过。**官方字字动画宿主内实际执行插件仍未验证**。
- 安全验证：尝试 \`comfyui/generate\` 返回 \`POLICY_DENIED\`，有独立失败回执，未启动真实生成。
- 实机脚本共 9 项许可检查 **9/9 通过**，另有 1 项预期拒绝检查通过，全部记录独立 UUID 回执。
- 子进程超时/输出上限/工具申请拒绝的模拟回归测试由 \`bridge.node-tests.mjs\` 覆盖；真实 ACP 握手两次通过。

### 版本判断

原生控制台版本从 \`0.2.0\` 更新至 **\`0.2.3\`**；此版本标记 G02、G03、G04 的**协议/基础接入**已验收，而不是功能齐备。真实生成、模型推理、批量自动操作均未验证也未授权。
G05 宿主内官方插件完整闭环继续待验收，下一步应先查官方操作步骤、插件安放位置、能力限制，只有官方明确可用的安全操作才进入测试。

### 复验方式

\`\`\`powershell
cd C:\AI\ayan-os
node --test scripts\ayan-os\bridge\bridge.node-tests.mjs
node --test scripts\ayan-os\native\native.node-tests.mjs
node scripts\ayan-os\native\live-acceptance.mjs
(Invoke-RestMethod http://127.0.0.1:18081/api/health).version
\`\`\`

严格限制：不合并 main、不替换旧 Docker 18080、不改 9630、8188 的进程和任何正式影视资产、不接入收费生成、不访问登录令牌。用户所有尚未关联品牌原稿存放在 \`public/ayan-os/branding/\` 的未跟踪数据不纳入本次提交。
