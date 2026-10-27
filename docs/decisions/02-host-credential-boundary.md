# 02：将 OAuth 凭据限制在 Host 边界内

- 状态：已采纳
- 适用范围：凭据持久化、认证接口和账户资料

## 背景

OAuth access token 和 refresh token 可用于代表用户访问账户。侧栏只需要额度与少量账户信息，不需要凭据本身。

## 决策

凭据保存在 DSH credentials 服务的独立记录 `dsh-codex-usage/openai-codex`。`src/oauth.js` 将该服务适配给 pi-ai 的 `openai-codex` provider，并通过 `modifyRecord()` 更新凭据，以复用凭据服务提供的串行修改语义。

Client 只调用同源 `/api/dsh-codex-usage` 路由。认证状态接口只返回展示所需的 `email`、`plan`、`accountId` 白名单字段；额度接口返回经规范化的窗口字段。access token、refresh token 和完整上游响应不进入 Client DTO。认证响应使用 `cache-control: no-store`。

## 后果

- 登录、刷新和退出都必须通过 Host 路由执行；Client 不应直接调用上游额度接口或写浏览器凭据存储。
- 新增账户信息字段时，必须在 Host 端显式挑选，并评估是否必要。
- `account()` 从已存 access token 的声明中提取有限资料供 UI 展示；这些资料不是对 JWT 签名的独立验证结果，也不应作为授权判断依据。
