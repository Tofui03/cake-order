# 妈妈的蛋糕

客人用手机点蛋糕，订单发到 WhatsApp。妈妈打开后台，按取货日期看每天要做几份。

## 客人怎么点

1. 打开网页
2. 点蛋糕右边的加号
3. 填名字、电话、取货日期（最早明天）
4. 选自取或送货
5. 页面上有收款码时，先转账，再选收据照片
6. 按绿色按钮「用 WhatsApp 下单」

手机会打开 WhatsApp。消息里已经写好蛋糕、合计、名字、电话、日期，最后是订单号，例如 `订单 #A1B2`。上传了收据时，再加一行「已付款，收据已上传」。

## 妈妈怎么看

1. 打开后台地址并存成书签：https://tofui03.github.io/cake-order/#/admin （点单页面上没有入口）
2. 用邮箱和密码登录
3. 每一天最上面是「要做」
4. 新订单是「待确认」。对过 WhatsApp 之后点「确认」，数量才算进「要做」
5. 做好交出去，点「已交货」。状态变成「已完成」，不再算进「要做」
6. 不接的单点「取消」，不显示，也不算数量

改店名、WhatsApp 号码、蛋糕价格和照片：后台里点「设置」。收款码也在设置里上传，标题是「DuitNow QR」。订单上的「收据」打开客人的转账截图。

「要做」只加状态是「已确认」的数量。同一种蛋糕会加在一起。待确认、已完成、取消都不算。

## 第一次开通

网站会连到这个 Supabase 项目，不用再去 GitHub 里填网址和密钥：

https://qagblyaizbnaltbvzatq.supabase.co

### 1. 建立表和示例蛋糕

1. 打开上面的项目
2. 左边点 **SQL Editor**，再点 **New query**
3. 打开本仓库的 `supabase/migrations/20261115020000_init.sql`
4. 全选复制，贴进去，点 **Run**

这个文件可以重复执行。已经改过的店名、号码和价格不会被盖掉。

它会建好三张表、蛋糕照片的存储桶，并放入这些蛋糕：

| 蛋糕 | 价格 |
| --- | --- |
| 巧克力蛋糕 6寸 | RM 68 |
| 芝士蛋糕 6寸 | RM 75 |
| 班兰戚风 | RM 45 |
| 草莓鲜奶油 8寸 | RM 98 |
| 杯子蛋糕（6个） | RM 30 |

WhatsApp 先写成 `60123456789`。登录后台的「设置」，改成妈妈的号码：国家码开头，只留数字，不要加 `+` 或空格。马来西亚的例子是 `60123456789`。

再运行 `supabase/migrations/20261115030000_duitnow_receipts.sql`，同样整段贴进 SQL Editor。然后在「设置」里上传 DuitNow QR。没上传时，客人不用收据也能下单。

### 2. 给妈妈做一个登录账号

1. 左边 **Authentication** → **Users**
2. **Add user** → **Create new user**
3. 填妈妈的邮箱和密码
4. 勾上 **Auto Confirm User**，这样不用再去邮箱里点确认
5. **Create user**

把邮箱和密码告诉妈妈。后台只用这两个登录。

### 3. 打开 GitHub Pages

1. 本仓库 **Settings** → **Pages**
2. **Build and deployment** 的 **Source** 选 **GitHub Actions**
3. 代码推到 `main` 之后，Actions 会自动构建并发布

页面：https://tofui03.github.io/cake-order/

后台：https://tofui03.github.io/cake-order/#/admin

## 可选：换一个 Supabase 项目

不换就不用做这步。

仓库 **Settings** → **Secrets and variables** → **Actions** → **Variables**，新建：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`（填 publishable 公钥，一串 `sb_publishable_` 开头的）

填了就会覆盖工作流里写好的默认项目。

这两个值会写进网页，任何人都能看到。只填公钥。不要把 `sb_secret_` 或 service role 放进变量，也不要写进代码。

## 在自己电脑上看

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173/cake-order/

没有配置环境变量时，网页用浏览器里的演示数据，不连接 Supabase。演示后台可以用任意邮箱和任意密码登录。里面已经有确认过的订单，方便看「要做」。

要在本地连真的数据库，把 `.env.example` 复制成 `.env.local`，填上项目 URL 和 publishable 公钥。公钥在 Supabase 项目 **Project Settings** → **API Keys**。

```bash
npm test
npm run typecheck
npm run build
```

## 谁能看到什么

- 没登录的客人可以看在售蛋糕、店名和 WhatsApp 号码，并且只能新建「待确认」订单
- 客人不能打开订单列表
- 登录之后可以改订单状态、蛋糕和设置，也可以上传蛋糕照片
