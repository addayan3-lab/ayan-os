# AYAN OS · Skills 中文简介展示层 V0.1

2026-10-24 AI01 OpenHands Agent Canvas 1.33.0 验证。

## 覆盖范围
实际运行中的 /api/skills/catalog 返回 69 个 Skills。中文对照表有 69 项，所有名字匹配、无重复或遗漏。
只翻译 Skill 卡片及详情弹窗的简介，保留原英文 Skill 名称和英文内容；鼠标悬停译文可查看英文来源。
不编辑 SKILL.md、API 响应、触发词、工具和启用状态；搜索及其他界面保持原有功能。新增未收录技能默认显示英文。

## 文件
- public/ayan-os/skill-intros.zh-CN.js：69 条中文简介及显示层更新逻辑
- src/root.tsx：源码重建时自动加载显示脚本
- scripts/ayan-os/docker/install-skill-intros-zh.ps1：对当前官方镜像热部署脚本
- scripts/ayan-os/docker/patch-skill-html.cjs：在容器内备份并修改静态 HTML

## 当前运行环境部署
无需重建镜像，不改数据库、LLM 或 Agent：
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\AI\ayan-os\scripts\ayan-os\docker\install-skill-intros-zh.ps1"

打开 http://127.0.0.1:18080/canvas/settings/skills ，按 Ctrl+F5 强制刷新。
页面语言应为中文；浏览器内视觉效果仍需实际查看。

## 本轮检查
- Node.js 脚本语法检查通过。
- 69/69 技能名称对应，没有漏译或重复。
- 网页 /canvas/ 已包含翻译脚本引用。
- /canvas/ayan-os/skill-intros.zh-CN.js HTTP 200。
- /ready 返回 ready，Docker 与 OpenHands Agent Server 未重启。
- 没有修改任何 Skill 正文、启用状态、模型或凭据。
- 实际浏览器视觉效果尚未独立验收。

## 回滚
在容器内以 root 用户，将 /opt/agent-canvas/frontend/index.html.ayan-before-skill-intros
复制回 /opt/agent-canvas/frontend/index.html，并刷新网页即可撤销当前热部署。
下次源码重建需要同步移除 src/root.tsx 的中文脚本引用。
容器重新创建后，热部署可能丢失，重新运行上述安装脚本即可。
