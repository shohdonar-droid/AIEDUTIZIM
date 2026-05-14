import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminQuizizz.tsx', 'utf8');

// Inject handleFirestoreError and OperationType into lib/firebase import if it's not there
const libFirebaseImportRegex = /import \{ db \} from '\.\.\/\.\.\/lib\/firebase';/;
content = content.replace(libFirebaseImportRegex, `import { db, handleFirestoreError, OperationType } from '../../lib/firebase';`);

fs.writeFileSync('src/pages/admin/AdminQuizizz.tsx', content);
