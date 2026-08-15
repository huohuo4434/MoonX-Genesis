MOOX Bitget 本地Agent（Windows小白版）
=====================================

重要：第一次只用PAPER。PAPER不连接Bitget，也不会产生真实订单。

第1步：安装Node.js
-----------------
打开 https://nodejs.org/ ，下载安装Node.js 20或更高版本。安装时保持默认选项即可。

第2步：粘贴MOOX只读Token
----------------------
1. 登录MOOX会员页，进入“AI交易”。
2. 点击“创建90天Token”。Token只显示一次。
3. 复制Token。
4. 用记事本打开本文件夹的“MOOX配置.txt”。
5. 找到 MOOX_SIGNAL_TOKEN= ，把Token粘贴在等号右边，保存并关闭。

Token不会预装在ZIP里。它只能读取正式计划，不能操作Paper、不能下单、不能读取交易所账户。

第3步：双击“1-启动PAPER.bat”
-------------------------------
看到 PAPER_RECORDED 或 IDEMPOTENT 就表示本地读取成功。PAPER不需要填写任何Bitget密钥。

以后如需做Bitget连接检查
------------------------
1. 先在Bitget创建UTA API Key：需要uta_trade和只读uta_mgt，不得有withdraw或transfer权限；LIVE还必须绑定IP白名单。
2. 只在自己电脑的“MOOX配置.txt”填写BITGET_API_KEY、BITGET_API_SECRET和BITGET_API_PASSPHRASE。
3. 双击“2-检查DRY_RUN.bat”。它只检查，不下单，并建立日亏损/回撤基线。

如何急停
--------
双击“3-停止新增交易.bat”。它会阻止新开仓，但不会阻止已有仓位的只读对账和保护修复。

关于LIVE
--------
本包没有LIVE启动按钮，也不会自动开启LIVE。LIVE必须由用户在命令行手工设置两项精确确认，并且必须先成功完成DRY_RUN。不会使用命令行的用户请保持PAPER或DRY_RUN。

绝对不要做的事
--------------
- 不要把Bitget Key、Secret或Passphrase粘贴到MOOX网站。
- 不要把配置文件发给任何人。
- 不要授予提币withdraw或划转transfer权限。
- 不要删除或修改Agent的风控代码。
