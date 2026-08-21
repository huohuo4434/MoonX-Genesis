# MOOX 会员本地 Bitget Agent

此工具在会员自己的电脑或 VPS 上运行。Windows 新手请直接下载 `MOOX-Bitget-Windows.zip`，解压后先看 `README-先看我.txt`。MOOX 只提供只读的正式计划；Bitget API Key、Secret、Passphrase 不上传 MOOX，也不写入 Agent 状态文件。

## 1. 准备

- 安装 Node.js 20 或更高版本。
- Windows新手下载一键ZIP；高级用户才需要单独下载 `moox-bitget-local-agent.mjs` 和环境变量模板。
- 在会员页创建仅有 `plans:read` 权限的 MOOX Token；它只显示一次。
- Bitget Key 只给 UTA 交易与必要只读权限，不给提币或划转权限。固定公网 IP 用户推荐绑定白名单；动态 IP 用户可关闭强制白名单，但风险更高。
- 在本地配置选择六种试运行筛选方法之一；所选证据缺失或分歧时保持等待。

## 六种试运行方法

`MOOX_METHOD` 可选：`LIUYAO`、`QIMEN`、`LIUYAO_QIMEN`、`LIUYAO_CHAN`、`QIMEN_CHAN`、`LIUYAO_QIMEN_CHAN`。方法选择只决定哪些前置研究证据必须齐全；所有LIVE订单仍必须通过统一行情新鲜度、入场几何、止损、仓位、日亏损、回撤和交易所保护单闸门。推荐从 `LIUYAO_CHAN` 的 PAPER 开始。

## 2. 首次运行：PAPER

Windows新手只需把Token粘贴到同目录 `MOOX配置.txt`，然后双击 `1-启动PAPER.bat`。Agent会原生读取配置，不需要dotenv。高级用户PowerShell示例：

```powershell
$env:MOOX_SIGNAL_TOKEN="mxm_这里换成只读Token"
$env:MOOX_AGENT_MODE="PAPER"
node .\moox-bitget-local-agent.mjs
```

PAPER 不需要 Bitget 密钥，也不会请求交易所私有接口。

## 3. 连接检查：DRY_RUN

在Bitget网页进入“个人中心 → API管理 → 创建API”。创建UTA API：只允许 `uta_mgt` 读取和 `uta_trade` 交易，不允许 withdraw、transfer、提币或划转。保存创建时自己设置的Passphrase、API Key和只显示一次的Secret Key。

IP 白名单二选一：

- `MOOX_REQUIRE_IP_WHITELIST=true`（默认、推荐）：适合固定公网 IPv4 或固定出口 IP；LIVE 检测不到白名单就拒绝开仓。
- `MOOX_REQUIRE_IP_WHITELIST=false`：适合家庭宽带、移动网络、动态 IP 或没有固定公网 IP 的会员；可以运行 LIVE，但 API Key 泄露后的风险更高。务必关闭提现/划转权限、使用独立 API Key、定期轮换，电脑异常时立即在 Bitget 删除 Key。

把 Bitget 三项凭证只设置到本机环境变量，然后：

```powershell
$env:BITGET_API_KEY="本机BitgetKey"
$env:BITGET_API_SECRET="本机BitgetSecret"
$env:BITGET_API_PASSPHRASE="本机BitgetPassphrase"
$env:MOOX_AGENT_MODE="DRY_RUN"
node .\moox-bitget-local-agent.mjs
```

DRY_RUN 会核对权限、所选 IP 白名单策略、Bitget服务器时间、UTA账户模式、双向持仓、逐仓配置、全账户持仓和合约参数，并建立本地日亏损/回撤基线，但不提交订单。首次 LIVE 前必须至少成功运行一次 DRY_RUN；v1只要发现账户已有任何 USDT 合约持仓就拒绝新增敞口。

## 4. LIVE 必须本地双重确认

只有完成 PAPER 和 DRY_RUN 后再考虑。LIVE 需要同时设置：

```powershell
$env:MOOX_AGENT_MODE="LIVE"
$env:MOOX_ENABLE_LIVE="true"
$env:MOOX_LIVE_CONFIRMATION="I_ACCEPT_LOCAL_LIVE_RISK"
node .\moox-bitget-local-agent.mjs
```

Agent 只接受 FORMAL、已发布、已锁定、仍有效、条件全部满足、缠论周期完整且快照不超过 120 秒的 READY 计划。任何冲突、缺失或接口异常都停止执行。

目前六种方法仍处于试运行阶段。不要使用大仓位、借贷资金或高杠杆；默认上限也不是收益保证。

## 5. 急停与恢复

在 Agent 同目录创建 `MOOX_AGENT_STOP` 文件即可阻止新增敞口；只读对账和已有持仓保护仍可运行，避免急停制造裸仓。删除该文件才允许再次开仓。网络超时、订单未确认、持仓不一致或保护单未确认时，Agent 不会猜测或重复下单，必须先人工核对。

本地状态文件 `.moox-agent-state.json` 只保存计划版本、clientOid 和订单确认信息，不保存任何密钥。相同计划版本重试会先向 Bitget 对账，不会直接再次开仓。

官方接口依据：Bitget UTA API 的签名指南、账户信息、当前持仓、下单、订单详情及 TPSL 策略单文档。
