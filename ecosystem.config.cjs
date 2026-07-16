// PM2 process config for the LIALI API.
// The app loads its own .env via dotenv, so no env vars are injected here.
// Usage (on the server):  pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "liali-api",
      script: "server.js",
      cwd: "/var/www/liali/server",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
