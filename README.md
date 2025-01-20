## ![](https://socialify.git.ci/xiaowine/szlcsc-help/image?description=1&descriptionEditable=一个帮助选择立创商城优惠券的网站工具&language=1&name=1&owner=1&theme=Auto)

# 🛍️ 立创商城优惠券助手

一个帮助选择立创商城优惠券的网站工具。

## 📝 项目简介

本项目旨在帮助用户更便捷地选择立创商城领券中心的优惠券。由于立创商城的优惠券每月更新，且大部分品牌对用户来说并不熟悉，本工具可以帮助用户更好地筛选和了解优惠券信息。

## ⚠️ 声明

- 💡 本项目仅用于辅助选择优惠券
- 🤝 不涉及任何商业行为
- 📚 数据来源：立创商城领券中心
- ✉️ 如有侵权，请联系删除

## ✨ 特点

- 🔄 自动筛选显示符合条件的优惠券
- 📊 优惠券分类展示
- ⚡ 实时更新数据
- 🔍 支持搜索功能
- 📱 移动端适配

## 🎯 筛选条件

- 🚫 排除新人专享优惠券
- 💰 仅显示优惠后消费金额小于 15 元的优惠券
- 🏢 仅显示品牌优惠券

## 🤖 自动更新

本项目通过 GitHub Actions 实现自动更新：

- 📅 每月 1-7 号每天 10 点更新一次
- 🔄 每周二和周五更新一次

## 🌐 在线访问

[szlcsc-help.xiaowine.cc](https://szlcsc-help.xiaowine.cc/)

## 🚀 本地运行

1. 克隆项目

```bash
git clone https://github.com/xiaowine/szlcsc-help.git
cd szlcsc-help
```

2. 安装依赖

```bash
pip install -r requirements.txt
```

3. 运行脚本生成数据

```bash
python main.py
```

4. 启动网页服务

- 使用 Python 内置服务器

```bash
cd html
python -m http.server 8080
```

- 或使用其他静态文件服务器

5. 访问网页
   打开浏览器访问 `http://localhost:8080`

## 🔧 技术栈

- 🐍 Python
- 🎨 HTML/CSS/JavaScript
- 🔄 GitHub Actions

## 📱 网页预览

<details>
<summary>点击查看预览图</summary>

![网页预览1](/pic/preview1.png)
![网页预览2](/pic/preview2.png)

</details>

## 📊 项目统计

[![Star History Chart](https://api.star-history.com/svg?repos=xiaowine/szlcsc-help&type=Timeline)](https://star-history.com/#xiaowine/szlcsc-help&Timeline)
