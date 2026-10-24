# AYAN OS 底座验证基线 V0.1

状态：OpenHands 官方源码的本地验证分支；GitHub 在线 Fork 尚待完成。

- 上游：OpenHands/OpenHands main @ 11eba891cb2455f87253888d9d3bf3f6b0f12bc1
- 本地目录：C:\AI\ayan-os
- 验证分支：ayan-os/base-validation
- 源码许可：MIT。保留 LICENSE 与上游原署名。

## 产品边界

AYAN OS 是本机优先的 Agent 调度与验收平台，不是 Windows/Linux 操作系统。
第一版只验证 OpenHands 作为可替换执行底盘；AYAN 自己的任务、日志、知识和界面需自主存储、可导出。

## 本阶段明确不做

- 不改写 C:\AI\阿岩工作台\应用 / 9630 正式数据。
- 不接入豆包、WorkBuddy；不启动 ComfyUI、GPU 或付费模型。
- 不在 Windows 宿主机直接启动 OpenHands 无沙箱 Agent Server。
- 不挂载私人目录到 Agent 工作区，不公开监听端口。
- 不在 Git 仓库保存 Token、API Key 和密钥。

## 底盘验收

1. 源码 LICENSE 存在；可检查上游版本；本地验证分支独立。
2. 用纯 Node 内置模块运行脚本 scripts/ayan-os/verify-baseline.mjs，结果 PASS。
3. GitHub 端建立 addayan/ayan-os 正式 Fork；验证 fork 来源。（当前未完成）
4. 为 Agent 建立独立沙箱，例如 C:\AI\ayan-os-sandbox。Windows Docker Desktop / WSL2 需另行检查和安装。
5. 不调用模型时，先完成只读页面/健康检查。
6. 只有沙箱及授权都满足后，才进行首个真实任务：示例输入、生成测试报告、记录执行日志、人工验收。
7. AYAN 业务 API 接入后也不能让 Agent 直接修改 9630 生产数据库。

## 官方安全提示

OpenHands 的 README 明确警告：直接运行无沙箱模式可能访问宿主计算机全部文件。
README.windows.md 介绍了 Windows Docker Desktop 路径；每会话 Docker 沙箱模式需要 WSL2 环境。
AI01 检测：Node 24 和 Git 已存在；Docker CLI、uv CLI 未检测到。不要因此默认启动宿主 Agent。

## 在线 Fork 的唯一人工步骤

打开 https://github.com/OpenHands/OpenHands/fork
选择所有者 addayan，新名称 ayan-os，选择只复制 main 主分支，提交 Fork。
Fork 确认存在之后，本地再执行：
    cd C:\AI\ayan-os
    git remote add origin https://github.com/addayan/ayan-os.git
    git remote -v
    git push -u origin ayan-os/base-validation
注意：不要推送 upstream。必须先核实 GitHub 身份和远端来源。

## 完成记录

官方源代码本地克隆：完成。
本地验证分支：完成。
线上 Fork：未完成。
沙箱 / 模型 / Agent 真实任务执行：未开始。
