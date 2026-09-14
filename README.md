# 青空阅读室

支持六个在线书源、日文竖排阅读与 PDF / EPUB 下载。

## 站点结构

- `/`：阅读工具入口。
- `/aozora/`：原青空阅读室；阅读页为 `/aozora/read/`。
- `/ttsu/`：来自 `rayofilluminati/ebook-reader` 的完整电子书阅读器。
- 原 `/read/` 链接保留查询参数和片段，跳转至 `/aozora/read/`。

主仓库的 Pages 工作流分别构建两个应用，再组合为 `dist-site` 发布。
青空源码保持现有组织方式；TTsu 在构建时检出到 `.ttsu-source`，版本固定于工作流中的提交 SHA。
`scripts/prepare-ttsu.mjs` 负责子路径、静态路由、字体和离线缓存适配；上游代码不匹配时构建会失败，避免静默漏掉适配。
更新 TTsu 时修改工作流的 SHA，并验证构建；电子书仓库的独立 Cloudflare 工作流不会在这里运行。
PR 会构建并检查两个应用，合并到 `main` 后才部署。

TTsu 的可选云盘登录使用本仓库 Actions 变量 `TTSU_GDRIVE_CLIENT_ID` 和 `TTSU_ONEDRIVE_CLIENT_ID`。
OAuth 提供方需要允许新回调地址 `https://rayofilluminati.github.io/ttsu/auth/`。
原域名下的浏览器书库不会跨域自动转移，请先在原阅读器导出，再在新地址导入。

本地完整构建（Node.js 24、npm、pnpm 11.19.0）：

```sh
npm ci
git clone https://github.com/rayofilluminati/ebook-reader.git .ttsu-source
git -C .ttsu-source checkout 49cee3cb9389a8e9b7ac435251fba0e43099f5e6
node scripts/prepare-ttsu.mjs
pnpm --dir .ttsu-source install --frozen-lockfile
pnpm --dir .ttsu-source/apps/web exec svelte-kit sync
pnpm --dir .ttsu-source/apps/web build
# 设置 VITE_API_ORIGIN 为下述 Worker 地址后执行：
npm run build:pages
node scripts/assemble-pages.mjs
node scripts/check-pages.mjs
```

适配脚本只对干净的 TTsu 检出执行一次；重复构建时无需再次执行。

## 发布到 GitHub Pages

前端静态文件部署到 GitHub Pages，在线书源接口单独运行在 Cloudflare Worker。
Worker 复用 `app/api` 中现有的抓取与解析逻辑；GitHub Pages 自身不运行这些接口。
现有 Vinext / Sites 启动和构建命令继续可用。

### 1. 安装依赖

安装 Node.js 22.13.0 或更高版本（建议 24），在项目目录执行：

```powershell
npm.cmd ci
```

### 2. 部署书源 API

注册或登录 Cloudflare 账号。在 `wrangler.api.jsonc` 中将 `ALLOWED_ORIGINS` 改为你的前端来源，例如：

```json
"ALLOWED_ORIGINS": "https://yourname.github.io,http://localhost:5173,http://127.0.0.1:5173"
```

这里填写协议和域名，不带 `/仓库名/`、结尾斜线。多个来源用逗号分隔；自定义域名也需加入。
这是浏览器跨域限制，不是身份认证或访问配额。

```powershell
npx.cmd wrangler login
npm.cmd run deploy:api
```

记录命令输出中的实际 HTTPS Worker 地址，例如 `https://aozora-reader-api.your-subdomain.workers.dev`。
访问该地址的 `/api/book`，不带参数时应返回提示输入链接的 JSON（HTTP 400），可用于确认接口已启动。
后续修改接口代码后，重新执行 `npm.cmd run deploy:api`；Pages 工作流仅发布前端。

### 3. 配置 GitHub

1. 将完整项目推送到 GitHub 仓库（包含 `.github/workflows/pages.yml`）。
2. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Settings → Secrets and variables → Actions → Variables** 新建仓库变量 `VITE_API_ORIGIN`，填入上一步的 Worker HTTPS 地址，不带路径或结尾斜线。这是公开的 API 地址，不要填 API Token。
4. 推送到 `main`，或在 Actions 中手动运行 **Deploy GitHub Pages**。若默认分支不是 `main`，修改工作流的分支设置。
5. 完成后从部署结果打开网站。青空位于 `/aozora/`，TTsu 位于 `/ttsu/`；两者均生成独立阅读路由，直接访问和刷新均可用。

没有配置 API 地址时构建会明确失败，避免发布无法获取在线书籍的前端。
更改仓库变量后需重新运行工作流。无需把 Cloudflare Token 交给 GitHub。

### 4. 本地验证拆分版本

打开两个 PowerShell 窗口，在项目目录分别运行：

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev:pages -- --host 127.0.0.1 --port 5173
```

访问 `http://127.0.0.1:5173/aozora/`。开发前端会把 `/api` 转发到本地 8787 端口。
也可设置 `$env:VITE_API_ORIGIN='https://实际的Worker地址'` 连接已部署接口，确保允许本地来源。

手动构建和预览仓库子路径：

```powershell
$env:VITE_API_ORIGIN='https://实际的Worker地址'
$env:PAGES_BASE_PATH='/aozora/'
npm.cmd run build:pages
npm.cmd run preview:pages -- --host 127.0.0.1 --port 5173
```

访问 `http://127.0.0.1:5173/aozora/`。
青空单独构建输出目录为 `dist-pages`；完整站点发布目录为 `dist-site`。

## 验证与维护

```powershell
npm.cmd test
```

在线正文仍依赖各书源可用性和访问限制；部署拆分不会绕过原站限制。
目录连接失败时继续使用已有备用书目，正文读取失败时显示原有错误提示。

参考：[Vite 静态部署](https://vite.dev/guide/static-deploy)、[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。
