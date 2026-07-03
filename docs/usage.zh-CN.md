# Steam MCP Server 中文使用指南

这份指南从下载仓库开始，说明如何在本机安装、配置 MCP 客户端、完成 Steam 登录授权，并查询已授权用户的愿望单、游戏库和其他只读数据。

## 1. 准备环境

需要先安装：

- Git
- Node.js 20 或更高版本
- npm
- 一个支持 MCP stdio 或 Streamable HTTP 的 MCP 客户端

在 Windows PowerShell 中建议使用 `npm.cmd`，避免 PowerShell 执行策略拦截 `npm.ps1`。

## 2. 从 GitHub 下载代码

使用 SSH：

```powershell
git clone git@github.com:simurayousuke/steam-mcp-server.git
cd steam-mcp-server
```

或使用 HTTPS：

```powershell
git clone https://github.com/simurayousuke/steam-mcp-server.git
cd steam-mcp-server
```

安装依赖并构建：

```powershell
npm.cmd install
npm.cmd run build
```

快速确认本地构建可用：

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run smoke:stdio
```

如果你要使用 Streamable HTTP 传输，再运行：

```powershell
npm.cmd run smoke:http
```

## 3. 选择运行方式

### stdio MCP

stdio 是多数本地 MCP 客户端最直接的方式。构建后入口文件是：

```text
dist/index.js
```

MCP 客户端配置示例：

```json
{
  "mcpServers": {
    "steam": {
      "command": "node",
      "args": ["D:/projects/steam-mcp-server/dist/index.js"],
      "env": {
        "STEAM_DEFAULT_COUNTRY": "US",
        "STEAM_DEFAULT_LANGUAGE": "en",
        "STEAM_AUTH_CALLBACK_HOST": "127.0.0.1",
        "STEAM_AUTH_CALLBACK_PORT": "0"
      }
    }
  }
}
```

把 `D:/projects/steam-mcp-server/dist/index.js` 替换为你本机的实际路径。

### Streamable HTTP MCP

如果客户端支持 Streamable HTTP，可以启动 HTTP 入口：

```powershell
$env:STEAM_HTTP_HOST = "127.0.0.1"
$env:STEAM_HTTP_PORT = "3000"
npm.cmd run start:http
```

默认 MCP endpoint 是：

```text
http://127.0.0.1:3000/mcp
```

## 4. 配置环境变量

仓库里的 `.env.example` 是配置参考文件。当前服务不会自动读取 `.env` 文件；请把变量放进 MCP 客户端的 `env` 配置，或在启动服务前通过 shell 设置。

常用变量：

```text
STEAM_WEB_API_KEY=                 # 查询玩家资料、游戏库、最近游玩等 Web API 数据时需要
STEAM_AUTH_CALLBACK_HOST=127.0.0.1 # Steam OpenID 本地回调监听地址
STEAM_AUTH_CALLBACK_PORT=0         # 0 表示自动选择可用端口
STEAM_AUTH_SESSION_DIR=            # 可选，持久化 OpenID SteamID 会话状态
STEAM_DEFAULT_COUNTRY=US
STEAM_DEFAULT_LANGUAGE=en
```

如果你想在 PowerShell 当前窗口临时设置 Web API key：

```powershell
$env:STEAM_WEB_API_KEY = "你的 Steam Web API key"
```

更推荐在 MCP 客户端配置中设置：

```json
{
  "env": {
    "STEAM_WEB_API_KEY": "你的 Steam Web API key",
    "STEAM_DEFAULT_COUNTRY": "US",
    "STEAM_DEFAULT_LANGUAGE": "en"
  }
}
```

也可以在 MCP 会话启动后调用 `steam_auth_set_web_api_key`，把 Web API key 存入当前服务进程内存：

```json
{
  "webApiKey": "你的 Steam Web API key"
}
```

该 key 不会出现在工具返回值里。

## 5. Steam 登录授权

本服务使用 Steam OpenID 做登录授权。这个流程只证明“当前浏览器登录的 Steam 账号拥有某个 SteamID”，不会接收 Steam 密码，也不会读取浏览器 Cookie。

在 MCP 客户端里调用：

```json
{
  "name": "steam_auth_start",
  "arguments": {}
}
```

返回值里会有：

```json
{
  "data": {
    "state": "...",
    "loginUrl": "https://steamcommunity.com/openid/login?...",
    "returnTo": "http://127.0.0.1:xxxxx/auth/steam/callback?state=...",
    "expiresAt": "..."
  }
}
```

打开 `loginUrl`，在 Steam 页面登录并确认。浏览器会跳回本机 `returnTo` 地址，页面显示认证完成后，再调用：

```json
{
  "name": "steam_auth_status",
  "arguments": {}
}
```

如果返回的 `authenticatedSteamIds` 中出现 17 位 SteamID，说明授权完成。

如果浏览器无法访问本机回调地址，把浏览器最终地址栏里的完整 callback URL 复制出来，手动调用：

```json
{
  "name": "steam_auth_complete",
  "arguments": {
    "callbackUrl": "http://127.0.0.1:xxxxx/auth/steam/callback?..."
  }
}
```

退出本地授权会话：

```json
{
  "name": "steam_auth_logout",
  "arguments": {}
}
```

## 6. 查询已授权用户数据

授权完成后，很多支持可选 `steamId` 的工具可以省略 `steamId`，服务会自动使用已授权 SteamID。

查询已授权用户概览：

```json
{
  "name": "steam_get_authorized_user_overview",
  "arguments": {
    "ownedGamesIncludeAppInfo": true,
    "ownedGamesIncludePlayedFreeGames": true
  }
}
```

默认概览会尝试读取：

- Steam 玩家资料
- 可见游戏库
- 最近游玩
- 官方愿望单
- 愿望单数量
- 关注的游戏
- 关注游戏数量

查询已授权用户游戏库：

```json
{
  "name": "steam_get_owned_games",
  "arguments": {
    "includeAppInfo": true,
    "includePlayedFreeGames": true
  }
}
```

查询已授权用户官方愿望单：

```json
{
  "name": "steam_get_official_wishlist",
  "arguments": {}
}
```

查询已授权用户愿望单数量：

```json
{
  "name": "steam_get_official_wishlist_item_count",
  "arguments": {}
}
```

查询已授权用户关注的游戏：

```json
{
  "name": "steam_get_games_followed",
  "arguments": {}
}
```

查询 Steam 等级、徽章、好友、封禁状态、指定 app 成就和统计时，可以在概览中显式开启对应 section：

```json
{
  "name": "steam_get_authorized_user_overview",
  "arguments": {
    "includeSteamLevel": true,
    "includeBadges": true,
    "includeFriends": true,
    "includePlayerBans": true,
    "achievementAppids": [620],
    "statsAppids": [440],
    "gameLanguage": "en"
  }
}
```

## 7. 通过 MCP Resources 查询

如果 MCP 客户端支持资源读取，也可以直接读取授权用户资源：

```text
steam://me
steam://me/overview
steam://me/owned-games
steam://me/wishlist
steam://me/wishlist/count
steam://me/followed-games
steam://me/followed-games/count
steam://me/recently-played
steam://me/bans
steam://me/steam-level
steam://me/badges
steam://me/friends
steam://me/apps/{appid}/playtime
steam://me/apps/{appid}/achievements
steam://me/apps/{appid}/stats
```

公开 app 和 Steam Web API catalog 资源：

```text
steam://apps/{appid}
steam://apps/{appid}/news
steam://apps/{appid}/schema
steam://apps/{appid}/current-players
steam://apps/{appid}/achievements/global-percentages
steam://api/server-info
steam://api/coverage
steam://api/interfaces
steam://api/interfaces/{interfaceName}/methods
steam://api/interfaces/{interfaceName}/methods/{methodName}/versions/{version}
```

## 8. 数据权限边界

- Steam OpenID 只验证 SteamID 归属，不等于获得所有私密数据权限。
- 玩家资料、游戏库、最近游玩、好友、封禁、成就、统计等 Steam Web API 数据通常需要 `STEAM_WEB_API_KEY`。
- 愿望单和游戏库仍受 Steam 隐私设置限制；Steam 不返回的数据，本服务也不会绕过。
- 服务不会接收 Steam 用户名和密码。
- 服务不会读取浏览器 Cookie。
- Web API key、publisher key、financial key、OAuth token 不会出现在工具返回值中。
- 默认策略是只读；写入、支付、发布状态变更、封禁变更、交易变更等高风险接口不会作为普通工具开放。

## 9. 常见问题

### `steam_auth_start` 返回登录地址，但浏览器回调失败

确认 MCP server 所在机器能监听 `STEAM_AUTH_CALLBACK_HOST` 和 `STEAM_AUTH_CALLBACK_PORT`。本机使用建议保持：

```text
STEAM_AUTH_CALLBACK_HOST=127.0.0.1
STEAM_AUTH_CALLBACK_PORT=0
```

如果客户端运行在远程机器，而浏览器在本机，自动回调可能无法访问。此时复制最终 callback URL，调用 `steam_auth_complete`。

### 游戏库为空或返回权限错误

确认：

- 已配置 `STEAM_WEB_API_KEY`
- 目标 Steam 账号的游戏详情隐私允许 Steam Web API 返回
- 调用工具时省略 `steamId` 前已经完成 `steam_auth_status` 确认

### 愿望单为空

愿望单只返回 Steam 官方接口可见的数据。账号隐私、地区、语言和 Steam 接口策略都会影响结果。

### 想查看当前服务暴露了哪些工具

在 MCP 客户端里列出 tools/resources，或查看：

- `docs/tools.md`
- `docs/api-coverage.md`
- `docs/official-webapi-audit.md`

### 想确认当前代码仍覆盖 Steam 公开 catalog

运行：

```powershell
npm.cmd run audit:steam-catalog
```

如果 Steam 官方 catalog 新增接口，该命令会提示审计文档缺口。
