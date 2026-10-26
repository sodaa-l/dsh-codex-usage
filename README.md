# Codex 额度显示（dsh-codex-usage）

这是一个独立的 DSH 侧栏插件，显示 ChatGPT 账户的 Codex 5 小时和每周剩余额度。卡片背景透明，进度条使用 DSH 主题色，文字采用 DSH 正文字体和适合侧栏的字号，并显示剩余比例和重置时间。

插件无需 Codex CLI 或 dsh-codex-subscription。在 DSH 设置页打开“Codex 额度显示”，点击“登录”，在系统浏览器中完成 OpenAI 授权，插件会通过本机回调完成登录。如果浏览器没有自动打开，可点击设置页中的登录链接；如果本机回调失败，可展开输入框并粘贴浏览器跳转后的完整地址。登录凭据保存在 DSH 凭据服务中本插件独立的 `dsh-codex-usage/openai-codex` 记录；令牌刷新由凭据服务的串行写入保护。侧栏不接收访问令牌。可在设置页取消登录、退出登录、手动刷新或选择自动刷新周期。

刷新周期可选择 1、5、15 或 30 分钟，默认 1 分钟；设置保存在当前浏览器中，不在不同浏览器间同步。只有侧栏挂载时才自动刷新。

Host 使用 `@earendil-works/pi-ai` 的 OpenAI Codex OAuth 提供器登录和刷新，向 `https://chatgpt.com/backend-api/wham/usage` 请求用量。该接口并非公开稳定 API，未来可能变更；部分套餐或组织账户可能不提供两个窗口。失败时显示不可用，不伪造额度。

默认成功缓存 60 秒、失败缓存最多 10 秒；可在 bundle 配置设置 `timeoutMs`（1–60 秒）和 `cacheMs`（0–10 分钟）。插件需要 Node.js 22.19 或更新版本。

客户端使用 `sidebar.footer.action`，通过局部 CSS 让卡片占满一行；如果 DSH 调整侧栏内部结构，可能需要相应更新 CSS。

开发验证：安装项目依赖后运行 `npm test`。项目源码本身不会自动安装到 DSH；安装插件和实际账户登录需要单独进行。

侧栏使用用户提供的 OpenAI 标志包中的 OpenAI Blossom 矢量图形，并以当前文字颜色绘制。OpenAI 和 Codex 名称及标志属于各自权利人。
