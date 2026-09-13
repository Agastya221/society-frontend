const fs = require('fs');
const path = require('path');

function copyCppFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    if (fs.statSync(srcFile).isFile() && file.endsWith('.cpp')) {
      const destFile = path.join(destDir, file);
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied ${file} -> ${destDir}`);
    }
  });
}

// safe-area-context
copyCppFiles(
  'node_modules/react-native-safe-area-context/common/cpp/react/renderer/components/safeareacontext',
  'node_modules/react-native-safe-area-context/android/src/main/jni'
);

// screens
copyCppFiles(
  'node_modules/react-native-screens/common/cpp/react/renderer/components/rnscreens',
  'node_modules/react-native-screens/android/src/main/jni'
);
copyCppFiles(
  'node_modules/react-native-screens/common/cpp/react/renderer/components/rnscreens/utils',
  'node_modules/react-native-screens/android/src/main/jni'
);

console.log('Successfully copied C++ source files into jni folders!');
