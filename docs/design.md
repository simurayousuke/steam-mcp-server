# Steam MCP Server 设计方案

## 目标

本项目提供一个只读优先的 Steam MCP Server，让支持 MCP 的客户端可以查询 Steam 官方 Web API、Steam Store 公共数据、Steam Community 公共数据，以及用户明确授权后可见的账号相关数据，例如愿望单、游戏库、最近游玩记录、成就、好友列表和个人资料。

“覆盖所有已知 Steam API”按两层实现：

1. 目录层：通过 `ISteamWebAPIUtil/GetSupportedAPIList` 拉取当前公开 Steam Web API 目录，提供 interface、method、version、HTTP 方法、参数和安全分类查询。
2. 高层工具层：为常见且稳定的只读场景提供类型化 MCP tools 和 resources。

目录层保证新出现的官方 API 至少可以被发现和审计；高层工具层保证常见流程有稳定、可读、可测试的接口。

## 默认安全策略

服务器默认只读。下列接口不会作为高层工具开放：

- 写入、删除、创建、修改、退款、支付、交易、库存变更、封禁、举报、发布状态变更等接口。
- 需要 Steam 用户名、密码、Steam Guard 代码、浏览器 Cookie 或移动端确认绕过的登录流程。
- 会提交遥测、心跳、日志、用户可见通知或审核状态的接口。
- 暴露或操作 game server login token 的接口。

`steam_api_call_readonly` 只允许默认安全的官方目录方法。被保守策略拦截但经人工确认只读的方法，必须通过 `STEAM_API_ALLOWLIST_FILE` 显式 allowlist。

## 授权模型

### Anonymous

无需登录。用于公开 Store、Community、新闻、公开目录、公开愿望单、公开库存、公开 Workshop 数据等。

### Steam OpenID

用于证明用户控制某个 SteamID。服务器只保存本进程内的已验证 SteamID、state 和时间信息，不接收 Steam 密码。

OpenID 不等于数据授权。它不能单独读取私密愿望单或私密游戏库，只能帮助工具在用户未显式传入 SteamID 时使用已验证的 SteamID。

### User Web API Key

用户可以通过环境变量 `STEAM_WEB_API_KEY` 或工具 `steam_auth_set_web_api_key` 提供自己的 Steam Web API key。该 key 只保存在进程内存中，不会出现在工具返回值里。

游戏库、最近游玩、好友、成就、统计、关注游戏、推荐标签、部分 Workshop 查询等接口会使用该 key。Steam 隐私设置仍然生效。

### Steam OAuth

如果项目拥有 Valve 分配的 OAuth client ID，可以通过 `steam_oauth_start` 和 `steam_oauth_complete` 完成 OAuth token 流程。token 只保存在内存中，不会返回给 MCP 客户端。

当前 OAuth 用于官方支持的 token 详情和 `read_cloud` 等 scope。不得假设 OAuth 能读取未公开愿望单或未公开游戏库。

### Publisher / Financial Keys

`STEAM_PUBLISHER_KEY` 用于只读 publisher、经济、库存、Game Notifications、MicroTxn、site license 等接口。

`STEAM_FINANCIAL_KEY` 专用于 Partner Financials。财务 key 不复用 publisher key，也不会返回给工具调用方。

## 数据源分层

| 数据源 | 用途 | 授权 |
| --- | --- | --- |
| Steam Web API Catalog | 发现官方 Web API 目录 | 可匿名；带 key 可看到更多受限方法 |
| Steam Web API | 玩家、应用、新闻、统计、Workshop、经济、库存等 | 匿名、用户 key、OAuth、publisher key 或 financial key，视方法而定 |
| Steam Store public endpoints | 搜索、应用详情、评论、package、公开 Store 愿望单 | 多数匿名 |
| Steam Community public endpoints | 公开库存等 Community 数据 | 匿名；受隐私设置影响 |
| Steam OpenID | 证明当前用户拥有某个 SteamID | 浏览器跳转登录 |
| Steam OAuth | 官方 OAuth scope 数据 | OAuth client 和用户授权 |
| Steamworks publisher APIs | 发布商后台、财务、经济、MicroTxn、反作弊等 | publisher key、financial key 和 Steamworks 权限 |

## 模块结构

```text
src/
  index.ts        进程入口，启动 MCP stdio server
  auth/           OpenID、OAuth、凭据和授权用户聚合逻辑
  catalog/        Steam Web API catalog 拉取、安全分类和 schema
  common/         HTTP、缓存、错误、工具结果格式
  config/         环境变量和 allowlist 读取
  mcp/            server 创建、client 注入、工具和资源注册
  resources/      MCP resource templates
  steam/          Steam Web API、Store、Community 客户端
  tools/          MCP tool schema 和 handler
tests/            单元测试和 MCP in-memory 集成测试
docs/             使用、覆盖、工具和开发文档
```

## MCP Tools

高层工具分组如下：

- 鉴权：OpenID、Web API key、OAuth token 的启动、完成、设置、清除和状态查询。
- 授权用户：`steam_get_authorized_user_overview` 聚合已认证 SteamID 的 profile、游戏库、最近游玩和愿望单数据。
- 官方目录：刷新、列出 interface、列出 method、查看 schema、只读调用和覆盖摘要。
- 玩家数据：profile、游戏库、最近游玩、单游戏时长、Steam 等级、徽章、好友、封禁、成就、统计。
- 愿望单：官方 `IWishlistService` 普通愿望单、分页/排序/过滤愿望单和数量，以及 Store 公开愿望单 JSON。
- Store：搜索、应用详情、评论、package、应用列表、推荐标签、关注游戏。
- Workshop / UGC：查询 published files、详情、collection、vote summary、订阅文件。
- Community：公开库存。
- 经济 / 交易 / Market：资产类型、价格、交易历史、交易报价、市场只读数据。
- Publisher：应用版本、build、depot、server、ownership、leaderboard、Workshop revenue、玩家封禁记录等只读接口。
- 财务、MicroTxn、Inventory、Game Notifications、Site License、Lobby、Game Inventory、反作弊等只读接口。
- 公开基础设施：Steam directory、SteamPipe、SDR、content server、GC version、TF2 world status 等。

完整工具列表见 `docs/tools.md`。

## MCP Resources

资源模板用于让客户端以 URI 方式读取常见对象：

```text
steam://apps/{appid}
steam://apps/{appid}/news
steam://apps/{appid}/schema
steam://api/coverage
steam://api/interfaces
steam://api/interfaces/{interfaceName}/methods
steam://api/interfaces/{interfaceName}/methods/{methodName}/versions/{version}
steam://players/{steamid}
steam://players/{steamid}/owned-games
steam://players/{steamid}/wishlist
steam://players/{steamid}/wishlist/count
steam://players/{steamid}/followed-games
steam://players/{steamid}/followed-games/count
steam://players/{steamid}/apps/{appid}/playtime
steam://players/{steamid}/apps/{appid}/achievements
steam://players/{steamid}/apps/{appid}/stats
steam://players/{steamid}/recently-played
steam://players/{steamid}/bans
steam://players/{steamid}/steam-level
steam://players/{steamid}/badges
steam://players/{steamid}/badges/{badgeid}/progress
steam://players/{steamid}/friends
steam://profiles/{vanity}/wishlist
steam://me
steam://me/overview
steam://me/owned-games
steam://me/wishlist
steam://me/wishlist/count
steam://me/followed-games
steam://me/followed-games/count
steam://me/apps/{appid}/playtime
steam://me/apps/{appid}/achievements
steam://me/apps/{appid}/stats
steam://me/recently-played
steam://me/bans
steam://me/steam-level
steam://me/badges
steam://me/badges/{badgeid}/progress
steam://me/friends
```

`steam://me/*` 资源要求先通过 Steam OpenID 完成身份验证，并自动使用已认证 SteamID。

## 错误模型

底层异常会统一映射为稳定错误码：

- `validation_error`
- `not_found`
- `private_or_forbidden`
- `authentication_required`
- `authorization_required`
- `rate_limited`
- `upstream_error`
- `configuration_error`
- `unsafe_method_blocked`

工具返回用户可读错误说明，同时保留稳定错误码，方便 MCP 客户端做分支处理。

## 隐私和凭据原则

- 不接收 Steam 用户名或密码。
- 不抓取或读取浏览器 Cookie。
- 不把 Steam session cookie 当作授权机制。
- 不把 API key、OAuth token、publisher key 或 financial key 返回给工具调用方。
- 不把敏感 key 写入普通日志。
- `.env` 不提交，只提交 `.env.example`。
- stdout 只用于 MCP 协议输出，日志走 stderr。

## 覆盖审计

接口覆盖分三类维护：

1. 已有高层只读工具。
2. 可通过 `steam_api_call_readonly` 调用的安全目录方法。
3. 已发现但因写入、支付、凭据、安全或隐私原因不开放高层工具的方法。

`npm run audit:steam-catalog` 会实时读取公开 Steam Web API catalog，并检查 `docs/official-webapi-audit.md` 是否覆盖当前接口和规范化后的方法清单。该检查在 CI 中运行。

## 验证门禁

常规改动需要通过：

```bash
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run smoke:stdio
```

涉及 Steam Web API 覆盖、catalog 或 audit 文档时，还需要通过：

```bash
npm.cmd run audit:steam-catalog
```
