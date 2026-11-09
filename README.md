# 基金应知应会 · 自习室

基于 `（证券）基金应知应会真题.docx` 整理的 205 题个人复习网站。纯 HTML/CSS/JavaScript，无需安装依赖，也不需要注册或后端服务。

## 立即使用

### 方法一：直接打开

用 Chrome、Edge 或 Firefox 打开项目根目录的 **`index.html`** 即可。题库使用本地 JavaScript 文件加载，支持 `file://` 方式访问。

### 方法二：启动本地网站

在项目目录执行：

```bash
python -m http.server 8000
```

然后访问 <http://localhost:8000>。

如需在同一局域网内用手机访问，可执行：

```bash
python -m http.server 8000 --bind 0.0.0.0
```

手机与电脑连接同一网络后，访问 `http://<电脑局域网IP>:8000`。请仅在可信网络中使用，并按需配置系统防火墙。

### 手机立即使用（同一 Wi-Fi）

1. 保持电脑上的网站服务运行，并确保手机与电脑连接同一 Wi-Fi。
2. 手机浏览器打开 **http://172.16.30.24:8000**。
3. iPhone：Safari 点击“分享”→“添加到主屏幕”；安卓：Chrome 菜单→“添加到主屏幕”。此后可从主屏幕图标进入。
4. 如果无法打开，请检查电脑防火墙是否允许 8000 端口，以及路由器是否启用了设备隔离。

局域网 IP 可能变化，可在电脑上运行 `hostname -I` 重新查看。若手机与电脑不在同一网络，或需要在户外使用，应将网站部署到公网 HTTPS。

### PWA 与离线使用

项目包含 `manifest.webmanifest`、`sw.js` 和两种尺寸的主屏幕图标。浏览器在 **HTTPS 或 localhost** 安全环境下会注册 Service Worker，缓存完整题库，支持安装后离线刷题。普通局域网 HTTP 地址可以直接在线刷题并保存记录，但浏览器通常会禁用 Service Worker，因此不保证离线能力。

## 功能

- **自主刷题**：全部、未练、错题、收藏或按知识点选题；顺序/随机出题；提交后显示答案和逐题解析。
- **模拟考试**：自定义题量和时长，随机抽题，倒计时、答题卡、自动/手动交卷、百分制评分。
- **错题本**：自动收集练习与模考错题，记录作答次数、上次答案；重新答对后自动标记为已掌握，也可手动移出。
- **题库背题**：搜索题干、选项、知识点或题号，按需展开选项与解析。
- **收藏与专项练习**：收藏重点题，并从任意单题开始练习。
- **学习统计**：题库覆盖率、累计正确率、错题数、各知识点正确率。
- **进度恢复**：练习和考试自动保存，刷新或关闭页面后可继续。
- **数据备份**：首页可导出/导入 JSON 学习记录。
- **键盘操作**：A—D 选项，Enter 确认/下一题，左右方向键切题，F 收藏。
- **响应式布局**：支持电脑和手机浏览器。

## 学习数据说明

答题记录、收藏、练习进度和最近 30 次模考仅保存在当前浏览器的 `localStorage` 中，不会上传。清理浏览器数据、换浏览器或换设备前，请先在首页导出备份。

题目与原卷答案来自所提供的 Word 文档，解析由 AI 辅助整理。第 157 题经复核将原卷答案 C 更正为 B，并在题目解析中说明；第 161、178、192 题保留了原卷口径或排版说明。法规与监管规则具有时效性，请以最新官方规定和教材为准。

## 文件结构

```text
index.html                     网站入口
styles.css                    响应式界面样式
app.js                        刷题、模考、错题和本地存储逻辑
manifest.webmanifest          可安装 Web App 配置
sw.js                         HTTPS/localhost 离线缓存
assets/                       主屏幕 PNG 图标
data/questions.js             浏览器直接加载的完整题库
data/questions.json           结构化完整题库
data/explanations/            分段答案复核与解析源文件
source_questions.txt          从 Word 提取的原始文本
tools/extract_docx.py         Word 文本提取
tools/parse_questions.py      题目结构解析与校验
tools/build_question_bank.py  合并解析、清理排版并生成网站题库
tests/run_tests.cjs           无第三方依赖的交互回归测试
```

## 重新构建题库

已生成的网站无需执行这些命令。仅在修改原文提取或分段解析后需要重建：

```bash
python -I tools/extract_docx.py "（证券）基金应知应会真题.docx" source_questions.txt
python -I tools/parse_questions.py source_questions.txt data/questions.json
python -I tools/build_question_bank.py .
```

构建脚本会校验 205 个连续题号、选项与答案对应关系、解析完整性和知识点分类，并保留 `sourceAnswer` 原卷答案。

## 测试

```bash
node --check app.js
node tests/run_tests.cjs
```

回归测试覆盖随机练习、答案判定与解析、错题生成与掌握、收藏、题库搜索、模考评分、未答题处理、成绩复习、刷新恢复、考试记录和清空数据。
