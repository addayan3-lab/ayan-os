/**
 * AYAN OS · public catalog descriptions in Simplified Chinese (display only).
 * Never alters React props, server catalogs, install settings or Agent tool data.
 * Retains English in title attribute for comparison and new, unsupported entries fall back unchanged.
 */
(() => {
  "use strict";
  const prefix = "/canvas/ayan-os/catalog-intros.zh-CN.json";
  const ui = Object.freeze({
    "Automate": "自动化",
    "Dashboard": "概览",
    "Templates": "模板",
    "Browse proven automations and beta ideas, then launch one into a conversation to tailor it to your work.": "浏览成熟的自动化方案和测试版模板，选择后进入对话，按自己的工作需求调整。",
    "Health, activity, and run performance across your automations.": "查看自动化任务的健康状态、执行动态和运行表现。",
    "Automations": "自动化任务",
    "Needs attention": "待处理",
    "Total runs": "累计运行",
    "Average duration": "平均耗时",
    "0 active": "0 项已启用",
    "No latest-run failures": "最近运行无失败",
    "Across loaded automations": "已加载任务统计",
    "Recent completed runs": "最近完成的运行",
    "Custom automation": "自定义自动化",
    "GitHub code review": "GitHub 代码审查",
    "GitHub issue to PR": "GitHub 工单转 PR",
    "GitHub repository monitor": "GitHub 仓库监控",
    "Slack channel monitor": "Slack 频道监控",
    "AGENTS.md Maintainer": "AGENTS.md 维护",
    "Daily news digest": "每日资讯摘要",
    "Slack standup digest": "Slack 进展日报",
    "Research brief writer": "专题研究简报",
    "GitLab issue to MR": "GitLab 工单转 MR",
    "Linear issue triage assistant": "Linear 工单分诊",
    "Linear issue to GitHub PR": "Linear 工单转 GitHub PR",
    "Linear issue to GitLab MR": "Linear 工单转 GitLab MR",
    "Linear issue to Bitbucket PR": "Linear 工单转 Bitbucket PR",
    "Jira issue to GitHub PR": "Jira 工单转 GitHub PR",
    "Jira issue to GitLab MR": "Jira 工单转 GitLab MR",
    "Jira issue to Bitbucket PR": "Jira 工单转 Bitbucket PR",
    "QA changes": "代码变更验收",
    "GitHub delivery watchdog": "GitHub 交付检查",
    "GitHub issue triage": "GitHub 工单分诊",
    "Upstream fork sync": "上游仓库同步",
    "Incident retrospective drafter": "事故复盘草稿",
    "GitHub stale CI cleanup": "GitHub 失败 CI 清理",
    "Software development": "软件开发",
    "Developer tools": "开发工具",
    "Team communication": "团队协作",
    "Project management": "项目管理",
    "Documentation": "文档管理",
    "Research": "研究",
    "Code review": "代码审查",
    "Operations": "运营管理",
    "Custom": "自定义"
  });
  let catalog = null;
  let queued = false;

  function setText(el, text) {
    if (!el || typeof text !== "string" || !text) return;
    if (el.textContent?.trim() === text) return;
    const old = el.dataset.ayanEnglishIntro || (el.textContent || "").trim();
    if (!el.dataset.ayanEnglishIntro && old !== text) el.dataset.ayanEnglishIntro = old;
    if (el.dataset.ayanEnglishIntro) el.title = el.dataset.ayanEnglishIntro;
    // Preserve the original DOM text node where possible for compatibility with React.
    if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) {
      el.firstChild.nodeValue = text;
    } else {
      el.textContent = text;
    }
  }

  function cardEntries(section, attrPrefix, map, selector) {
    document.querySelectorAll('['+section+'^="'+attrPrefix+'"]').forEach(card => {
      const id = card.getAttribute(section).slice(attrPrefix.length);
      const translated = map?.[id];
      if (translated) setText(card.querySelector(selector), translated);
    });
  }

  function updateCatalog() {
    if (!catalog) return;
    cardEntries("data-testid", "mcp-marketplace-card-", catalog.mcp,
      "p.line-clamp-3");
    cardEntries("data-testid", "plugin-card-", catalog.plugins,
      'p[data-testid^="plugin-description-"]');
    cardEntries("data-testid", "recommended-automation-card-", catalog.automation,
      "p.line-clamp-2.text-tertiary-light");
    cardEntries("data-testid", "recommended-automation-rail-card-", catalog.automation,
      "p.line-clamp-2.text-tertiary-light");

    const mcpModal = document.querySelector('[data-testid="mcp-install-modal"][data-marketplace-id]');
    if (mcpModal) {
      const desc = catalog.mcp?.[mcpModal.dataset.marketplaceId];
      if (desc) setText(mcpModal.querySelector("h2 + p"), desc);
    }
    const pluginModal = document.querySelector('[data-testid="plugin-detail-modal"][data-plugin-name]');
    if (pluginModal) {
      const desc = catalog.plugins?.[pluginModal.dataset.pluginName];
      if (desc) {
        const primary = pluginModal.querySelector("header + div > p.text-tertiary-light");
        if (primary) setText(primary, desc);
      }
    }
  }

  function updateAutomationUI() {
    if (!location.pathname.startsWith("/canvas/automations")) return;
    const main = document.body;
    if (!main) return;
    // Only exact, reviewed strings on the Automate route (including sidebar). No value/credential/code edits.
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.parentElement?.closest("textarea, input, code, pre, script, style, [contenteditable=true]")) continue;
      textNodes.push(el);
    }
    for (const n of textNodes) {
      const raw = n.nodeValue || "";
      const trimmed = raw.trim();
      if (!Object.prototype.hasOwnProperty.call(ui, trimmed)) continue;
      const replacement = ui[trimmed];
      const leading = raw.match(/^\s*/)?.[0] ?? "";
      const trailing = raw.match(/\s*$/)?.[0] ?? "";
      const parent = n.parentElement;
      if (parent && !parent.title) parent.title = trimmed;
      n.nodeValue = leading + replacement + trailing;
    }
  }

  function repaint() {
    queued = false;
    if (!/^(zh)(-|$)/i.test(document.documentElement.lang || navigator.language || "")) return;
    updateCatalog();
    updateAutomationUI();
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(repaint);
  }
  async function start() {
    try {
      const response = await fetch(prefix, {cache:"no-store"});
      if (!response.ok) throw Error("Catalog translation data unavailable");
      const data = await response.json();
      if (!data || !data.mcp || !data.plugins || !data.automation) return;
      catalog = data;
      schedule();
      new MutationObserver(schedule).observe(document.body, {
        childList:true, subtree:true, characterData:true
      });
    } catch (e) {
      console.warn("AYAN OS Chinese catalog introductions not loaded:", e.message);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();
