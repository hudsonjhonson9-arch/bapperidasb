const fs = require('fs');
const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const getListOld = /const getList = \(res\) => \{[\s\S]*?    \};/;
const getListNew = `const getList = (res) => {
      if (Array.isArray(res)) {
        if (res.length > 0 && res[0] !== null && typeof res[0] === 'object' && 'json' in res[0]) {
          return res.map(item => item.json);
        }
        return res;
      }
      // Handle unified master data object
      if (res && (res.berita || res.dokumen || res.slider || res.program)) return [res];
      
      if (res && res.data && Array.isArray(res.data)) return res.data;
      if (res && res.json && Array.isArray(res.json)) return res.json;
      
      // If it's a single object that looks like a data row (e.g. has an 'id'), wrap it in an array
      if (res && typeof res === 'object' && (res.id || res.judul_inovasi || res.judul)) return [res];
      
      return [];
    };`;

content = content.replace(getListOld, getListNew);

fs.writeFileSync(appPath, content, 'utf8');
console.log('getList function updated in App.jsx');
