# 03：使用 WHAM 接口并按窗口时长识别额度

- 状态：已采纳
- 适用范围：ChatGPT Codex 用量响应解析与显示

## 背景

当前 Host 从 ChatGPT Web 后端读取 Codex 用量。WHAM 响应可能只包含部分窗口，也可能调整字段结构；主窗口与次窗口的位置本身不能可靠代表时间范围。

## 决策

由 `src/oauth.js` 请求 `https://chatgpt.com/backend-api/wham/usage`。解析 `rate_limit.primary_window` 和 `secondary_window` 时根据 `limit_window_seconds` 识别：`18000` 秒为 5 小时，`604800` 秒为每周。百分比限制在 0–100 的整数范围；重置时间优先取 `reset_at`，否则由 `reset_after_seconds` 推算。

一项窗口缺失时只将该项规范化为 `null`；两项都缺失或无法识别时返回额度不可用。Client 展示剩余量 `100 - usedPercent`，并展示可解析的重置时间。若存在可识别的每周窗口而 5 小时字段为 `null`，Client 隐藏 5 小时行；其他窗口缺失仍显示不可用。

## 后果

- 不根据 `primary`/`secondary` 的位置猜测窗口时长。
- 不以其他套餐或窗口数据填补缺项，也不在请求失败时显示推算额度。存在可识别的每周窗口但缺少 5 小时窗口时，Client 只隐藏 5 小时行；没有任何可识别窗口时仍显示不可用。
- WHAM 返回 401 时报告需要重新认证；403 可能由地区或访问策略限制引起，按额度不可用处理，网络和刷新失败也不据此判定用户已退出。
- 该接口并非公开稳定 API；修改解析时需针对缺失字段、未知时长、无效百分比及异常重置时间补充测试。
