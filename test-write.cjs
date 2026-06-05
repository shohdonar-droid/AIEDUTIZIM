const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const cfg = require('./firebase-applet-config.json');
const app = initializeApp(cfg);
const db = getFirestore(app);

setDoc(doc(db, 'settings', 'bot_settings'), { test: 1 }, { merge: true })
  .then(() => {
    console.log('success');
    process.exit(0);
  })
  .catch(e => {
    console.error(e.code);
    process.exit(1);
  });
