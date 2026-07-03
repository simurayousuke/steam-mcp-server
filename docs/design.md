# Steam MCP Server 设计方案

## 目标

构建一个只读的 Steam MCP Server，让支持 MCP 的客户端可以安全查询 Steam 公开信息、Steam Web API 信息和 Steam 商店元数据。

第一阶段不做账号登录、不读取 Cookie、不执行任何会改变 Steam 账号或商店状态的操作。

## 技术选型

- 语言：TypeScript
- 运行时：Node.js 20+
- MCP 传输：先实现 stdio，方便 Codex、Claude Desktop 等本地 MCP 客户端接入
- SDK：以生产可用的 `@modelcontextprotocol/sdk` v1 作为初始基线；官方 TypeScript SDK 仓库当前提示 v2 仍处于 beta，因此等 v2 稳定后再评估迁移
- 校验：使用 Zod 为 MCP 工具输入做结构化校验
- 测试：Vitest，先覆盖工具入参、Steam 客户端解析、错误映射和缓存行为

## 模块结构

```text
src/
  index.ts        进程入口；后续只负责启动 MCP server
  common/         错误类型、缓存、限流、日志、结果格式化
  config/         环境变量读取、默认值、配置校验
  mcp/            server 创建、transport 连接、工具注册
  steam/          Steam Web API、Store、Community endpoint 客户端
  tools/          每个 MCP tool 的 schema 和 handler
tests/            单元测试与可选集成测试
docs/             设计、开发流程和后续任务拆分
```

## 初始工具清单

第一批建议实现这些只读工具：

| Tool | 说明 | 是否需要 `STEAM_API_KEY` |
| --- | --- | --- |
| `steam_search_apps` | 按关键词搜索 Steam 应用 | 否 |
| `steam_get_app_details` | 查询应用商店详情、价格、平台、分类 | 否 |
| `steam_get_news_for_app` | 查询游戏新闻 | 否 |
| `steam_resolve_vanity_url` | 将自定义个人页名解析为 SteamID | 是 |
| `steam_get_player_summary` | 查询玩家公开资料摘要 | 是 |
| `steam_get_owned_games` | 查询玩家公开游戏库 | 是 |
| `steam_get_recently_played_games` | 查询最近游玩记录 | 是 |
| `steam_get_player_achievements` | 查询指定游戏成就状态 | 是 |

## 资源设计

后续可暴露 MCP resources：

- `steam://apps/{appid}`：游戏或应用的规范化摘要
- `steam://players/{steamid}`：玩家公开资料摘要
- `steam://apps/{appid}/news`：游戏新闻摘要

第一阶段优先做 tools，resources 等工具行为稳定后再加。

## 配置与安全

- `STEAM_API_KEY` 只从环境变量读取，不写入日志，不进入返回内容
- `.env` 默认忽略，只提交 `.env.example`
- 所有工具保持只读
- 对私密资料、404、403、限流、Steam 返回空对象等情况做结构化错误
- stdout 仅用于 MCP 协议输出，运行日志走 stderr
- 默认启用简单内存缓存和请求超时，避免重复请求与挂死

## 错误模型

工具 handler 统一把底层错误映射为：

- `validation_error`：输入不合法
- `not_found`：Steam 无对应资源
- `private_or_forbidden`：资料私密或无权限
- `rate_limited`：Steam 或本地限流
- `upstream_error`：Steam API 非预期错误
- `configuration_error`：缺少必要环境变量

MCP 响应中返回用户可读说明，同时保留稳定的错误代码，方便客户端判断。

## 开发顺序

1. 搭建可运行的 MCP stdio server，注册一个内部健康检查工具。
2. 实现配置读取、错误类型、HTTP 客户端、超时和缓存。
3. 先接入不需要 API key 的 Store / News 工具。
4. 再接入需要 `STEAM_API_KEY` 的玩家相关工具。
5. 补测试和 README 使用示例。
6. 视需要加入 HTTP transport、resources 和 prompts。

## 提交策略

按照用户要求，每个可审查的小阶段提交一次，并在提交后立刻推送到 `origin main`。
