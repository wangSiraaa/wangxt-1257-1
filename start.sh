#!/bin/bash

echo "================================================"
echo "  餐厨废油回收监管系统 - 启动脚本"
echo "================================================"

MODE=${1:-docker}

if [ "$MODE" = "docker" ]; then
    echo ""
    echo "使用 Docker Compose 启动所有服务..."
    echo ""
    docker-compose up -d --build
    
    echo ""
    echo "等待服务启动..."
    sleep 5
    
    echo ""
    echo "================================================"
    echo "  服务启动完成！"
    echo "================================================"
    echo "  前端页面:    http://localhost:5173"
    echo "  后端API:     http://localhost:8000"
    echo "  API文档:     http://localhost:8000/docs"
    echo "  PostgreSQL:  localhost:5432"
    echo ""
    echo "  默认测试账号:"
    echo "    管理员:    admin / admin123"
    echo "    门店:      store01 / store123"
    echo "    司机:      driver01 / driver123"
    echo "    监管:      inspector01 / inspector123"
    echo "================================================"
    echo ""
    echo "停止服务: ./start.sh stop"
    echo "查看日志: docker-compose logs -f"
    echo ""

elif [ "$MODE" = "stop" ]; then
    echo ""
    echo "停止所有服务..."
    docker-compose down
    echo "服务已停止。"

elif [ "$MODE" = "local" ]; then
    echo ""
    echo "使用本地开发模式启动..."
    echo ""
    
    echo "启动后端 (端口 8000)..."
    cd backend
    if [ ! -d ".venv" ]; then
        echo "创建 Python 虚拟环境..."
        python3 -m venv .venv
    fi
    source .venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1 &
    BACK_PID=$!
    wait $BACK_PID
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACK_PID=$!
    cd ..
    
    echo "启动前端 (端口 5173)..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "安装 npm 依赖..."
        npm install
    fi
    npm run dev &
    FRONT_PID=$!
    cd ..
    
    echo ""
    echo "================================================"
    echo "  开发服务启动完成！"
    echo "================================================"
    echo "  前端页面: http://localhost:5173"
    echo "  后端API:  http://localhost:8000"
    echo "  API文档:  http://localhost:8000/docs"
    echo ""
    echo "按 Ctrl+C 停止服务"
    echo "================================================"
    
    wait $BACK_PID $FRONT_PID

else
    echo "用法: ./start.sh [docker|local|stop]"
    echo "  docker - 使用 Docker Compose 启动（默认）"
    echo "  local  - 本地开发模式启动"
    echo "  stop   - 停止 Docker 服务"
fi
