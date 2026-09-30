# 立创商城优惠券助手

[![Deploy to GitHub Pages](https://github.com/xiaowine/szlcsc-help/actions/workflows/run.yml/badge.svg)](https://github.com/xiaowine/szlcsc-help/actions/workflows/run.yml)

帮助用户从立创商城领券中心快速筛选、了解优惠券信息的网站工具。

## 项目简介

立创商城的优惠券每月更新，品牌繁多且大多数用户并不熟悉。本工具自动抓取并过滤优惠券数据，按领取人数排序展示，方便用户快速找到高性价比的券。

## 筛选条件

- 排除新人专享优惠券
- 仅显示优惠后实付金额小于 15 元的品牌优惠券

## 特点

- 自动筛选并按领取人数排序
- 分类浏览 + 关键词搜索
- 数据定期自动更新
- 移动端适配

## 自动更新

通过 GitHub Actions 驱动，构建产物直接部署到 GitHub Pages，不依赖 `gh-pages` 发布分支：

- 每月 1–7 号每天 10 点运行一次
- 每周二、周五各运行一次

## 在线访问

[szlcsc-help.xiaowine.cc](https://szlcsc-help.xiaowine.cc/)

## 搜索引擎收录

生产构建会将 `public/sitemap.xml` 和 `public/robots.txt` 原样发布到站点根目录，供搜索引擎发现首页和分类页。sitemap 会根据本次抓取生成的 `public/run_time.txt` 自动写入 `lastmod`。

- 网站地图：<https://szlcsc-help.xiaowine.cc/sitemap.xml>
- 抓取规则：<https://szlcsc-help.xiaowine.cc/robots.txt>
- 分类页面格式：`/?category=分类名称`

站点域名只在部署工作流的 `SITE_HOST` 环境变量中配置；工作流会拼接出 `SITE_URL`，再自动生成 sitemap 和 robots，不需要逐条修改 URL。

## 本地运行

**环境要求：** Node.js 18+，pnpm

```bash
# 1. 克隆仓库
git clone https://github.com/xiaowine/szlcsc-help.git
cd szlcsc-help

# 2. 安装依赖
pnpm install

# 3. 抓取优惠券数据
pnpm fetch

# 4. 启动开发服务器
pnpm dev
```

打开浏览器访问 `http://localhost:5173`。

如需构建生产版本：

```bash
pnpm build
```

产物输出到 `html/`。

## 技术栈

- Vue 3 + TypeScript + Vite（前端）
- Node.js / tsx（数据抓取脚本）
- GitHub Actions（自动更新与部署）

## 声明

本项目仅用于辅助选择优惠券，不涉及任何商业行为。数据来源于立创商城领券中心，如有侵权请联系删除。

## 网页预览

<details>
<summary>展开查看</summary>

![网页预览1](/pic/preview1.png)
![网页预览2](/pic/preview2.png)

</details>

## 项目统计

[![Star History Chart](https://api.star-history.com/svg?repos=xiaowine/szlcsc-help&type=Timeline)](https://star-history.com/#xiaowine/szlcsc-help&Timeline)
