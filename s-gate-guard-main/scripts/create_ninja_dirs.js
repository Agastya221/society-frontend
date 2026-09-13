const fs = require('fs');
const path = require('path');

const baseDir = 'C:/Users/javed/Desktop/s-gate-Ag/society-frontend/s-gate-guard-main/node_modules/react-native-reanimated/android/.cxx/RelWithDebInfo/6d2j4b6s';
const abis = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
const sourceDir = 'C:/Users/javed/Desktop/s-gate-Ag/society-frontend/s-gate-guard-main/node_modules/react-native-reanimated/Common/cpp';

function getAllDirs(dirPath, arrayOfDirs = []) {
  if (!fs.existsSync(dirPath)) return arrayOfDirs;
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfDirs.push(fullPath);
      getAllDirs(fullPath, arrayOfDirs);
    }
  });
  return arrayOfDirs;
}

const allSourceDirs = getAllDirs(sourceDir);
console.log('Found source dirs:', allSourceDirs.length);

abis.forEach(abi => {
  const targetPrefix = path.join(
    baseDir,
    abi,
    'CMakeFiles/reanimated.dir/C_/Users/javed/Desktop/s-gate-Ag/society-frontend/s-gate-guard-main/node_modules/react-native-reanimated/Common/cpp'
  );
  
  fs.mkdirSync(targetPrefix, { recursive: true });

  allSourceDirs.forEach(sub => {
    const relative = path.relative(sourceDir, sub);
    const targetPath = path.join(targetPrefix, relative);
    fs.mkdirSync(targetPath, { recursive: true });
  });
});

console.log('Successfully pre-created all Ninja build directories!');
