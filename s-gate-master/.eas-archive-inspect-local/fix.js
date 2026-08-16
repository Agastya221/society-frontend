const fs=require('fs'); let c=fs.readFileSync('app.json', 'utf8').split('\n'); c.splice(18, 2); fs.writeFileSync('app.json', c.join('\n'));
