# 字字动画官方 Python 插件接入 · G05 阶段记录

日期：2026-10-24。当前阿岩 OS Windows Native 版本 **0.2.3**。G05 尚未完成宿主内执行验收，因此不升级至 V0.2.4。

本轮实际操作：检查《TOOL_PLUGIN_DEV_GUIDE.md》官方工具插件规范，确认 `tool_plugins/app/<plugin_name>` 目录和 `plugin.json` 清单格式。将仓库的 **只读** `ayan_bridge_handoff` 插件（`plugin.json`、`main.py`）复制至用户已有字字动画安装目录的 `user_resources/plugins/tool_plugins/app/ayan_bridge_handoff/`，没有覆盖现有的 `text_to_video_pipeline` 插件，也没有触及任何影视资产或模型。

执行 `C:\AI\ayan-os\scripts\ayan-os\bridge\install-zzdh-readonly-plugin.ps1 -VerifyOnly` 进行文件 SHA-256 一致性核对，并使用字字动画安装包**自带 Python 3.12** 在已安装副本上运行 `self_test`，结果成功：`pluginSelfTest=true`、`generation=false`。

插件的 `status` 操作仅申请官方 `zzdh_connection_status` 工具；`handoff-check` 只检验分镜数据的结构、镜头时长和 ID 唯一性。任何生成操作一律拒绝。无付费 API、无 GPU 任务。

**剩余阻塞：** 还没有在字字动画官方用户界面的“工具插件管理”里观察到加载状态并执行一次真实插件工具调用。因此这里只能确认“安装路径及官方 Python 自检通过”，不能声称已通过官方插件宿主验收。待宿主确认后再评估 G05 的 V0.2.4 版本升级。不要尝试逆向软件私有接口、读取登录令牌或直接操作未知 MCP 服务。

回滚：只删除本轮新创建的独立目录 `user_resources/plugins/tool_plugins/app/ayan_bridge_handoff/` 即可；不修改其他插件。