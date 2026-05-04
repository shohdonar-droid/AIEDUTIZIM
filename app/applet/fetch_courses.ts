import https from 'https';

const chunks = [
  'e8826eabc39c4427.js', 'f19e4129d752cb5c.js', 'd1c8c4351c4ce1a7.js', '454de46cf409974a.js'
];

for (const chunk of chunks) {
   https.get('https://v0-digital-education-ai.vercel.app/_next/static/chunks/' + chunk, res => {
      let d = ''; res.on('data', c=>d+=c);
      res.on('end', () => {
         const matches = d.match(/title:\s*["']([^"']+)["']/g);
         if (matches) {
            console.log(chunk, 'TITLES:');
            matches.forEach(m => console.log('  ', m));
         }
         
         const texts = d.match(/\{[^}]*?[kK]urs[^}]*?\}/g);
         if (texts) {
            console.log(chunk, 'KURS JSON:');
         }
      });
   });
}
