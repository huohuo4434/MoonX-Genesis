MOOX 2026-07-30 升级包

1. MOOX-upgrade-full-20260730.zip
   完整项目源码，可直接作为新项目目录使用。

2. MOOX-upgrade-patch-20260730.zip
   只包含本次改动文件和说明，适合覆盖到原项目。

3. moox-teacher-knowledge-batch-20260730.json
   老师知识批量导入包。管理员在 /admin/teacher-knowledge/import 上传，先预览，再导入为 DRAFT。

详细说明见项目内：docs/MOOX_UPGRADE_20260730.md

注意：本地升级包未自动部署到 Vercel。当前环境因 npm 镜像缺少 zod@4.4.3，未完成完整 npm ci / build；请在正常依赖环境执行项目说明中的验收命令。
