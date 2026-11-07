# hippo-archive

把 [dsh-hippocampus](https://github.com/coner13/dsh-hippocampus) 里的对话导出成纯 markdown，一天一个文件。

Hippocampus 擅长**检索**（翻出以前说过什么），但它不是一个档案柜。它把对话存成一行行事件流（`stream.jsonl`）——数据本身不会丢（在 `$DSH_HOME/hippocampus/` 下，卸载、升级插件都不动它），但那是只有插件自己读得懂的格式：想用别的工具打开、想带走，都不方便。

这个脚本把它变成十年后还能用记事本打开的东西。

## 它做什么

- 读遍 `<hippocampus>/<会话>/stream.jsonl`
- 写出 `archive/YYYY-MM-DD.md`，一天一个文件
- **每一句话都留全文**，不摘要、不截断
- 按会话分组：同一天里的两个对话各自成段，不会交错成像是同一个人在自问自答
- 丢掉提示词脚手架（人格卡、记忆卡、时间戳那些注入）——按结构辨认，不按长度，所以谁说了一段很长的话也照样留下
- 可选：每天末尾附一份工具调用统计

## 安装

三种，挑一个。要 Node 18 以上。

**1. 直接下这一个文件**（最省事）：

```bash
curl -O https://raw.githubusercontent.com/Zy1an114514/hippo-archive/main/export.mjs
node export.mjs
```

**2. 克隆下来：**

```bash
git clone https://github.com/Zy1an114514/hippo-archive.git
cd hippo-archive
node export.mjs
```

**3. 装成命令**（之后在任何地方都能敲 `hippo-archive`）：

```bash
npm install -g github:Zy1an114514/hippo-archive
hippo-archive --out ./archive
```

零依赖，不用构建。

## 用法

```bash
# 默认：~/.dsh/hippocampus -> ./archive
node export.mjs

# 指定路径
node export.mjs --home "C:\Users\me\.dsh\hippocampus" --out "D:\日记"

# 换个时区算日期分界（默认 UTC+8）
node export.mjs --tz -7

# 不要工具统计
node export.mjs --no-tools

# 顺带丢掉超过 1200 字的（粗暴口径，默认关闭）
node export.mjs --drop-long
```

也认环境变量：`HIPPO_HOME`、`HIPPO_OUT`、`HIPPO_TZ`。

要 Node 18 以上。零依赖。

## 为什么一天一个文件

因为一个越写越大的文件，打开会越来越慢；而且一天是最自然的单位——你想看"那天发生了什么"，直接打开那天。

用纯 markdown 而不是 JSONL：**你该能在不写代码的情况下读自己的历史。**

## 说明

只读。它不会往你的 hippocampus 目录里写任何东西。

工具调用的结果不保存，只计数——工具输出通常是机器噪音，存进去会把对话淹掉。

MIT 许可。
