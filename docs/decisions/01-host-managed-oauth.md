# 01：由 Host 管理 ChatGPT OAuth 与用量读取

- 状态：已采纳
- 适用范围：Host 登录、凭据服务与额度请求

## 背景

插件需要读取与 ChatGPT 订阅绑定的 Codex 用量。目标是让本插件可独立运行，不依赖用户另行安装的 Codex CLI 或订阅插件。

## 决策

Host 通过固定依赖 `@earendil-works/pi-ai@1.4.0` 的 OpenAI Codex provider 执行 OAuth，并在 Host 内请求 `https://chatgpt.com/backend-api/wham/usage`。浏览器登录由 Client 发起；登录 URL 由 Host 提供。若 OAuth 库要求手动回调输入，设置页允许提交浏览器重定向后的完整地址。

当前 Host 路径为 `index.js` → `src/oauth.js`。用量读取只经过 OAuth 与 WHAM 接口，不包含本地 CLI 子进程或回退路径。

## 后果

- 插件运行时不要求本机存在 Codex CLI。
- 运行环境受 pi-ai 的 Node.js 引擎要求约束（当前为 `>=22.19.0`）。
- 登录与额度读取依赖 OpenAI OAuth 行为及非公开稳定接口；其变化可能要求更新依赖或解析逻辑。
- 需要保留浏览器弹窗被拦截时的授权链接和手动回调入口。
