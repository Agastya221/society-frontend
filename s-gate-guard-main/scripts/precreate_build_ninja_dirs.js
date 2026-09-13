const fs = require('fs');
const path = require('path');

const baseCxxDir = 'C:/Users/javed/Desktop/s-gate-Ag/society-frontend/s-gate-guard-main/node_modules/react-native-reanimated/android/.cxx/RelWithDebInfo/6d2j4b6s';
const abis = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];

abis.forEach(abi => {
  const ninjaPath = path.join(baseCxxDir, abi, 'build.ninja');
  if (!fs.existsSync(ninjaPath)) {
    console.log(`No build.ninja found for ${abi}`);
    return;
  }
  const content = fs.readFileSync(ninjaPath, 'utf8');
  const matches = content.match(/CMakeFiles\/reanimated\.dir\/[^\s:]+/g) || [];
  let count = 0;
  matches.forEach(match => {
    const fullObjPath = path.join(baseCxxDir, abi, match);
    const dir = path.dirname(fullObjPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      count++;
    }
  });
  console.log(`Pre-created ${count} missing directories for ${abi}`);
});
