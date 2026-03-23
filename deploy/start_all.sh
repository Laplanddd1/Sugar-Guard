#!/usr/bin/env bash
set -euo pipefail

echo "=== 启动完整服务 ==="

echo "启动 Dify..."
cd /opt/dify/docker
docker compose up -d
sleep 5

echo "启动 SQLite API..."
cd /opt/execute-service
pkill -f "python3 app_for_dify.py" 2>/dev/null || true
python3 app_for_dify.py > /tmp/sqlite_api.log 2>&1 &
sleep 3

echo "启动 Dify Key 代理服务(sugar-guard-proxy)..."
if [ -f /opt/sugar-guard/server/.env ] && [ -f /opt/sugar-guard/deploy/docker-compose.proxy.yml ]; then
  cd /opt/sugar-guard
  docker compose -f deploy/docker-compose.proxy.yml up -d
else
  echo "⚠️ 未检测到 /opt/sugar-guard/server/.env 或 docker-compose.proxy.yml，跳过代理服务启动"
fi

echo "启动 Nginx(前端 8080)..."
if ! command -v nginx >/dev/null 2>&1; then
  apt update
  apt install -y nginx
fi

FRONTEND_ROOT="/var/www/sugar-guard"
mkdir -p "$FRONTEND_ROOT"

if [ -f /opt/sugar-guard/dist/index.html ]; then
  rm -rf "$FRONTEND_ROOT"/*
  cp -a /opt/sugar-guard/dist/. "$FRONTEND_ROOT"/
else
  echo "⚠️ 未检测到 /opt/sugar-guard/dist/index.html，请先在 /opt/sugar-guard 执行构建并将 dist 同步到 $FRONTEND_ROOT"
fi

cat > /etc/nginx/conf.d/sugar-guard.conf <<'EOF'
server {
  listen 8080;
  server_name 47.110.76.245;

  root /var/www/sugar-guard;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/dify/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_connect_timeout 60s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    proxy_pass http://127.0.0.1:3001;
  }

  location = /execute {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:5002/execute;
  }
}
EOF

rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.bak 2>/dev/null || true
for f in /etc/nginx/sites-enabled/*; do
  [ -e "$f" ] || continue
  if grep -qE 'listen\s+(\[::\]:)?80\b' "$f"; then
    rm -f "$f"
  fi
done

nginx -t
if pgrep -x nginx >/dev/null 2>&1; then
  nginx -s reload || (pkill nginx || true; nginx)
else
  nginx
fi

echo "=== 服务状态 ==="
echo "Dify 容器:"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -10

echo -e "\nSQLite API:"
if ps aux | grep -q "app_for_dify"; then
  echo "✅ 运行中 (端口:5002)"
else
  echo "❌ 未启动"
fi

echo -e "\n前端(nginx):"
if ss -lntp 2>/dev/null | grep -q ":8080"; then
  echo "✅ 运行中 (端口:8080)"
else
  echo "❌ 未启动"
fi

echo -e "\n代理服务(sugar-guard-proxy):"
if ss -lntp 2>/dev/null | grep -q ":3001"; then
  echo "✅ 运行中 (端口:3001)"
else
  echo "❌ 未启动"
fi

echo -e "\n=== 访问地址 ==="
echo "Dify 管理界面: http://47.110.76.245"
echo "前端站点: http://47.110.76.245:8080/"
echo "SQLite API: http://47.110.76.245:5002/execute"
