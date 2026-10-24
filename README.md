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

## 枝条与建筑模块（2026-10-25）

- `architecture/roof.js`：改编自《入画》的曲面屋顶、立体瓦垄与山墙。
- `architecture/buildings.js`：民居、临街铺屋、双层小楼、四角亭、六角亭，以及落点、尺寸、间距与地基适配。
- `architecture/`：独立模型预览，可旋转缩放并查看三档尺寸。
- `app.js`：每枝对应一处建筑；高处平台默认亭子、低地默认房屋；枝长映射小中大，平台不足时缩小。落点预览会在 0.9 世界单位内尝试邻近的同类可用平台；水面、陡坡和重叠落点拒绝放置。选择已插枝条后可换式或撤除。

建筑类型在插入时确定；之后画山会调整建筑地基高度，不会自动替换已选造型。`selectMaterial` 与 `placeAt` 是模块整合入口。

验证命令（Node.js）：

```bash
node --experimental-loader ./tests/three-loader.mjs --test tests/buildings.test.mjs
```

本地打开 `/tests/interaction.html`，生成示例后检查可建点并测试插枝，可继续用主界面按钮验证换式与撤枝。该页面仅作联调，不发布到个人网站。

## 清明建筑 02：主体重做

三款房屋替换为从《入画》清明场景实际移植的临街茶肆、汴京酒铺、双层客栈，包含独立店堂、贸易陈设、招牌、布棚、纹理材质、细瓦、檐椽与二层栏杆。具体来源和适配见 `architecture/UPSTREAM.md`。亭子仍为现有两款造型。

页面和模块入口带 `v=qingming02` 版本标记；发布新版本时同步更新入口版本，避免已打开的浏览器混用旧建筑脚本。模型预览状态文字含“清明建筑 02”，可据此确认新版本。

## 岸居造境 03：住宅与可建岸地

新增小民居、围合小院（正房、厢房、院墙、院门及院内铺装）；现有茶肆与客舍更名为台十茶肆、逐亚客舍。住宅与商铺共五款，亭子两款。

`ground.js` 提供开场即存在的平缓岸地，与手绘山体高度合成；浅绿岸地可直接建房，外围浅蓝区域为水面。清空或示例重置后岸地仍保留，画山可继续在岸地或水面上起峰。生长着色器从岸地高度开始，确保视觉地面与落点采样一致。

进入创作后选择梅枝，直接点击浅绿岸地即可安屋，也可在瓶边选终点；短枝默认小民居，中长枝默认小院。选中已插枝条后可在五款房屋中换式。入口版本为 `courtyard03`。
