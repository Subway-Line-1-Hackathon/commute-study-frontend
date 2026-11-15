const fs = require('node:fs')
const path = require('node:path')

// 외부 의존성을 대체하면서 실제 소스의 함수들을 같은 스코프에서 실행한다.
module.exports = function loadSource(files) {
  return files
    .map((file) =>
      fs
        .readFileSync(path.join(__dirname, '../../src', file), 'utf8')
        .replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '')
        .replace(/^export\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"]\s*$/gm, '')
        .replace(/^export (?=const |function )/gm, ''),
    )
    .join('\n')
}
