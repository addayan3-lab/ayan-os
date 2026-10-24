# AYAN OS / 阿岩 OS · 山水光影动态品牌 V0.1

## 设计来源
采用用户在 2026-10-24 确定的山水光影品牌方向：深海蓝、香槟金、山形 A、日轮与流动水线。
已选的展示板并非独立矢量源文件，因此这里做可缩放、易维护的同风格矢量重新绘制。
中文正式名称“阿岩 OS”，英文名称“AYAN OS”。

## 使用位置
- public/ayan-os/ayan-mark.svg：动态标识（太阳轻微升降、光晕呼吸、水线流动）；遵循 prefers-reduced-motion。
- public/ayan-os/ayan-brand.js：左侧顶栏徽标、中文品牌名、浏览器标签标题和 favicon 的视觉层；不修改业务 React 数据。
- public/ayan-os/ayan-icon.png：用于快捷方式以外的网页/触控图标。
- public/ayan-os/ayan-os.ico：Windows 桌面快捷方式所需的多尺寸静态图标（16-256px）。
- src/root.tsx：正式源码构建时加载新的标识脚本。

## 部署脚本
1. `C:\AI\ComfyUI-aki-h3\python\python.exe scripts/ayan-os/i18n/generate-ayan-icons.py`（仅调用 Pillow 画图，不启动 ComfyUI 或 GPU）
2. powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ayan-os/i18n/install-ayan-brand.ps1
3. powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ayan-os/i18n/set-ayan-desktop-icon.ps1

热部署脚本只拷贝网页静态品牌资源到已有 OpenHands Agent Canvas 1.33.0 Docker 镜像，保留 index.html.ayan-before-logo-branding。
Windows 脚本仅定位与阿岩/AYAN/18080 对应的桌面快捷方式并替换图标；已有快捷方式先备份至 C:\AI\ayan-os-runtime\branding-shortcut-backup，若未找到则创建新快捷方式。

## 测试与回滚
- 在 http://127.0.0.1:18080/canvas/ 强制刷新，顶栏应显示山水 A 标识、阿岩 OS / AYAN OS。
- 浏览器标签名称应显示“阿岩 OS · AYAN OS”，favicon 应为同一标识。
- 桌面图标由 Windows 缓存管理；必要时在桌面按 F5 刷新显示。
- 动态效果遵循系统的“减少动画”设置；.ico 图标只能静态显示。
- 静态 HTML：恢复容器里的 index.html.ayan-before-logo-branding 并移除源 root.tsx script 标签。
- 快捷方式：使用 branding-shortcut-backup 中对应备份恢复。
- 仅开发验证分支，不合并 main；不变更 Agent 运行、登录、9630 工作台、ComfyUI 或影视资产。
