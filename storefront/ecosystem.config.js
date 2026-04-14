module.exports = {
  apps: [{
    name: "xlmarket-storefront",
    script: ".next/standalone/server.js",
    cwd: "/home/brrr/brrr-xlmarket/storefront",
    instances: 5,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3030,
      HOSTNAME: "0.0.0.0",
    },
    max_memory_restart: "512M",
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: 5000,
  }],
}
