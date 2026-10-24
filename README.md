# 一瓶春山 · AIE3905

电脑端中国风视觉艺术交互课程项目。

- 在线原型：https://freyawang.com/spring-mountains/
- 项目说明与进度：https://freyawang.com/spring-mountains/project/

## 本地运行

纯静态 HTML / CSS / JavaScript，无需安装依赖。在仓库根目录执行：

```bash
python3 -m http.server 8000
```

打开 http://localhost:8000/ 体验原型，http://localhost:8000/project/ 查看进度。请通过 HTTP 访问，勿直接双击 HTML。

## 三个实现板块

| 板块 | 负责内容 | 任务 |
| --- | --- | --- |
| A 手势捏瓶 | 花瓶建模与形变、摄像头手势、交互接入 | T01–T03 |
| B 花材与画中生成 | 花/枝条/叶及屋舍/林木/花树建模，定点插入与生长 | T04–T06 |
| C 进入与最终观赏 | 开场进入、完成后观赏、流程串联 | T07–T09 |

具体姓名在 `project/data.json` 的 `team` 中填写。C 串联流程，三人共同验收。捏瓶只改变花瓶。

## 代码与进度

- `index.html`、`style.css`：创作界面。
- `app.js`：花瓶、花材、定点映射、场景物件与交互。
- `landscape.js`：鼠标画山、山水环境与观山。
- `vendor/`：Three.js、OrbitControls 和许可证。
- `project/`：项目页；`project/data.json` 是任务与分工的统一记录。

画山、插花、画中物件已有原型，尚未最终验收；手势捏瓶、专门开场、最终观赏流程待实现。

维护任务时更新负责人、`status`、`evidence` 与 `next`。状态：`prototype` 原型可用；`todo` 待实现；`confirm` 待核实；`done` 已验收。网页不直接写入数据。

## 协作

开始工作前拉取最新代码，各自建分支，通过 Pull Request 合并。多人修改 `app.js` 前先约定范围。

## 发布到个人网站

个人网站使用 Cloudflare Pages 项目 `yanting-wang-portfolio`。此仓库尚未接入自动部署，推送不会自动更新在线网页。

当前维护电脑的个人网站目录为 `/Users/freya/portfolio-yanting`。将本仓库的网页及资源文件同步到其中 `dist/spring-mountains/`（排除 `.git/`、README 和本地配置），再从个人网站根目录运行：

```bash
wrangler pages deploy dist --project-name yanting-wang-portfolio --branch main
```

发布需要个人网站账号权限。保留个人网站的其他文件，勿将本项目直接覆盖个人网站根目录。

## 开源来源

山水地形、水面、溪流等改编自 [臻陌然的一笔江山](https://github.com/zhenmoran/ink-shan-shui)（MIT）。Three.js 与 OrbitControls 使用 MIT 许可。详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) 和 `vendor/` 中许可证；分发时保留署名及许可。
