# 阿岩 OS · Windows Native 路线图（十项目标）

- 当前版本：**V0.2.0**（第一阶段：零 npm 下载的 Windows 原生控制台 + 已验证 Windows Agent Bridge）
- 版本源：\`scripts/ayan-os/native/version.mjs\`；运行中接口：\`GET http://127.0.0.1:18081/api/health\`
- 代码工作分支：\`ayan-os/base-validation\`；不合并 main，禁止破坏性 git 清理。
- 工作机器：AI01，\`C:\AI\ayan-os\`。不覆盖原有 \`18080\`、\`9630\`、\`8188\`。
- 每个里程碑都要求：\`git status\`→隔离目录单测→回执/异常检查→版本记录→验证分支 commit；条件允许且无凭据泄漏时 push。
- **绝不**破解私有接口、迁移登录令牌、触发 GPU、调用付费 API 或写入正式影视资产。
- 任务推进说明：本计划是分阶段验收，不承诺在某个固定日期完成实际模型推理或影视生成。

| 目标 | 版本目标 | 验收标准 | 依赖/边界 |
| --- | --- | --- | --- |
| G01 原生启动与桌面入口 | V0.2.0 | HTTP 18081 ready；主页 HTTP 200；旧服务独立，桌面快捷方式可打开原生页 | 当前进行 |
| G02 Codex Windows 官方接入 | V0.2.1 | 官方 CLI 被发现、确认 ChatGPT 登录、app-server initialize；记录回执 | 禁止直接提取凭据 |
| G03 OpenCode ACP | V0.2.2 | OpenCode v2.1.2 协议握手及超时/取消测试通过 | 测试用伪任务，暂不推理 |
| G04 DeepSeek Harness ACP | V0.2.3 | DSH v0.2.1-rc.2 ACP 握手与错误分类可重复 | 不逆向内部接口 |
| G05 字字动画官方插件 | V0.2.4 | 官方 Python 工具插件在官方宿主通过 self_test；一份 60s 合成剧本 handoff 样例通过校验 | 不写正式影视资产 |
| G06 ComfyUI 只读桥接 | V0.2.5 | health/queue 通过；工作流索引仅本地只读；拒绝 /prompt | 禁 GPU、禁生成 |
| G07 多 Agent 任务与回执 | V0.2.6 | 统一任务状态机、去重、错误码、检索和中断安全单测通过 | 未授权不批量下发真实任务 |
| G08 完整中文与品牌 | V0.2.7 | Dashboard、设置、MCP、自动化、对话帮助的常用中文覆盖；保留 Skills、Apps 等名称 | 不触碰接口约定 |
| G09 原生桌面封装 | V0.2.8 | 有独立 Windows 窗口、重启可恢复、非 Docker；版本和图标一致 | 原版 Canvas Electron 全量运行依赖另行验证 |
| G10 AI 制片一分钟编排 | V0.3.0 | 剧本→资产引用→分镜→官方字字动画 handoff→H3 只读检查→回执汇总在测试项目模拟闭环 | 真正生成视频必须另经明确授权 |

## 每日定时推进规则

- **早间开发巡检（十次）**：核对代码和版本，找出优先级最高的未完成目标，若有授权及连接则从其隔离测试开始开发；无法连接则给出明确阻塞和一次可复制的人工执行命令。
- **晚间验收复盘（十次）**：复测本日变动的验收标准，检查回执、日志与 Git 差异，记录完成/失败/待授权；只有测试通过才调整版本号，不虚报已合并或已发布。
- 两类任务使用 ChatGPT 定时任务自动触发。每次任务能否直接访问 Windows 客户端取决于当时工具连接/授权；不保证后台独立持续运行。
- 定时任务不启动 GPU、不调用付费 API、不在 \`main\` 工作、不改 \`9630\` 或影视生产资料。

## 首次 V0.2.0 验收结果

- \`node --test scripts/ayan-os/bridge/bridge.node-tests.mjs\`：13/13 通过。
- \`node --test scripts/ayan-os/native/native.node-tests.mjs\`：1/1 通过（HTTP + 控件权限 + 真实 ComfyUI 只读回执），无付费调用。
- \`GET /api/health\` 的 \`mode=windows-native\`、\`dockerRequired=false\`；\`GET /\` HTTP 200。
- Codex Windows 本机发现路径修复：允许发现已有官方 Codex 桌面 \`AppData\Local\OpenAI\Codex\bin\*\codex.exe\`。
- 原版 Docker \`18080\` 和原 \`9630\`、\`8188\` 继续保留，逐阶段迁移。
