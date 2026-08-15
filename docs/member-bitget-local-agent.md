# MOOX Bitget 本地执行器

本地执行器运行在会员自己的电脑或 VPS。MOOX 只提供只读、版本化的计划；Bitget API Key、Secret 和 Passphrase 只从本机环境变量读取，不上传到 MOOX，也不写入本地状态文件。

## 安装

1. 安装 Node.js 20 或更高版本。
2. 从会员 AI 交易页面下载 `moox-bitget-local-agent.mjs` 和环境变量模板。
3. 在会员页面创建只读 MOOX Token。Token 只有 `plans:read` 权限，可随时撤销。
4. 先设置 `MOOX_AGENT_MODE=PAPER`，运行：

```powershell
node .\moox-bitget-local-agent.mjs
```

5. 创建名为 `MOOX_AGENT_STOP` 的文件可立即阻止任何增加敞口的新订单。只读对账和已有持仓的保护动作仍可继续，避免急停反而留下裸仓。删除该文件不会自动恢复任何旧任务；应先核对账户和状态文件。

## 三种模式

- `PAPER`：默认。只在本机状态文件记录假设成交，不连接 Bitget。
- `DRY_RUN`：读取 Bitget账户权限、资产、持仓和合约参数，建立本地日亏损/回撤基线并计算仓位，但不下单。首次 LIVE 前必须至少成功运行一次 DRY_RUN。
- `LIVE`：只有本地同时设置 `MOOX_ENABLE_LIVE=true` 和 `MOOX_LIVE_CONFIRMATION=I_ACCEPT_LOCAL_LIVE_RISK` 才能运行。

## Bitget Key 要求

- 目前只支持 Bitget UTA 的 `USDT-FUTURES`。
- Key 需要 `uta_trade` 和只读 `uta_mgt`；读取真实账户权益、账户模式和逐仓配置缺一不可。
- LIVE Key 必须为读写权限并绑定本机或 VPS 的 IP 白名单。
- Key 一旦含有 `withdraw` 或任何 transfer 类权限，执行器直接拒绝启动。
- 不要把 Key、Secret、Passphrase 发给 MOOX、客服、Discord 或任何网页表单。

## 强制门禁

执行器只接受 FORMAL、提前发布并锁定、仍在有效期、状态 ARMED 且全部条件完成的计划。四周期缠论必须数据完整并与正式方向一致；计划快照超过120秒、版本不完整、账户内已有任何 USDT 合约持仓、账户模式或逐仓配置不符、账户杠杆超限、急停存在时全部失败关闭。签名前还会核对 Bitget 服务器时间，时钟偏差超过5秒则拒绝交易。

LIVE 下单前会再次读取相同的锁定计划，并读取5秒内的 Bitget 标记价；价格偏离计划超过0.5%，或既不在锁定入场区也未越过确认位时拒绝。仓位与保护价按这次执行报价重新计算。下单使用计划版本派生的唯一 `clientOid`。提交前先用该编号查单，超时后也重新查单，避免进程崩溃或网络歧义造成重复开仓。初始订单携带标记价止盈止损，成交确认后再提交并核验全仓 TPSL 防线。任何确认失败都会停止后续动作并要求人工核对，不会猜测成交状态。

## 官方接口

- 签名与请求头：https://www.bitget.com/api-doc/uta/guide
- 账户权限：https://www.bitget.com/api-doc/uta/account/Get-Account-Info
- 账户资产：https://www.bitget.com/api-doc/uta/account/Get-Account
- 账户设置：https://www.bitget.com/api-doc/uta/account/Get-Account-Setting
- 服务器时间：https://www.bitget.com/api-doc/classic/common/public/Get-Server-Time
- 下单：https://www.bitget.com/api-doc/uta/trade/Place-Order
- 查询订单：https://www.bitget.com/api-doc/uta/trade/Get-Order-Details
- 当前持仓：https://www.bitget.com/api-doc/uta/trade/Get-Position
- 止盈止损：https://www.bitget.com/api-doc/uta/strategy/Place-Strategy-Order
