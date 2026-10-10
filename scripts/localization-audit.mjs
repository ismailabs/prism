import ts from 'typescript';
import assert from 'node:assert/strict';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
const files = [];
async function visit(path) { for (const entry of await readdir(path, { withFileTypes: true })) { const name = `${path}/${entry.name}`; if (entry.isDirectory()) await visit(name); else if (/\.tsx$/.test(name) && !name.endsWith('.test.tsx')) files.push(name); } }
await visit('src/components'); files.push('src/App.tsx');
const candidates = [];
const copySource = ts.createSourceFile('copy.ts', await readFile('src/components/financial/copy.ts', 'utf8'), ts.ScriptTarget.Latest, true);
let dictionary;
function findDictionary(node) { if (ts.isVariableDeclaration(node) && node.name.getText(copySource) === 'ms') dictionary = node.initializer; ts.forEachChild(node, findDictionary); }
findDictionary(copySource);
const financialKeys = new Set(dictionary.properties.map(property => property.name.text));
const missingFinancial = [], dynamicFinancial = [];
for (const path of files) {
  const source = ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function walk(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'L' && node.arguments.length) {
      const value = node.arguments[0], line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      if (ts.isStringLiteral(value) && !financialKeys.has(value.text)) missingFinancial.push({ path, line, text: value.text });
      if (ts.isTemplateExpression(value)) dynamicFinancial.push({ path, line, text: value.getText(source) });
    }
    const text = ts.isJsxText(node) ? node.text.trim().replace(/\s+/g, ' ') : ts.isJsxAttribute(node) && ['alt', 'aria-label', 'title', 'placeholder'].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer) ? node.initializer.text : '';
    if (/[a-z]{2}/i.test(text)) candidates.push({ path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text });
    ts.forEachChild(node, walk);
  } walk(source);
}
await mkdir('artifacts/phase7', { recursive: true });
await writeFile('artifacts/phase7/localization-literals.json', JSON.stringify({ routesAndComponents: files.length, candidates, missingFinancial, dynamicFinancial, note: 'AST candidate inventory, not a claim of complete semantic translation. Bilingual calls, translation resources, canonical CSV tokens, brands and user-authored names require separate review.' }, null, 2));
assert.equal(missingFinancial.length, 0, 'All static financial-copy calls require Malay entries');
console.log(JSON.stringify({ components: files.length, candidates }, null, 2));
