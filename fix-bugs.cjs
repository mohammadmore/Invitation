const fs = require('fs');

// --- 1. App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Fix Logo
app = app.replace(/src="\/logo\.png"/g, 'src="/Logo.webp"');

// Fix Justify Text
app = app.replace(
  /className="text-lg leading-relaxed font-medium"/g,
  'className="text-lg leading-relaxed font-medium text-justify"'
);

fs.writeFileSync('src/App.tsx', app);


// --- 2. standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Fix Logo
html = html.replace(/src="logo\.png"/g, 'src="Logo.webp"');
html = html.replace(/src="\/logo\.png"/g, 'src="/Logo.webp"');

// Fix Justify Text
html = html.replace(
    /<p style="font-size: 1\.15rem; line-height: 1\.8; color: #475569; margin-bottom: 1\.5rem;">/g,
    '<p style="font-size: 1.15rem; line-height: 1.8; color: #475569; margin-bottom: 1.5rem; text-align: justify; text-justify: inter-word;">'
);
html = html.replace(
    /<p style="font-size: 1\.15rem; line-height: 1\.8; color: #475569; margin-bottom: 2rem;">/g,
    '<p style="font-size: 1.15rem; line-height: 1.8; color: #475569; margin-bottom: 2rem; text-align: justify; text-justify: inter-word;">'
);
// In case the styles were different, let's just make sure all <p> in step 2 that have leading-relaxed or similar are justified.
// Another way is to replace text-align: center with text-align: justify for the specific paragraphs, but the html has inline styles.

fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed logo and text justification');
