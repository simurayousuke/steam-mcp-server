# Steam MCP Server 设计方案

## 目标

构建一个以只读为默认策略的 Steam MCP Server，让支持 MCP 的客户端可以查询 Steam 官方 Web API、Steam 商店公开数据、Steam 社区公开数据，并在用户明确授权后查询该用户可见范围内的资料，例如愿望单、游戏库、最近游玩、成就和个人资料。

“覆盖所有已知 Steam API”按两层实现：

1. 官方 Web API 目录层：通过 `ISteamWebAPIUtil/GetSupportedAPIList` 发现 Steam 当前支持的 Web API interface、method、version、参数和权限需求，并提供目录查询工具。
2. 高层工具层：为常用场景提供稳定、类型化、可读性强的 MCP 工具，例如应用详情、玩家资料、游戏库、愿望单、新闻、成就、创意工坊、库存和商店搜索。

默认不暴露会改变账号、交易、库存、支付、发布商后台或商店状态的写操作。即使目录中能发现这些接口，也只作为元数据展示；后续若要支持，必须通过显式 allowlist、额外配置和测试隔离开启。

## 资料来源分层

| 来源 | 用途 | 稳定性 | 授权方式 |
| --- | --- | --- | --- |
| Steam Web API | 官方玩家、应用、新闻、统计、创意工坊、库存等接口 | 高 | 无 key、用户 Web API key、publisher key，依方法而定 |
| Steam Web API Catalog | 发现所有官方 Web API 方法 | 高 | 可无 key；带 key 时可看到受限方法 |
| Steam Store public endpoints | 商店搜索、应用详情、价格、愿望单公开数据 | 中 | 多数无需登录；部分端点非正式文档 |
| Steam Community public endpoints | 个人资料、公开库存、公开组、公开动态等 | 中 | 多数无需登录；受隐私设置影响 |
| Steam OpenID | 证明用户拥有某个 SteamID | 高 | 浏览器跳转登录 |
| Steam OAuth | 受 Valve 分配 client 后的授权流程 | 高但接入受限 | OAuth client、redirect URI、scope |
| Steamworks publisher APIs | 发布商后台、经济、支付、财务、反作弊等敏感接口 | 高但危险 | publisher key、权限组、IP 白名单 |

## 用户授权模型

Steam 官方文档明确提供 Steam OpenID Provider。OpenID 能确认用户的 64 位 SteamID，但它不是通用数据授权协议，不能单独赋予读取私密愿望单或私密游戏库的权限。

因此设计采用四种授权模式：

1. Anonymous：无需登录，只查公开商店、公开社区和无需 key 的接口。
2. Steam OpenID：用户通过 Steam 登录，MCP server 只保存已验证 SteamID、登录时间、nonce，不保存 Steam 密码。该模式用于确认“当前用户是谁”，并可读取该用户公开可见的数据。
3. User Web API Key：用户提供自己的 Steam Web API key，server 本地保存或通过环境变量读取，用来调用需要 key 的玩家相关接口。游戏库接口仍受 Steam 隐私设置和“对该 key 是否可见”的规则限制。
4. Steam OAuth：如果项目获得 Valve 分配的 OAuth client，则支持 OAuth 授权码流程和 token 存储。OAuth 只启用官方文档列明的 scope，不用它假设可读取未公开愿望单。

不做的事情：

- 不接收 Steam 用户名或密码。
- 不自动抓取浏览器 Cookie。
- 不把 Steam session cookie 当作默认授权方式。
- 不用非官方移动端登录流程绕过 Steam Guard。

如果后续必须支持私密愿望单，而官方 OAuth 或 Web API 无法提供该能力，需要单独做风险评审。默认路线是公开愿望单 + OpenID 身份确认 + API key 可见数据，不把 Cookie 抓取作为产品基础。

## API 覆盖策略

### 官方 Web API 目录工具

| Tool | 说明 |
| --- | --- |
| `steam_api_list_interfaces` | 列出官方 Web API interfaces，支持按名称、权限、是否需要 key 过滤 |
| `steam_api_list_methods` | 列出某个 interface 的 methods、版本、HTTP 方法和参数 |
| `steam_api_get_method_schema` | 返回某个 method 的参数 schema、版本和调用说明 |
| `steam_api_call_readonly` | 调用目录中被判定为只读且 allowlist 允许的官方 Web API 方法 |
| `steam_api_refresh_catalog` | 刷新并缓存 `GetSupportedAPIList` 结果 |

`steam_api_call_readonly` 不直接开放全部方法。规则：

- 默认只允许 GET 或官方文档中明确只读的方法。
- 方法名命中 `Init`、`Finalize`、`Cancel`、`Delete`、`Set`、`Update`、`Report`、`Grant`、`Consume`、`Add`、`Remove` 等危险动词时默认拒绝。
- publisher key 方法默认只展示目录，不允许调用。
- 允许用户在配置文件中逐项 allowlist 需要调用的受限只读方法。

### 高层 Steam 工具

第一批高层工具：

| Tool | 说明 | 授权 |
| --- | --- | --- |
| `steam_auth_start` | 生成 Steam OpenID 登录 URL，并准备本地回调或手动回填流程 | 无 |
| `steam_auth_status` | 查看当前 MCP server 已验证的 SteamID | OpenID |
| `steam_auth_logout` | 清除本地授权会话 | OpenID |
| `steam_search_apps` | 按关键词搜索 Steam 应用 | 匿名 |
| `steam_get_app_details` | 查询应用商店详情、价格、平台、分类 | 匿名 |
| `steam_get_app_reviews` | 查询应用评论摘要与分页评论 | 匿名 |
| `steam_get_news_for_app` | 查询游戏新闻 | 匿名或 Web API key |
| `steam_get_store_package` | 查询商店 package 或 bundle 信息 | 匿名 |
| `steam_get_user_wishlist` | 查询用户公开愿望单；私密愿望单仅在官方授权能力确认后启用 | 匿名或已验证用户 |
| `steam_resolve_vanity_url` | 将自定义个人页名解析为 SteamID | Web API key |
| `steam_get_player_summary` | 查询玩家资料摘要 | Web API key |
| `steam_get_owned_games` | 查询用户游戏库 | Web API key，受隐私设置影响 |
| `steam_get_recently_played_games` | 查询最近游玩记录 | Web API key，受隐私设置影响 |
| `steam_get_player_achievements` | 查询指定游戏成就状态 | Web API key，受隐私设置影响 |
| `steam_get_user_stats_for_game` | 查询玩家指定游戏统计 | Web API key，受隐私设置影响 |
| `steam_get_public_inventory` | 查询公开库存 | 匿名，受库存隐私设置影响 |
| `steam_search_workshop_files` | 搜索创意工坊文件 | 匿名或 Web API key |
| `steam_get_workshop_file_details` | 查询创意工坊文件详情 | 匿名或 Web API key |

第二批再覆盖更多官方 interface：`ISteamApps`、`ISteamNews`、`ISteamUser`、`IPlayerService`、`ISteamUserStats`、`ISteamRemoteStorage`、`IPublishedFileService`、`ISteamPublishedItemSearch`、`ISteamEconomy`、`IInventoryService`、`IStoreService`、`ISteamWebAPIUtil` 等。

publisher-only 或可能写入的 interface，例如 MicroTxn、Financials、GameNotifications、CheatReporting、Cloud 写操作等，先只进目录，不进默认工具。

## 传输与授权流程

- MCP 主传输：stdio。
- 授权辅助传输：本地 HTTP callback server，仅用于 OpenID/OAuth 回调，默认监听 `127.0.0.1`。
- `steam_auth_start` 返回登录 URL、state、expiresAt。
- 回调验证通过后，把 SteamID 和授权元数据写入本地会话存储。
- token、API key、publisher key 不输出到 stdout，不进入 MCP 响应，不写普通日志。

## 模块结构

```text
src/
  index.ts        进程入口；启动 MCP server
  auth/           OpenID、OAuth、本地 callback、会话存储
  catalog/        Steam Web API catalog 拉取、缓存、schema 生成
  common/         错误类型、缓存、限流、日志、结果格式化
  config/         环境变量读取、默认值、配置校验
  mcp/            server 创建、transport 连接、工具注册
  steam/          Steam Web API、Store、Community endpoint 客户端
  tools/          MCP tool schema 和 handler
tests/            单元测试与可选集成测试
docs/             设计、开发流程和后续任务拆分
```

## 配置与安全

- `STEAM_WEB_API_KEY`：普通用户 Web API key。
- `STEAM_PUBLISHER_KEY`：publisher key；默认不启用调用，只用于用户显式打开的 allowlist。
- `STEAM_OAUTH_CLIENT_ID` / `STEAM_OAUTH_CLIENT_SECRET` / `STEAM_OAUTH_REDIRECT_URI`：可选 OAuth 配置。
- `STEAM_AUTH_CALLBACK_HOST` 默认 `127.0.0.1`。
- `STEAM_AUTH_CALLBACK_PORT` 默认自动选择空闲端口。
- `STEAM_API_ALLOWLIST_FILE`：允许调用的受限 API 列表。
- `.env` 默认忽略，只提交 `.env.example`。
- stdout 仅用于 MCP 协议输出，运行日志走 stderr。
- 默认启用内存缓存、请求超时、重试预算和本地限流。

## 错误模型

工具 handler 统一把底层错误映射为：

- `validation_error`：输入不合法
- `not_found`：Steam 无对应资源
- `private_or_forbidden`：资料私密或无权限
- `authentication_required`：需要用户登录或 API key
- `authorization_required`：已登录但权限不足
- `rate_limited`：Steam 或本地限流
- `upstream_error`：Steam API 非预期错误
- `configuration_error`：缺少必要环境变量
- `unsafe_method_blocked`：该 API 方法被安全策略阻止

MCP 响应中返回用户可读说明，同时保留稳定错误代码，方便客户端判断。

## 开发顺序

1. 搭建可运行 MCP stdio server，注册健康检查工具。
2. 实现配置读取、错误类型、HTTP 客户端、超时、缓存和限流。
3. 实现官方 Web API catalog 拉取与目录查询工具。
4. 实现 API 安全分类和 `steam_api_call_readonly`。
5. 实现匿名 Store / News / Search / App Details 工具。
6. 实现 OpenID 授权辅助 server、会话状态和登出。
7. 实现用户 Web API key 支持，以及玩家资料、游戏库、最近游玩、成就工具。
8. 实现公开愿望单工具，并明确私密愿望单的官方能力边界。
9. 扩展创意工坊、库存、商店 package/bundle、评论等高层工具。
10. 补 README、MCP 客户端配置示例、测试和 API 覆盖矩阵。

## 提交策略

按照用户要求，每个可审查的小阶段提交一次，并在提交后立刻推送到 `origin main`。
