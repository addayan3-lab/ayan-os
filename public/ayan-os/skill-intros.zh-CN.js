/* AYAN OS Skill 简介中文展示层 v0.1.
 * 仅修改 Skill 列表和详情页的屏幕显示，不修改 SDK/API 原始英文描述、
 * Skill 内容、工具权限、触发词、启用状态或认证信息。
 * 中文非激活语言时不替换。英文原文通过悬停 title 保留。
 */
(() => {
  "use strict";

  const zh = Object.freeze({
    "add-javadoc": "为 Java 类和方法自动补充完整的 JavaDoc 注释，完善接口文档与代码说明。",
    "add-skill": "从指定的 GitHub 仓库地址导入现成 Skill 到当前工作区；仅在提供仓库链接时使用。",
    "agent-canvas-environment": "熟悉本地 Agent Canvas 环境：认证、端口、工作区安全管理及创建新的代理会话。",
    "agent-creator": "通过结构化问答收集需求，创建符合 OpenHands SDK 规范的 Markdown 子智能体文件。",
    "agent-memory": "使用 AGENTS.md 保存并检索仓库知识，如构建命令、代码风格和项目流程。",
    "agent-sdk-builder": "引导设计自定义 AI 智能体，收集需求并生成基于 OpenHands SDK 的实现计划。",
    "azure-devops": "连接 Azure DevOps 仓库、拉取请求与 API，协助管理代码和研发资源。",
    "bitbucket": "识别 Bitbucket Cloud 或自建 Data Center 仓库，并切换到对应的协作技能。",
    "bitbucket-cloud": "操作 Bitbucket 云端仓库：认证、REST API、工作区及拉取请求管理。",
    "bitbucket-data-center": "操作企业自建 Bitbucket Data Center：认证、仓库管理和拉取请求。",
    "canvas-extension-api": "开发 OpenHands Canvas 扩展应用：应用脚手架、界面、Sidecar 服务和打包部署。",
    "code-review": "审查代码变更的正确性、安全性、兼容性和可维护性，并依据项目验收标准提出意见。",
    "code-simplifier": "在保持功能不变的前提下简化和优化代码，提高复用性、清晰度与效率。",
    "datadog": "查询 Datadog 日志、监控指标、APM 链路和告警，用于排查线上问题。",
    "deno": "初始化和维护 Deno 项目，管理依赖、任务、权限及内置格式化、检查与测试。",
    "discord": "开发和自动化 Discord 机器人、Webhook、频道与斜杠命令集成。",
    "docker": "在容器环境中执行 Docker 操作，管理镜像、容器以及相关运行服务。",
    "evidence-based-citations": "用官方、可核验的来源和准确链接支持事实结论与字段填写，避免无依据断言。",
    "flarglebargle": "用于检查 Skill 触发机制的测试技能：识别指定测试词并返回预设回应。",
    "frontend-design": "制作具有辨识度和生产级品质的网页、组件、控制台与视觉界面。",
    "github": "通过 GitHub CLI 和 API 管理仓库、Issue、Pull Request 与工作流。",
    "github-actions": "编写、调试和测试 GitHub Actions，搭建自动化构建、测试和发布流程。",
    "github-agents-md-maintainer": "定期检查 GitHub 仓库并自动更新 AGENTS.md，提交变更供审核。",
    "github-delivery-watchdog": "持续检查拉取请求的评审、测试和 CI 状态，仅在满足条件时执行合并。",
    "github-issue-to-pr": "根据 GitHub Issue 的指定标签自动实现任务、提交代码并创建 Pull Request。",
    "github-issue-triage": "整理 GitHub Issue 的优先级和验收标准，决定哪些问题可以进入开发。",
    "github-pr-review": "通过 GitHub API 发布代码审查意见，包括行内评论、修改建议和优先级。",
    "github-pr-reviewer": "当 PR 被请求评审或打上指定标签时，自动启动审查并发布结果。",
    "github-repo-monitor": "监听 GitHub 仓库中的 Issue、PR、评论或指定触发词，并触发 OpenHands。",
    "github-stale-ci-pr-closer": "识别长期无人处理、必需 CI 持续失败的 PR，先提醒再按规则关闭。",
    "gitlab": "通过 GitLab API 管理仓库、合并请求和研发协作资源。",
    "gitlab-issue-to-mr": "根据 GitLab Issue 的触发标签自动开发、提交代码并创建 Merge Request。",
    "incident-retrospective": "收集事故频道、工单和后续任务，自动草拟包含时间线与根因的复盘文档。",
    "iterate": "围绕 GitHub PR 循环完成 CI、代码审查和质量验收，修复问题直到可合并。",
    "jira-issue-to-pr": "把 Jira 工单接入自动化研发流程，满足触发条件后生成 GitHub PR 或 GitLab MR。",
    "jupyter": "读取、修改、运行和转换 Jupyter Notebook，支持数据分析和实验流程。",
    "kubernetes": "使用 KIND 搭建和管理本地 Kubernetes 集群，测试容器化与云原生应用。",
    "learn-from-code-review": "从历史 PR 审查意见提炼可复用的编码规范、经验和 Skill。",
    "linear": "通过 Linear GraphQL API 查询和管理任务、冲刺及项目进度。",
    "linear-triage": "自动分析新建 Linear 工单，建议标签、优先级、负责人和重复问题。",
    "news-digest": "定时读取公开 RSS/Atom 订阅源，筛选新增内容并生成主题新闻摘要。",
    "notion": "通过 Notion API 创建、搜索和更新页面、数据库及知识库内容。",
    "npm": "处理非交互环境中的 npm 包安装和确认提示，减少自动化安装中断。",
    "openhands-api": "查询 OpenHands 云端与 Agent Server API，用于创建会话和委派执行任务。",
    "openhands-automation": "创建定时任务、Webhook 和事件触发的 OpenHands 自动化工作流。",
    "openhands-enterprise-troubleshooting": "排查自建 OpenHands 企业版的沙箱、登录、证书、模型连接和部署故障。",
    "openhands-sdk": "使用 OpenHands Python SDK 开发智能体、定制工具、管理对话与任务委派。",
    "pdflatex": "在 Linux 环境安装并使用 pdflatex，把 LaTeX 文档编译为 PDF。",
    "plain-english-content": "将英文内容改写得直接、易读，适合面向公众的说明和操作指引。",
    "prd": "根据功能设想和需求生成产品需求文档（PRD），用于产品规划和立项。",
    "qa-changes": "对 PR 或代码改动进行功能性验收，搭建测试环境、执行测试并记录结果。",
    "release-notes": "根据 Git 提交历史整理版本更新说明，分类列出新功能、修复和破坏性变更。",
    "research-brief": "利用 Tavily 搜索和 Notion 定期生成带来源的研究简报及行动建议。",
    "security": "提供安全编码、身份认证、权限控制和敏感数据保护的开发规范。",
    "simplified-technical-english": "按 ASD-STE100 简化技术英语规范写作，使用简短、明确、易理解的句子。",
    "skill-creator": "设计、创建和改进 Skill，指导内容结构、触发描述及渐进式信息组织。",
    "slack-channel-monitor": "监听 Slack 频道、消息与关键词触发器，并联动 OpenHands 自动执行。",
    "slack-standup-digest": "汇总 Slack 上一工作日的进展、阻碍和决策，生成异步站会摘要。",
    "software-factory": "快速建立软件工厂：把工单自动转换为 PR，并接入评审与交付流水线。",
    "spark-version-upgrade": "协助 Apache Spark 跨大版本升级，处理依赖、API 变更及 SQL 兼容问题。",
    "ssh": "建立和管理 SSH 连接、密钥及远程命令与文件传输。",
    "swift-linux": "在 Debian Linux 上安装、配置 Swift，开展服务端 Swift 开发。",
    "technical-writing": "将技术说明写得清晰、流畅、直接，适合设计、评审和工程交流。",
    "theme-factory": "为网页、报告、幻灯片等作品应用预设主题或生成新视觉主题。",
    "ticket-to-code-change": "将 Linear 工单与 GitHub、GitLab 或 Bitbucket 代码仓库连接，自动执行开发。",
    "upstream-fork-sync": "定期同步长期维护的 Fork 与上游仓库，并校验自定义改动和冲突。",
    "use-jev": "使用 Jev 分类器完成类型化选择、评分以及是非概率判断。",
    "uv": "管理基于 uv 的 Python 项目、虚拟环境、依赖和任务执行。",
    "vercel": "管理 Vercel 应用部署、预览环境和部署保护设置。"
  });

  // Export metadata without adding browser-global secrets or modifying Skill API payloads.
  const prefix = "skill-description-";
  const modalPrefix = "skill-modal-description-";
  const selector = '[data-testid^="' + prefix + '"], [data-testid^="' + modalPrefix + '"]';

  function translateOne(el) {
    const testId = el.getAttribute("data-testid") || "";
    const name = testId.startsWith(modalPrefix)
      ? testId.slice(modalPrefix.length)
      : testId.startsWith(prefix)
        ? testId.slice(prefix.length)
        : "";
    if (!Object.prototype.hasOwnProperty.call(zh, name)) return;
    const description = el.querySelector("p") || el;
    const original = description.dataset.ayanEnglishSkillDescription || description.textContent || "";
    if (!description.dataset.ayanEnglishSkillDescription && original !== zh[name]) {
      description.dataset.ayanEnglishSkillDescription = original;
    }
    description.title = description.dataset.ayanEnglishSkillDescription || "";
    if (description.textContent !== zh[name]) {
      // Avoid replacing element nodes: preserve React's existing text node.
      if (description.childNodes.length === 1 && description.firstChild.nodeType === 3) {
        description.firstChild.nodeValue = zh[name];
      } else {
        description.textContent = zh[name];
      }
    }
  }

  let queued = false;
  function update() {
    queued = false;
    const lang = (document.documentElement.lang || navigator.language || "zh").toLowerCase();
    if (!lang.startsWith("zh")) return;
    document.querySelectorAll(selector).forEach(translateOne);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }
  function boot() {
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["lang"]
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
