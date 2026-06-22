# 云服务器部署（元素背包史 · YSBZS）

## 服务器信息

- **主机**：sts2-cloud（**124.222.83.113**）
- **用户**：ubuntu
- **SSH 密钥**：`~/.ssh/web.pem`
- **工作目录**：`/home/ubuntu/workspace/ysbzs/`
- **静态文件**：nginx 直接服务 `/var/www/ysbzs/`（从 `web/` rsync 同步）
- **API 后端**：node 服务 `127.0.0.1:4173`（nginx 反向代理 `/ysbzs-api/` → `4173/api/`）
- **进程管理**：pm2（进程名 `ysbzs-ui`）
- **公开入口**：`http://124.222.83.113/ysbzs/`

## 一键部署

```bash
bash deploy/deploy.sh
```

## 手动部署

```bash
# 1. 同步项目代码
rsync -avz --delete \
  --exclude node_modules --exclude .git \
  --exclude '*.log' --exclude 'output/' --exclude 'upstream/' \
  -e "ssh -i ~/.ssh/web.pem" \
  ./ ubuntu@124.222.83.113:/home/ubuntu/workspace/ysbzs/

# 2. 服务器上构建并同步静态文件
ssh -i ~/.ssh/web.pem ubuntu@124.222.83.113 \
  "cd /home/ubuntu/workspace/ysbzs && \
   node tools/build_local_engine_bundle.cjs && \
   rsync -avz --delete web/ /var/www/ysbzs/"

# 3. 重启
ssh -i ~/.ssh/web.pem ubuntu@124.222.83.113 "pm2 restart ysbzs-ui"
```

## Nginx 配置

位置在 `/etc/nginx/sites-enabled/agar-io-clone`（与 agar-io-clone 共用 server block）：

```nginx
location = /ysbzs { return 301 /ysbzs/; }
location /ysbzs/ {
    alias /var/www/ysbzs/;
    index index.html;
}
location = /ysbzs-api { return 301 /ysbzs-api/health; }
location /ysbzs-api/ {
    proxy_pass http://127.0.0.1:4173/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
}
```

## 首次部署

```bash
ssh -i ~/.ssh/web.pem ubuntu@124.222.83.113
cd /home/ubuntu/workspace/ysbzs
npm install
pm2 start tools/run_ui_server.cjs --name ysbzs-ui
pm2 save
pm2 startup
```
