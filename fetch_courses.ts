import https from 'https';

https.get('https://v0-digital-education-ai.vercel.app', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // extract the JS files
        const jsFiles = data.match(/src="\/_next\/static\/chunks\/[^"]+\.js"/g);
        console.log(jsFiles);
    });
});
