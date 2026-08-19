# MOOX会员只读监控详细说明

## 它能做什么

这个工具只读取会员已经有权限查看的MOOX研究计划，方便会员在Windows电脑上持续看到方向、缠论阶段、现价、确认位和失效位。

**它不能下单，也不需要、不会读取任何Bitget API Key、Secret或Passphrase。**

## 一键部署

1. 打开 MOOX「会员AI」页面，点击 **创建90天只读Token**。
2. 下载 **MOOX会员只读监控-一键部署.zip** 并解压。
3. 用记事本打开 `MOOX配置.txt`。
4. 把刚才复制的Token粘贴到：

   `MOOX_SIGNAL_TOKEN=`

   等号后面。
5. 保存文件。
6. 双击 `1-启动只读监控.cmd`。

## 没有Node.js怎么办

一键包会先检测Node.js。没有安装时会明确提示；安装Node.js 18或更高版本后重新双击即可。

## 默认监控什么

默认监控 BTC、ETH、SOL、HYPE。需要改品种时修改：

`MOOX_SYMBOLS=BTC,ETH,SOL,HYPE`

## 结果保存在哪里

每次刷新会覆盖同目录的 `MOOX_READONLY_STATUS.json`。它只包含读取到的研究计划，不包含密码和交易所密钥。

## 如何停止

直接关闭运行窗口即可。这个小白版不安装Windows服务、不创建计划任务，也不会留下后台下单程序。

## 安全说明

- Token权限固定为只读计划。
- Token可以在MOOX会员页面随时撤销。
- 不要把Token发给别人。
- MOOX研究计划不等于自动交易指令；真实交易需会员自己在交易所确认。
