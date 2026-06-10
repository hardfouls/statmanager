module.exports = {
  apps: [{
    name: 'statmanager',
    script: 'server.js',
    cwd: '/volume1/web/statmanager',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
