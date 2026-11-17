# 🧩 社区插件贡献指南（人人皆可参与开发）

AI教练是开放系统：**你的行业知识做成一个JSON文件，提交PR，合并后全网上线。**

## 贡献一个插件只需3步

1. **复制模板**：参照 [realestate.json](realestate.json)，把内容换成你的行业（保险/教培/医美/房产/微商…）
2. **加入目录**：在 [index.json](index.json) 的 `plugins` 数组里加一条你的插件信息（id/file/name/icon/author/version/desc）
3. **提交PR**：标题写 `新增插件：你的行业话术包`

合并后，所有用户打开AI教练 → 插件广场 → 社区插件，就能一键安装你的作品。

## 插件格式

- 插件是**纯JSON包**（不含可执行代码，安全）
- `code.topics`：教练问答新话题 `{id, kws:[触发关键词], t:标题, a:回答HTML}`
- `code.chips`：教练页快捷问题数组
- `author` 写你的署名/GitHub ID —— 作品自带作者名片

## 开发者JS API

```js
AICoach.registerTopics({id:'x1', kws:['定金'], t:'定金话术', a:'...'})
AICoach.registerChips(['今天的获客任务'])
AICoach.list()
```

## 原则

- 内容须原创或授权，拒绝抄袭与违规内容
- 话术类插件请给出可复制的示例话术（script-box）
- 一PR一插件，便于审核快速合并（目标：24小时内合并）
