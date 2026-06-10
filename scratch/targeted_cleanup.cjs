const fs = require('fs');
let appPath = 'src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');

// Specific targeted replacements for remaining garbage
appContent = appContent.replace(/<div style=\{\{ fontSize: 42, marginBottom: 14 \}\}>[\s\S]*?<\/div>/, '<div style={{ fontSize: 42, marginBottom: 14 }}>\\uD83D\\uDD0D</div>');

// Replace any remaining Ã or â sequences that look like encoding errors
appContent = appContent.replace(/Ã°Å¸â€ Â /g, '\\uD83D\\uDD0D');
appContent = appContent.replace(/Ã°Å¸â€ºÂ Ã¯Â¸Â /g, '\\uD83D\\uDEE0\\uFE0F');
appContent = appContent.replace(/Ã°Å¸â€™Â¡/g, '\\uD83D\\uDCA1');
appContent = appContent.replace(/Ã°Å¸â€œÂ¦/g, '\\uD83D\\uDCE6');

// Fix the Admin Button text error seen in previous logs
appContent = appContent.replace(/A\??"A,??A/g, '<Shield size={16} />');

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Final targeted cleanup done.');
