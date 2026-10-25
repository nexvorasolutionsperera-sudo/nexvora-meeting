const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const cfPath = path.join(__dirname, '../cloudflared.exe');

if (!fs.existsSync(cfPath)) {
  console.error('cloudflared.exe not found in root directory.');
  process.exit(1);
}

console.log('\n================================================================');
console.log('⚡ STARTING CLOUDFLARE SECURE TUNNEL (ZERO CARD, 100% FREE)');
console.log('================================================================');
console.log('⏳ Connecting to Cloudflare global network...');

const cf = spawn(cfPath, ['tunnel', '--url', 'http://localhost:5000'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let foundUrl = false;

function parseOutput(data) {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !foundUrl) {
    foundUrl = true;
    const url = match[0];
    console.log('\n----------------------------------------------------------------');
    console.log('🎉 YOUR WORLDWIDE PUBLIC MEETING LINK IS READY:');
    console.log(`👉 ${url}`);
    console.log('----------------------------------------------------------------');
    console.log('✅ 100% FREE & ZERO CREDIT CARD NEEDED');
    console.log('✅ Powered by Cloudflare Enterprise High-Speed Global Network');
    console.log('✅ Send this link to anyone on WhatsApp, Messenger or Email!');
    console.log('✅ Android, iPhone, Windows, Mac - Camera & Mic work 100% over HTTPS!');
    console.log('================================================================\n');
  }
}

cf.stdout.on('data', parseOutput);
cf.stderr.on('data', parseOutput);

cf.on('close', (code) => {
  console.log('Cloudflare tunnel closed.');
});

process.on('SIGINT', () => {
  cf.kill();
  process.exit();
});
