const fs = require('fs');
const glob = require('glob'); // Note: we can just use readdir recursively

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    let dirFile = dir + '/' + file;
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
}

const files = walkSync('src/app/(resident)');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Fix the `justifyContent: 'space-between'` in `header:` style
  if (content.includes('header: {') && content.includes('headerTitle: {')) {
    // Remove justifyContent: 'space-between' from header definition
    if (content.match(/header:\s*{[^}]*justifyContent:\s*['"]space-between['"][^}]*}/)) {
      content = content.replace(/(header:\s*{[^}]*)justifyContent:\s*['"]space-between['"],?\s*([^}]*})/, '$1$2');
      changed = true;
    }
    
    // Similarly for textAlign: 'center' in headerTitle
    if (content.match(/headerTitle:\s*{[^}]*textAlign:\s*['"]center['"][^}]*}/)) {
      content = content.replace(/(headerTitle:\s*{[^}]*)textAlign:\s*['"]center['"],?\s*([^}]*})/, '$1$2');
      changed = true;
    }

    // Standardize headerTitle typography to fontSize: 18, fontFamily: SgateFonts.semibold (or F.semiBold), color: C.t1 (or SgateColors.t1), marginLeft: 12, flex: 1
    // We rewrite the entire headerTitle block
    
    let isF = content.includes('F.semiBold') || content.includes('F.bold') || content.match(/fontFamily:\s*F\./);
    let isC = content.includes('C.t1') || content.match(/color:\s*C\./);
    let Sfont = isF ? 'F.semiBold' : 'SgateFonts.semibold';
    let Scolor = isC ? 'C.t1' : 'SgateColors.t1';

    // We replace the inside of headerTitle: { ... }
    const oldTitleMatch = content.match(/headerTitle:\s*{([^}]+)}/);
    if (oldTitleMatch) {
       // if it already has something very similar, we can just replace it entirely to enforce rules
       const newTitleStyle = ` fontSize: 18, fontFamily: ${Sfont}, color: ${Scolor}, marginLeft: 12, flex: 1 `;
       content = content.replace(oldTitleMatch[0], `headerTitle: {${newTitleStyle}}`);
       changed = true;
    }

    // Remove empty spacer views at the end of the header row
    // Pattern: <View style={{ width: ... }} /> or similar right before </View> of header
    // The safest way is to remove `<View style={{ width: [0-9]+ }} />` specifically if it is standalone
    if (content.match(/<View style=\{\{\s*width:\s*\d+\s*\}\}\s*\/>/)) {
        content = content.replace(/<View style=\{\{\s*width:\s*\d+\s*\}\}\s*\/>/g, '');
        changed = true;
    }
    
    // Also remove `flex: 1` wrapper if they used one around header title to center it
    // Wait, let's keep it simple. The spacer removal should fix it if space-between is removed.
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}
