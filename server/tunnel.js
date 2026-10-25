const localtunnel = require('localtunnel');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

(async () => {
  console.log('\n================================================================');
  console.log('🚀 NEXVORA PUBLIC SHARING TUNNEL');
  console.log('================================================================');
  console.log(`⏳ Connecting local port ${PORT} to secure global public tunnel...`);

  try {
    const tunnel = await localtunnel({ port: PORT });
    console.log('\n----------------------------------------------------------------');
    console.log('🎉 PUBLIC HTTPS LINK GENERATED:');
    console.log(`👉 ${tunnel.url}`);
    console.log('----------------------------------------------------------------');
    console.log('📱 Mobile & PC Users anywhere in the world can open this link.');
    console.log('🔒 HTTPS automatically enables Camera & Mic on all Android/iOS/PC browsers.');
    console.log('🔗 Example meeting invite link:');
    console.log(`   ${tunnel.url}/?meeting=nex-101-202`);
    console.log('================================================================');
    console.log('Press Ctrl+C to close the tunnel anytime.\n');

    tunnel.on('close', () => {
      console.log('Tunnel closed.');
      process.exit();
    });
  } catch (err) {
    console.error('Error starting tunnel:', err.message);
  }
})();
