const localtunnel = require('localtunnel');
const expected = 'https://all-hoops-look.loca.lt';
let tunnel;
async function main() {
  tunnel = await localtunnel({ port: 80, local_host: 'web', subdomain: 'all-hoops-look' });
  if (tunnel.url !== expected) {
    console.error('Requested address unavailable; refusing a different URL. Retrying after restart.');
    tunnel.close();
    setTimeout(() => process.exit(1), 15000);
    return;
  }
  console.log(`Tunnel active: ${expected}`);
  tunnel.on('error', () => {
    console.error('Tunnel connection failed; restarting.');
    tunnel.close();
    setTimeout(() => process.exit(1), 15000);
  });
  tunnel.on('close', () => setTimeout(() => process.exit(1), 15000));
}
process.on('SIGTERM', () => { if (tunnel) tunnel.close(); process.exit(0); });
process.on('SIGINT', () => { if (tunnel) tunnel.close(); process.exit(0); });
main().catch(() => {
  console.error('Could not create tunnel; restarting.');
  setTimeout(() => process.exit(1), 15000);
});
