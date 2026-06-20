# 餐厨废油回收监管系统

## 系统概述

本系统实现餐厨废油回收全流程监管，将餐饮门店、回收车辆、称重票据和去向证明串联起来，确保每一滴废油都可追溯、可监管。

## 核心业务流程

```
门店预约回收 → 司机接单 → 司机现场称重拍照 → 电子签收 → 运输(路线监控) → 处置厂入库 → 生成去向证明 → 监管核对
```

## 核心规则

- **电子签收必选**: 没有电子签收不能生成去向证明
- **称重差异校验**: 门店申报重量与司机称重差异超过阈值(默认5%)时暂停结算
- **路线偏离检测**: 车辆未按规划路线行驶自动进入异常清单
- **监管闭环**: 监管人员核对处置厂入库数据，确保去向合规

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Leaflet + Ant Design |
| 后端 | FastAPI + SQLAlchemy + Pydantic |
| 数据库 | PostgreSQL 15 |
| 部署 | Docker + Docker Compose |

## 用户角色

1. **餐饮门店**: 预约回收、查看回收记录
2. **司机**: 接单、现场称重拍照、电子签收、运输
3. **监管人员**: 核对处置厂入库、查看异常清单、核对去向证明
4. **管理员**: 用户管理、参数配置、数据看板

## 快速启动

### 方式一：Docker Compose（推荐）

```bash
docker-compose up -d
```

启动后访问:
- 前端: http://localhost:5173
- 后端API文档: http://localhost:8000/docs

### 方式二：本地开发

**启动后端:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**启动前端:**
```bash
cd frontend
npm install
npm run dev
```

## 默认测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 门店 | store01 | store123 |
| 司机 | driver01 | driver123 |
| 监管 | inspector01 | inspector123 |

## 目录结构

```
.
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── core/           # 配置、安全、数据库
│   │   ├── models/         # SQLAlchemy 模型
│   │   ├── schemas/        # Pydantic 数据模型
│   │   ├── services/       # 业务逻辑
│   │   └── main.py         # 应用入口
│   ├── db/                 # 数据库脚本
│   └── Dockerfile
├── frontend/               # React 前端
│   ├── src/
│   │   ├── api/            # API 调用封装
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── store/          # 状态管理
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
