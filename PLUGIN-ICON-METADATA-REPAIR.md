# Codex 额度显示：图标元数据错误修复记录

- 日期：2026-10-27（本记录更正于 2026-10-28）
- 适用范围：DSH Desktop 的 `desktop` profile
- 当前结果：已修正包清单并通过 Plugin Manager 重装；18 项测试通过。主代理已在新进程中调用本机 DSH 的原始 `readPluginMeta`，分别验证实际发布包和 Desktop 已安装包：没有元数据错误，图标解码后与源 SVG 的 1510 字节完全一致。运行中 GUI 尚未视觉复核。

## 故障现象

插件管理器报告：

> `Plugin metadata for @local/dsh-codex-usage: Error: C:\Users\ZIJIAN\.dsh\profiles\desktop\node_modules\@local\dsh-codex-usage\icon.svg: icon must remain inside its package directory`

插件图标 `icon.svg` 位于包根目录。

## 根因（更正此前的判断）

DSH 的 `readPluginMeta` 会尝试解析 `${specifier}/package.json`。当可读到包清单且清单声明了顶层 `icon` 时，DSH 把它当作相对清单目录的文件路径，并检查 realpath 后的图标仍在该目录内。如果清单未导出或没有声明图标，DSH 才回退到 `${specifier}/icon`；该分支要求图标祖先目录中的 `package.json.name` 与插件 specifier 的包名相同。

本插件通过 `@local/dsh-codex-usage` 别名安装，但清单名是 `dsh-codex-usage`。回退分支因此无法找到名字与 alias 相同的包清单并报出上述错误。检查发现 profile 包目录和 `icon.svg` 都不是符号链接；`pnpm file:` 本身不能修复 alias 与清单名不一致的问题。此前把故障归因于 `link:` 符号链接是错误的。

## 修复操作

### 前次 profile 操作

1. 通过 Plugin Manager 移除并从本地工作区重新安装 `@local/dsh-codex-usage`，安装规格使用 `file:`。安装器第一次因 registry 参数为空而拒绝操作，未改动 profile；随后使用 `https://registry.npmjs.org` 完成安装。
2. 当时的安装器要求批准 `@google/genai@2.21.0` 和 `protobufjs@7.6.6` 的构建脚本；此前记录称脚本已获准并完成。这个 `file:` 安装并未修复本次发现的元数据根因。

### 本次源代码和 profile 修复

1. 在 `package.json` 顶层声明 `"icon": "./icon.svg"`，并增加 `"./package.json": "./package.json"` 导出；保留原有 `./icon` 导出。这样 DSH 可读取包清单并使用清单相对图标分支。
2. 新增 `test/package-metadata.test.js`，在临时 profile 中用 Node ESM resolver 复现本地 alias，验证清单和图标导出解析到同一包内文件且字节一致。
3. 使用 Plugin Manager 移除并重装已安装包。工具结果为 `application: "applied"`、插件已启用、`warnings: []`、`approvedBuilds: []`。本次 pnpm 输出显示使用缓存并运行了 `@google/genai@2.21.0` 的 preinstall 与 `protobufjs@7.6.6` 的 postinstall；脚本完成，没有报告错误。未通过文件操作修改 profile，也未触碰其他插件。

## 验证结果和限制

- `npm test`：18 项通过，0 失败。
- `npm pack --dry-run --json` 和实际 `npm pack --json`：`dsh-codex-usage@0.1.0`，12 个文件；包内包含包清单和 1510 字节的 SVG。实际 tarball 为 46237 字节。
- 已安装清单包含 `icon: "./icon.svg"`、`exports["./package.json"]` 和 `exports["./icon"]`。从 Desktop profile 的包别名解析后，包根目录与图标均非符号链接，图标是包内普通 SVG 文件。
- 主代理使用本机 Desktop 的 Electron，以 `ELECTRON_RUN_AS_NODE=1` 和 `--expose-internals` 启动隔离的新进程，直接导入安装内 `@deepseek-ai/dsh-app-boot/lib/index.js` 原始函数。分别对实际 tarball 解包后的本地 alias 布局、真实 Desktop profile 执行 `readPluginMeta('@local/dsh-codex-usage', parentURL)`。两次都断言 `meta.error === undefined`、`meta.icon` 前缀为 `data:image/svg+xml;base64,`，并把 base64 解码结果与对应 SVG 作严格字节比较：1510 字节完全相同。临时验收脚本与产物已清理。
- Plugin Manager 工具列表会省略 `meta`，因此列表本身不能证明图标验收成功；上面的直接函数调用补齐了此前缺失的验证。没有直接调用运行中 GUI 进程的业务 Service，也没有进行 GUI 视觉复核或停止、重启 DSH。

## 后续注意

继续使用 `file:` 或发布包安装都可以，但必须保留清单中的顶层相对 `icon` 和 `./package.json` 导出；单独改变依赖协议不能解决 alias/清单名校验。后续验收需读取真实 `readPluginMeta('@local/dsh-codex-usage', parentURL)` 结果，不能用 `active`、安装成功或路径检查代替。旧 Node/Electron 进程可能仍保留包导出解析缓存；请完整退出 DSH（包括托盘进程）后重新打开，再复核插件详情界面。