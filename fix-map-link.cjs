const fs = require('fs');

const oldLink = 'https://maps.app.goo.gl/xBEPdvT2qrKixN7x9';
const newLink = 'https://maps.app.goo.gl/eMiRHky8T4qUiCXv5';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(oldLink, newLink);
fs.writeFileSync('src/App.tsx', app);
console.log('Fixed link in App.tsx');

let html = fs.readFileSync('standalone-invite.html', 'utf8');
html = html.replace(oldLink, newLink);
fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed link in standalone HTML');

// just to be thorough, check if google.com/?q= is anywhere still
if(app.includes('maps.google.com/?q=')) {
    console.log('Found old maps query in App');
}
if(html.includes('maps.google.com/?q=')) {
    console.log('Found old maps query in HTML');
}

