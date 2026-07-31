# MoonX Trade Signal API v1

## 定位

MoonX负责生成与锁定交易决策；外部执行端负责模拟盘或券商下单。第一版默认只允许模拟盘，避免错误信号被直接放大为真钱损失。

## 读取信号

```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://mooxintel.com/api/v1/signals?status=ARMED&symbol=MU"
```

也可使用请求头：

```text
X-MoonX-API-Key: YOUR_KEY
```

## 返回结构

```json
{
  "schema": "moonx.trade.signal.list.v1",
  "generatedAt": "2026-08-01T00:00:00.000Z",
  "count": 1,
  "data": [
    {
      "schema": "moonx.trade.signal.v1",
      "signal": {
        "id": "sig_xxx",
        "asset": { "symbol": "MU", "name": "美光科技", "market": "US_STOCK" },
        "direction": "LONG",
        "status": "ARMED",
        "confidence": { "stars": 5, "score": 86 },
        "entry": { "mode": "BREAKOUT", "trigger": 135 },
        "risk": { "stopLoss": 125, "confirmationTimeframe": "4H" },
        "targets": [145, 160],
        "execution": { "quantity": 10, "paperOnly": true }
      }
    }
  ]
}
```

## 执行回报

具有 `write` 权限的API密钥可以写入模拟成交、取消、止损和止盈事件：

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signalId":"sig_xxx",
    "eventType":"PAPER_FILLED",
    "provider":"MOSS",
    "externalOrderId":"order-001",
    "price":135.2,
    "quantity":10
  }' \
  https://mooxintel.com/api/v1/signal-events
```

## 模拟执行连接

管理员信号页支持三种模拟端：

1. 通用Webhook：`MOONX_EXECUTION_WEBHOOK_URL`、`MOONX_EXECUTION_WEBHOOK_SECRET`
2. Alpaca Paper：`ALPACA_PAPER_API_KEY`、`ALPACA_PAPER_SECRET_KEY`
3. OKX Demo：`OKX_DEMO_API_KEY`、`OKX_DEMO_SECRET_KEY`、`OKX_DEMO_PASSPHRASE`

通用Webhook会携带：

```text
X-MoonX-Mode: paper
X-MoonX-Signature: HMAC-SHA256(body, secret)
```

## 安全限制

- 当前代码没有真钱执行入口。
- 所有自动执行函数都要求信号 `paperOnly=true`。
- 交易信号发布后应通过新版本修改，不能覆盖历史。
- 一至五星按真实结算结果分别统计；不足10条显示“样本积累中”。
