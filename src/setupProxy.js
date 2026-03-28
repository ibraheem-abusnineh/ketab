const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests to backend server
  // Static files (images, letters) should be served by Create React App from public folder
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
    })
  );
  // Note: Static files in /public are automatically served by Create React App
  // They should NOT go through this proxy
};


