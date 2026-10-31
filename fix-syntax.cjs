const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Looking at the error, it seems the replacement for step 1 or step 3 messed up the syntax.
// Wait, the error is at line 102. 
// `<button \n onClick={() => setStep(2)}`
// Let's check what it looks like.
// It seems the regex for Step 1 button matched too much. 
// The regex was: /<button[\s\S]*?onClick=\{\(\) => setStep\(2\)\}[\s\S]*?تایید و ورود[\s\S]*?<\/button>/;
// In Step 1, the code was:
// <button onClick={() => setStep(2)} ...> تایید و ورود </button>
// Wait, in Step 1, the button goes to step 2. The link back button ALSO uses setStep(2).
// "بازگشت به صفحه قبل" in step 3 uses `setStep(2)`.
// The regex `<button[\s\S]*?onClick=\{\(\) => setStep\(2\)\}[\s\S]*?تایید و ورود[\s\S]*?<\/button>`
// might have captured the `setStep(2)` from the back button if it matched incorrectly. 

// Actually, in the previous step I added the back buttons:
// onClick={() => setStep(1)} in Step 2.
// onClick={() => setStep(2)} in Step 3.

// And the step1BtnRegex: `<button[\s\S]*?onClick=\{\(\) => setStep\(2\)\}[\s\S]*?تایید و ورود[\s\S]*?<\/button>`
// Ah! Step 1 button is `onClick={() => setStep(1)}` in fact!
// Wait, Step 0 -> Step 1 -> Step 2 -> Step 3.
// Let's just fix it manually.
const lines = app.split('\n');
console.log(lines.slice(95, 110).join('\n'));
