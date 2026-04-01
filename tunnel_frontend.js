const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log('Tunnel started at:', tunnel.url);
    fs.writeFileSync('frontend_url.txt', tunnel.url);
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
    
    // Keep it alive
    process.stdin.resume();
  } catch (err) {
    console.error('Error starting tunnel:', err);
    process.exit(1);
  }
})();
