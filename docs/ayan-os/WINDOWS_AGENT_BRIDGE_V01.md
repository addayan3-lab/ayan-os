# AYAN Windows Agent Bridge V0.1

本轮在 `ayan-os/base-validation` 建立 Windows CLI/MCP 验证桥接器。它属于 Canvas 的本地工具接入与编排脚本，不实现 Agent Server 新端点或线协议，不改变 Canvas、SDK、Cloud、ACP 会话或 Electron 启动方式。

**当前结论：隔离功能测试通过；真实环境部分通过。Codex 状态数据库权限与 ComfyUI 套接字权限仍阻止完整接通。没有执行模型推理。**

## 分支与回滚点

- 开始时工作区干净，分支为 `ayan-os/base-validation`。
- 基点：`26b8ed221aca6334094bd07831e094938b181caa`，tree：`59fae9a8f1a6019da791e8570debb841787c271a`。
- origin：`https://github.com/addayan3-lab/ayan-os.git`；upstream 保持 OpenHands。
- 本会话的 `.git` 为只读；创建本地回滚标签遭拒。上面的提交是可用回滚点，并不是已创建的标签。
- 提交前发现并保留其他工作产生的中文界面提交 25384bc70199bd4f90bdaeb70a963d7df67ae0b3；以最新验证分支头作父提交。另有并发界面改动未纳入本轮文件清单。
- 不合并 main，不强推，不修改原有提交。本轮无法写入本地 .git。GitHub 连接器的 create_tree 写入返回 403 FORBIDDEN（Resource not accessible by integration），未创建 Bridge 提交、未更新远端分支，不更改其他工作留下的 HEAD/索引。
- 回退采用在验证分支对新增提交执行 `git revert <bridge-commit>`，不要对正式资产目录执行 reset/clean。

## 实际盘点与验证

| 接入项 | 已验证事实 | 限制 |
| --- | --- | --- |
| Windows Codex | 桌面包自带 `codex.exe`，版本 `0.163.0-alpha.11.2`；官方 `login status` 返回 ChatGPT 登录 | app-server 初始化因现有 `.codex` SQLite 状态目录写权限失败；订阅推理未验证 |
| Windows OpenCode | npm 安装的 `@opencode/cli/bin/opencode.exe`，版本 `2.1.2`；真实 ACP initialize 协议 1 成功 | PATH 另有旧版 `2.0.27`；桥接器优先已有 npm 安装，不升级、不下载；登录与推理未验证 |
| DeepSeek Harness | 桌面包内官方 `dsh.cmd`，CLI `0.2.1-rc.2`；`--profile acp` 真实 initialize 成功 | 仅使用隔离 DSH_HOME；登录与推理未验证 |
| 字字动画 9.0.9 | 随附官方插件开放包存在；官方 Python 3.12.1 成功运行适配器自检与 2 镜、60 秒合成交接数据检查 | 未安装进正式插件库，未通过软件 UI 执行官方 validator；未读取或修改影视作品 |
| ComfyUI | 复用既有只读 MCP 源码；Docker 与 Windows 两种固定地址的 GET/计数/拒绝生成契约测试通过 | 当前沙箱禁止本机套接字，真实 Windows 状态和队列重测均为 NETWORK_DENIED；原容器已通过的配置未动 |

字字动画的盘点目录：

- `C:\Users\adday\Downloads\字字动画_9_0_9\字字动画_9_0_9\_internal\插件开放包`
- `resources\plugins`：公开 PluginSDK JS/CSS。
- `_internal\plugins\tool_plugins`：随软件提供的工具插件示例。
- `user_resources\plugins`：用户插件、生成插件和已有视频插件目录；仅列目录，不导入执行这些插件或读取其 config.json。

参考随附的 `AI_CODING_GUIDE.md`、`TOOL_PLUGIN_DEV_GUIDE.md`、`GENERATION_PLUGIN_DEV_GUIDE.md`、`README.md` 及帮助文档“如何给软件编写插件”。前三份文件的 SHA-256 已写入验收 JSON。没有在这些公开文档确认可独立调用的官方外部 CLI/MCP，因此采用官方 Python 工具插件约定；这不表示软件绝无其他公开功能。

官方两类插件明确分开：本次实现的是 app 作用域的 `plugin.json + async execute(context) + async self_test(context)` 工具插件，不是会执行生图/视频的 `info.json + generate(context)` 生成插件。

## 使用

Codex 发现顺序为操作员设置的 AYAN_CODEX_EXE、桌面环境的 CODEX_ELECTRON_RESOURCES_PATH、PATH、已有 npm 官方包。普通 PowerShell 如果没有 Codex 的 PATH/桌面环境，可使用 Windows 官方包信息定位（只查询安装目录）：

```powershell
$codexPackage = Get-AppxPackage -Name OpenAI.Codex
$env:AYAN_CODEX_EXE = Join-Path $codexPackage.InstallLocation 'app\resources\codex.exe'
```

从仓库根目录在 Windows PowerShell 执行：

```powershell
node scripts/ayan-os/bridge/windows-agent-bridge.mjs capabilities
node scripts/ayan-os/bridge/windows-agent-bridge.mjs status
node scripts/ayan-os/bridge/windows-agent-bridge.mjs task '{"adapter":"opencode","operation":"check"}'
node scripts/ayan-os/bridge/windows-agent-bridge.mjs task '{"adapter":"codex","operation":"protocol-check"}'
node scripts/ayan-os/bridge/windows-agent-bridge.mjs task '{"adapter":"comfyui","operation":"queue-counts"}'
node scripts/ayan-os/bridge/windows-agent-bridge.mjs receipt <回执UUID>
```

`status` 包含五项基础检查及 Codex 协议检查；任何一项失败时 `allPassed=false`，CLI 退出码为 1。不要把“检测到已登录”当成“可执行订阅任务”。

离线交接样例：

```powershell
node scripts/ayan-os/bridge/windows-agent-bridge.mjs task '{"adapter":"zzdh","operation":"handoff-check","handoff":{"schemaVersion":1,"taskId":"sample","shots":[{"id":"01","duration":30,"prompt":"Synthetic opening"},{"id":"02","duration":30,"prompt":"Synthetic ending"}]}}'
```

MCP 启动：

```powershell
node scripts/ayan-os/bridge/windows-agent-bridge.mjs mcp
```

同目录 `mcp-config.windows.example.json` 提供 Windows 本机 stdio 配置示例。公开工具为 `bridge_status`、`bridge_capabilities`、`bridge_task`、`bridge_receipt`。没有修改真实 Codex/OpenCode 配置或迁移任何凭据。Docker 容器不能直接启动 Windows stdio 程序；这份配置用于支持本机进程的客户端，不表示现有 Canvas 已改为 Windows 后端。

## 隔离、任务与日志

默认根目录：`C:\AI\ayan-os\.tmp\windows-agent-bridge`（从脚本位置推导，不硬编码全局工作目录）。

- 每个任务独立 UUID 目录、cwd、XDG 数据/配置/缓存/状态目录和 DSH_HOME。
- `tasks/<UUID>/started.json` 记录 running；结束后以独占创建的 `receipt.json` 记录 succeeded/failed、时间、经过筛选的结果或错误码。回读未完成或中断写入时返回 started 状态，避免把未知结果当成功。
- `errors.jsonl` 只记录 UUID、适配器、操作、时间、分类、可重试标志和固定错误说明；不保存原始 stdout/stderr。
- `acceptance.json` 保存本机检查结果；经筛选的本轮证据在 `docs/ayan-os/WINDOWS_AGENT_BRIDGE_V01_ACCEPTANCE.json`。
- 只接受白名单操作；未知字段/命令/生成请求记为 POLICY_DENIED，不启动外部工具。
- 子进程不通过 shell；仅传递必要系统变量，不继承 API Key；缓冲区上限 1 MiB，普通检查 20 秒、ACP 30 秒；取消/超时时停止所管理的进程。
- 检查路径穿越与现有符号链接。此桥接器不是 OS 安全沙箱；不承诺抵御同一用户并发替换目录的攻击。
- Codex 认证仅经官方状态命令使用已有登录；不读取 auth.json，不输出/复制/迁移任何登录令牌。
- 进程被强制终止或主机掉电时，running 回执可能保留；不会自动把未知结果改为成功或自动重放任务。
- 不启动 ComfyUI、不提交 /prompt、不加载模型、不修改队列，不调用付费 API，不操作正式影视资产。

ComfyUI 仅增加固定宿主模式：默认仍用 `host.docker.internal:8188`；Windows 桥接器选择 `127.0.0.1:8188`。没有任意 URL 参数，并拒绝 HTTP 重定向。

## 验证与已知缺口

```powershell
node --test scripts/ayan-os/bridge/bridge.node-tests.mjs
node scripts/ayan-os/verify-baseline.mjs
node scripts/ayan-os/bridge/acceptance.mjs
```

- 先写测试观察失败，再实现桥接器；另复现并修正 OpenCode 的 v 前缀解析、Codex 未登录被误报为通用进程失败，以及首次并发建目录冲突的问题。
- 独立 Node 回归测试：12 通过，0 失败，1 跳过。跳过项是 Windows 沙箱禁止创建 junction 测试夹具；路径穿越测试已通过。
- 已通过真实进程、ACP 握手、MCP stdio、输出截断、超时退出、权限请求拒绝、脱敏、回执回读、ComfyUI 两种宿主模式的只读传输契约。
- 字字动画 self_test 使用确定性模拟 ToolClient 验证官方工具参数/返回/错误处理；这与真实宿主执行严格区分。离线 Python 运行不创建事件循环或套接字，不调用真实宿主。
- 隔离验收的 9 个回执均成功回读；非法生成和无效交接数据正确拒绝。由于 Codex/ComfyUI 两个环境阻塞，整体真实验收退出码仍为 1。
- 基线校验与 git diff --check 通过。
- 全仓 lint/test/build/build:lib 串行复核均未通过：缺少已安装的 react-router/vitest 等前端依赖。没有运行依赖解析/升级，没有修改 package.json 或 package-lock.json。首次并行触发这些命令造成 i18n 生成文件写入冲突，之后改为串行复核，生成步骤已正常完成。
- 已确认 Node 24.21.0、npm 11.19.0；仓库 npm 固定为 11.12.1。本次仅运行零依赖脚本，未使用不同 npm 版本解析依赖。
- 没有修改 verify-* 技能、feature map、正式资产或已有 Canvas 服务。没有 Canvas UI 改动，也没有伪造 UI/模型执行证据；后续若提 PR，仍需按贡献要求补齐适用的实际产品验收材料。

下一步应在具有正常本机状态目录和本机套接字权限的运行上下文中重跑现有命令，先解决两项阻塞；字字动画使用官方插件管理器导入适配器并执行官方检测后，才能标记宿主集成已通过。V0.1 没有开放任意推理任务、ACP session/prompt 或作品生成。



## 提交受阻时的交付

源文件保留在当前工作区；专用提交脚本为 `scripts/ayan-os/bridge/commit-validation.ps1`。它仅暂存本轮 17 个文件，先检查分支、origin、已有暂存内容及 Node 测试，再用 git commit -F 提交并普通推送验证分支；有任何冲突或权限错误即停止，不合并 main、不强推。

在具有正常 Git 写权限的 Windows PowerShell 中运行：

```powershell
powershell -NoProfile -File C:\AI\ayan-os\scripts\ayan-os\bridge\commit-validation.ps1
```

离线补丁：`.tmp/windows-agent-bridge/ayan-windows-agent-bridge-v01.patch`。它只包含本轮文件；当前工作区已具备这些改动，勿在同一工作区重复套用。源文件和补丁经过人工清单筛选，不包含并发的 UI 改动、真实登录信息或正式影视资产。

