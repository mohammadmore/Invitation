const fs = require('fs');
const weights = [400, 500, 700, 900];
let css = '';
for (const weight of weights) {
    const arabic = fs.readFileSync(`node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-${weight}-normal.woff2`).toString('base64');
    
    css += `
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(data:font/woff2;base64,${arabic}) format('woff2');
}
`;
}
fs.writeFileSync('font-base64.css', css);
console.log('done arabic only');
