# SQBlog

一个基于 Next.js 的全栈博客系统，支持用户博客、笔记管理、管理后台等功能。

## 技术栈

### 前端框架
- **Next.js 16.1.1** (App Router) - React 全栈框架
- **React 19.2.3** - UI 库
- **TypeScript 5** - 类型安全

### UI 组件
- **shadcn/ui** - 组件库基础
- **Radix UI** - 无障碍组件
  - Avatar、Dialog、Dropdown Menu、Label、Select、Separator、Slot、Switch、Tabs
- **Tailwind CSS 4** - 样式框架
- **Framer Motion 12** - 动画库
- **GSAP 3** - 高性能动画
- **Lucide React** - 图标库

### 数据可视化
- **ECharts 6** - 图表库
- **React Grid Layout** - 网格布局

### Markdown 编辑器
- **@uiw/react-md-editor** - Markdown 编辑器
- **@uiw/react-markdown-preview** - Markdown 渲染
- **marked** - Markdown 解析
- **github-markdown-css** - GitHub 风格样式

### 后端核心
- **MySQL2 3.16** - 数据库驱动
- **ioredis 5.9** - Redis 客户端
- **jsonwebtoken 9.0** - JWT 认证
- **nodemailer 7.0** - 邮件发送
- **music-metadata** - 音乐元数据解析

### 安全与处理
- **DOMPurify** - XSS 防护
- **sanitize-html** - HTML 净化
- **zod 4.3** - 数据验证

### 工具库
- **clsx**、**tailwind-merge** - 样式工具
- **class-variance-authority** - 组件变体

## 截图

<img width="1920" height="971" alt="image" src="https://github.com/user-attachments/assets/fb7b3360-2271-4c51-8dfd-c32d2ad6e5ab" />
<img width="1920" height="971" alt="image" src="https://github.com/user-attachments/assets/16706292-94b5-4c0f-86c8-ec019aac35e7" />
<img width="1920" height="972" alt="image" src="https://github.com/user-attachments/assets/25da89fb-8412-4843-8ea8-1088f7f01f48" />
<img width="1920" height="970" alt="image" src="https://github.com/user-attachments/assets/552853a1-03a5-453b-bc10-251db90da0b0" />
<img width="1920" height="973" alt="image" src="https://github.com/user-attachments/assets/8146e16e-a18d-4bef-a365-675ca21751c2" />
<img width="1920" height="971" alt="image" src="https://github.com/user-attachments/assets/5275910e-3de1-4646-9738-50ed2e3d23ea" />


## 项目结构

```
sqing-blog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 首页
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   │
│   │   ├── login/              # 登录页
│   │   │   └── page.tsx
│   │   │
│   │   ├── user/               # 用户中心
│   │   │   ├── page.tsx        # 用户主页
│   │   │   ├── settings/       # 用户设置
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx      # 用户布局
│   │   │
│   │   ├── blog/               # 博客模块
│   │   │   ├── page.tsx        # 博客列表
│   │   │   ├── post/           # 发表博客
│   │   │   │   └── page.tsx
│   │   │   └── [id]/           # 动态路由
│   │   │       ├── page.tsx    # 博客详情
│   │   │       └── edit/       # 编辑博客
│   │   │           └── page.tsx
│   │   │
│   │   ├── admin/              # 管理后台
│   │   │   ├── (auth)/         # 认证路由组
│   │   │   │   ├── login/      # 管理员登录
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── (dashboard)/    # 仪表盘路由组
│   │   │       ├── page.tsx    # 仪表盘首页
│   │   │       ├── users/      # 用户管理
│   │   │       ├── news/       # 新闻管理
│   │   │       ├── feedback/   # 反馈管理
│   │   │       └── blog/       # 博客管理
│   │   │
│   │   ├── api/                # API 路由
│   │   │   ├── auth/           # 认证 API
│   │   │   │   └── register/
│   │   │   │       └── route.ts
│   │   │   ├── music/          # 音乐 API
│   │   │   │   ├── route.ts
│   │   │   │   └── meta/
│   │   │   │       └── route.ts
│   │   │   ├── pixhost/        # 图片上传
│   │   │   │   ├── upload/
│   │   │   │   │   └── route.ts
│   │   │   │   └── upload-from-url/
│   │   │   │       └── route.ts
│   │   │   ├── 60s/            # 60s 数据
│   │   │   │   ├── moyu/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── duanzi/
│   │   │   │   │   └── route.ts
│   │   │   │   └── today-in-history/
│   │   │   │       └── route.ts
│   │   │   └── health/         # 健康检查
│   │   │       └── route.ts
│   │   │
│   │   ├── todo/               # 待办事项
│   │   │   └── page.tsx
│   │   ├── notes/              # 笔记
│   │   │   └── page.tsx
│   │   └── anime/              # 动漫
│   │       └── doraemon/       # 哆啦A梦
│   │           └── page.tsx
│   │
│   ├── components/             # React 组件
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   │
│   │   ├── blog/               # 博客组件
│   │   │   ├── PostBlogForm.tsx
│   │   │   └── CategorySelector.tsx
│   │   ├── user/               # 用户组件
│   │   │   ├── UserSettingsForm.tsx
│   │   │   └── UserCenterFeedback.tsx
│   │   ├── admin/              # 管理组件
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminTopbar.tsx
│   │   │   ├── AdminDashboardCharts.tsx
│   │   │   ├── AdminBlogPanel.tsx
│   │   │   ├── AdminUsersPanel.tsx
│   │   │   ├── AdminNewsPanel.tsx
│   │   │   ├── AdminFeedbackPanel.tsx
│   │   │   ├── AdminLoginCard.tsx
│   │   │   ├── AdminNewsForm.tsx
│   │   │   ├── AdminUserMenu.tsx
│   │   │   └── adminNav.ts
│   │   ├── auth/               # 认证组件
│   │   │   └── AuthCard.tsx
│   │   ├── layout/             # 布局组件
│   │   │   ├── AppShell.tsx
│   │   │   └── BlogTitleWordBackground.tsx
│   │   ├── home/               # 首页组件
│   │   │   ├── HomeWithCarousel.tsx
│   │   │   ├── HomeRightPanel.tsx
│   │   │   ├── HomeMusicPlayer.tsx
│   │   │   └── MoyuCard.tsx
│   │   ├── notes/              # 笔记组件
│   │   │   └── StickyNotesBoard.tsx
│   │   ├── comments/           # 评论组件
│   │   │   └── Comments.tsx
│   │   ├── markdown/           # Markdown 组件
│   │   │   └── MarkdownEditor.tsx
│   │   └── legacy/             # 遗留组件（待迁移）
│   │       ├── blog/           # 博客遗留组件
│   │       │   ├── BlogCard.tsx
│   │       │   ├── BlogPage.tsx
│   │       │   ├── BlogSidebar.tsx
│   │       │   ├── BlogIndex.tsx
│   │       │   ├── UserAccount.tsx
│   │       │   └── BlogAnimeQuickLinks.tsx
│   │       └── anime/          # 动漫遗留组件
│   │           └── DoraemonAuthorIntro.tsx
│   │
│   ├── lib/                    # 工具函数与服务
│   │   ├── auth/               # 认证相关
│   │   │   ├── jwt.ts
│   │   │   ├── session.ts
│   │   │   └── server.ts
│   │   ├── db/                 # 数据库相关
│   │   │   ├── mysql.ts        # MySQL 连接
│   │   │   ├── migrations.ts   # 迁移执行
│   │   │   └── verification.ts # 验证码
│   │   ├── api/                # API 工具
│   │   │   └── response.ts
│   │   ├── id/                 # ID 生成
│   │   │   └── snowflake.ts
│   │   ├── utils.ts            # 通用工具
│   │   ├── richtext.ts         # 富文本（服务端）
│   │   ├── richtext-client.ts  # 富文本（客户端）
│   │   ├── codeCollapse.ts     # 代码折叠
│   │   ├── date.ts             # 日期工具
│   │   ├── crypto.ts           # 加密工具
│   │   ├── env.ts              # 环境变量
│   │   ├── email.ts            # 邮件发送
│   │   ├── uploads.ts          # 文件上传
│   │   ├── pixhost.ts          # PixHost API
│   │   └── account-summary-client.ts # 账户汇总（客户端）
│   │
│   ├── content/                # 内容数据
│   │   ├── charactIntro.ts
│   │   └── doraemonAuthorTimeline.ts
│   │
│   └── styles/                 # 样式文件
│       ├── globals.css
│       ├── glassmorphism.scss
│       └── legacy/             # 遗留样式
│           ├── blog.scss
│           └── anime.scss
│
├── public/                     # 静态资源
│   ├── assets/
│   ├── map/
│   └── uploads/
│
├── sql/                        # 数据库迁移脚本
│
├── plan/                       # 迁移计划
│
├── issues/                     # 任务拆解
│
├── .env.example                # 环境变量示例
├── docker-compose.yml          # Docker Compose 配置
├── Dockerfile                  # Docker 镜像配置
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript 配置
└── AGENTS.md                   # 协作指南

```

## 页面结构

### 公共页面
- **/** - 首页，展示轮播图、右侧面板、音乐播放器等

### 认证相关
- **/login** - 用户登录页
- **/admin/login** - 管理员登录页

### 用户中心
- **/user** - 用户主页，显示用户信息和统计数据
- **/user/settings** - 用户设置，修改个人信息、密码等

### 博客模块
- **/blog** - 博客列表页，支持分类过滤
- **/blog/post** - 发表新博客
- **/blog/[id]** - 博客详情页
- **/blog/[id]/edit** - 编辑博客

### 管理后台
- **/admin** - 管理仪表盘首页，显示数据统计和图表
- **/admin/users** - 用户管理，查看和管理注册用户
- **/admin/news** - 新闻管理，发布和管理新闻
- **/admin/feedback** - 反馈管理，查看用户反馈
- **/admin/blog** - 博客管理，管理所有博客文章

### 功能页面
- **/todo** - 待办事项管理
- **/notes** - 笔记管理，支持便签式笔记
- **/anime/doraemon** - 哆啦A梦专题页

### API 接口
- **POST /api/auth/register** - 用户注册
- **GET /api/music** - 获取音乐列表
- **GET /api/music/meta** - 获取音乐元数据
- **POST /api/pixhost/upload** - 本地文件上传到 PixHost
- **POST /api/pixhost/upload-from-url** - URL 图片上传到 PixHost
- **GET /api/60s/moyu** - 获取摸鱼数据
- **GET /api/60s/duanzi** - 获取段子
- **GET /api/60s/today-in-history** - 获取历史上的今天
- **GET /api/health** - 健康检查

## 快速开始

### 环境要求
- Node.js 20+
- MySQL 5.7+
- Redis 5+
- Bun（推荐）或 npm/pnpm

### 安装依赖
```bash
bun install
```

### 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库、Redis、邮件等信息。

### 启动开发服务器
```bash
bun dev
```

访问 http://localhost:3000

### 构建生产版本
```bash
bun run build
bun start
```

### Docker 部署
```bash
# 构建镜像
docker build -t doraemon-blog:latest .

# 使用 Compose 启动
docker compose up -d

# 查看日志
docker compose logs -f web
```

## 数据库迁移

项目在首次访问时会自动执行 `sql/` 目录下的迁移脚本。迁移文件按日期命名，便于追踪。

## 认证机制

- 使用 HttpOnly Cookie 进行会话管理
- 用户 token：`doraemon_token`
- 管理员 token：`doraemon_admin_token`
- JWT 签名验证

## 开发规范

详见 [AGENTS.md](./AGENTS.md)
