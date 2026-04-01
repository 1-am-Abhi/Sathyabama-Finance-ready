const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    const port = process.argv[2] || 3000;
    const name = process.argv[3] || 'tunnel';
    const tunnel = await localtunnel({ port });
    console.log(`Tunnel URL for ${name} (port ${port}): ${tunnel.url}`);
    fs.writeFileSync(`${name}_url.txt`, tunnel.url);
    
    tunnel.on('close', () => {
      console.log(`Tunnel for ${name} closed`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
