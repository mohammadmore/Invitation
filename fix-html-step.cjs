const fs = require('fs');
let html = fs.readFileSync('standalone-invite.html', 'utf8');

html = html.replace(
  '<div id="step-1" class="step" style="display: block;">',
  '<div id="step-1" class="step active" style="display: flex;">'
);

fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed step-1 class');
