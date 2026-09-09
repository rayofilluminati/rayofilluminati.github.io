# 青空阅读室

支持六个在线书源、日文竖排阅读与 PDF / EPUB 下载。

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
5. 完成后从部署结果打开网站。仓库路径由 Pages 配置自动确定；阅读页有独立的 `read/index.html`，直接访问和刷新均可用。

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

访问 `http://127.0.0.1:5173`。开发前端会把 `/api` 转发到本地 8787 端口。
也可设置 `$env:VITE_API_ORIGIN='https://实际的Worker地址'` 连接已部署接口，确保允许本地来源。

手动构建和预览仓库子路径：

```powershell
$env:VITE_API_ORIGIN='https://实际的Worker地址'
$env:PAGES_BASE_PATH='/AozoraAnalyzer/'
npm.cmd run build:pages
npm.cmd run preview:pages -- --host 127.0.0.1 --port 5173
```

访问 `http://127.0.0.1:5173/AozoraAnalyzer/`。用户主页仓库或自定义域名通常使用 `/`。
输出目录是 `dist-pages`，包括首页、阅读页、字体和静态资源。

## 验证与维护

```powershell
npm.cmd test
```

在线正文仍依赖各书源可用性和访问限制；部署拆分不会绕过原站限制。
目录连接失败时继续使用已有备用书目，正文读取失败时显示原有错误提示。

参考：[Vite 静态部署](https://vite.dev/guide/static-deploy)、[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。
