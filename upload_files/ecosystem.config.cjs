module.exports = {
  apps: [
    {
      name: "brution-webapp",
      cwd: "/home/user/webapp",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};