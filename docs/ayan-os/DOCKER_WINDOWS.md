# AYAN OS · Windows Docker 沙箱启动手册 (2026-10-24)

## 当前真实检查
AI01：Windows 11 Home / i7-13700KF / WSL 3.0.3 / Node.js 24 / Git。
系统报告 HypervisorPresent=True；同时 WMI 的 VirtualizationFirmwareEnabled=False。
两者不能证明 BIOS 一定关闭虚拟化；以 Docker/WSL2 实际启动诊断为准。
历史初检时 Docker Desktop / docker.exe 尚未安装；Remote MCP 当前不是管理员。
随后 Docker Desktop 已安装，Linux Engine 返回 linux / 29.9.2，WSL 中出现 docker-desktop。
C:\AI\ayan-os 源码和本地 ayan-os/base-validation 验证分支均正常，Docker 容器已启动并通过只读健康检查。

## 隔离设计（先约束后启动）
上游镜像：ghcr.io/openhands/agent-canvas:1.33.0（来源：本地 README.windows.md 示例）
容器名称：ayan-os-openhands-v01
回环端口：127.0.0.1:18080 → 容器 8000，不监听局域网。
只挂载：
- C:\AI\ayan-os-runtime\projects → /projects
- C:\AI\ayan-os-runtime\openhands-home → /home/openhands/.openhands

不挂载 C:\AI 根目录、不挂载正式「阿岩工作台」数据、不挂载其他项目和 Docker Socket。
命令不带 --gpus / --privileged，并使用 --security-opt no-new-privileges:true。
容器仍需防范镜像、网络和 Agent 自身风险；沙箱里不要放密码或私有数据。
不会自动配置模型 Key，不发送付费请求。

## 需要在 AI01 本机完成的管理员操作
1. 用管理员身份打开 Windows Terminal。
2. 检查命令：wsl --status 和 wsl --version。系统已有 WSL；若 Docker 安装器提示缺少组件，
   依提示完成 WSL2 / Virtual Machine Platform 更新，必要时重启 Windows。
3. 从 Docker 官方网站 https://www.docker.com/products/docker-desktop/ 安装 Docker Desktop；
   或管理员终端执行下面命令：
   winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
4. 启动 Docker Desktop，选择 Linux containers / WSL2 backend。
   确认 docker info --format '{{.OSType}}' 输出 linux。
   这里使用 Docker Desktop 单沙箱运行方式，不强制安装 Ubuntu。
   若 Linux Engine 启动失败，再检查 BIOS 的 Intel Virtualization Technology 与 Windows 虚拟化组件。
5. 只绑定 localhost，不开放 Windows 防火墙公网端口。

## 环境验收：无副作用
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\AI\ayan-os\scripts\ayan-os\docker\preflight.ps1"

预期全部 PASS，最终输出 AYAN_DOCKER_PREFLIGHT_OK。
预览启动参数（不会拉取镜像或启动容器）：
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\AI\ayan-os\scripts\ayan-os\docker\start-isolated.ps1"

## 安全启动（Docker 引擎就绪后）
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\AI\ayan-os\scripts\ayan-os\docker\start-isolated.ps1" -Start

验证容器 running 状态：
docker ps --filter "name=ayan-os-openhands-v01"
打开 http://127.0.0.1:18080/canvas 并确认页面有效。
**页面成功不代表 Agent Server 已通过 API / 身份鉴权 / 任务执行验收**。

## 停止和回滚（不删除正式文件）
docker stop ayan-os-openhands-v01
docker rm ayan-os-openhands-v01
容器删除后独立测试目录仍在，未核验前不要删除目录。

## 当前状态
2026-10-24 实测：Docker Desktop Linux Engine 29.9.2 可用；官方镜像 Agent Canvas 1.33.0 已拉取。
容器 ayan-os-openhands-v01 运行中，/canvas、/health、/alive、/ready、/api/automation/health 均返回 HTTP 200。
Agent Server /ready 内容为 {"status":"ready"}，SDK / Agent Server 为 1.58.1。
只读复验命令：powershell -NoProfile -ExecutionPolicy Bypass -File "C:\AI\ayan-os\scripts\ayan-os\docker\verify-runtime.ps1"
未调用 LLM、没有创建 Agent 会话，也未进行模型成本或真实任务验收。
后续任何模型执行须另经授权；禁止以宿主机无沙箱模式代替隔离容器。
