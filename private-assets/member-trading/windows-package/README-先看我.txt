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

第2.5步：选择试运行方法
----------------------
在“MOOX配置.txt”找到 MOOX_METHOD=。六选一：
LIUYAO / QIMEN / LIUYAO_QIMEN / LIUYAO_CHAN / QIMEN_CHAN / LIUYAO_QIMEN_CHAN
推荐先保持 LIUYAO_CHAN。所选证据不齐全或与正式方向分歧时，Agent会等待，不会换方向下单。

第3步：双击“1-启动PAPER.bat”
-------------------------------
看到 PAPER_RECORDED 或 IDEMPOTENT 就表示本地读取成功。PAPER不需要填写任何Bitget密钥。

以后如需做Bitget连接检查
------------------------
1. 在Bitget网页“个人中心 → API管理 → 创建API”创建UTA API Key。
2. 权限只选择UTA管理读取（uta_mgt）和UTA交易（uta_trade）；绝对不要选择withdraw、transfer、提币或划转。
3. LIVE必须绑定运行这台电脑/VPS的固定IPv4白名单；没有固定IP请保持PAPER。
4. 创建时自己设置Passphrase，创建完成后保存API Key和Secret Key；Secret通常只显示一次。
5. 只在自己电脑的“MOOX配置.txt”填写BITGET_API_KEY、BITGET_API_SECRET和BITGET_API_PASSPHRASE。
6. 双击“2-检查DRY_RUN.bat”。它只检查，不下单，并建立日亏损/回撤基线。

如何急停
--------
双击“3-停止新增交易.bat”。它会阻止新开仓，但不会阻止已有仓位的只读对账和保护修复。

关于LIVE
--------
本包没有LIVE启动按钮，也不会自动开启LIVE。LIVE必须由用户在命令行手工设置两项精确确认，并且必须先成功完成DRY_RUN。不会使用命令行的用户请保持PAPER或DRY_RUN。

试运行风险提示
------------
六种方法都还在试运行。不要使用大仓位，不要借贷，不要使用高杠杆。默认单笔风险不超过0.5%、单个仓位不超过5%、总仓位不超过20%、杠杆不超过2倍；新手应更低。

绝对不要做的事
--------------
- 不要把Bitget Key、Secret或Passphrase粘贴到MOOX网站。
- 不要把配置文件发给任何人。
- 不要授予提币withdraw或划转transfer权限。
- 不要删除或修改Agent的风控代码。
