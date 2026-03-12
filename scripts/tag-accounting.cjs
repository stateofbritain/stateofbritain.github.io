#!/usr/bin/env node
// Tag breakdown items that are non-cash accounting adjustments with "accounting: true"
// Affects: DESNZ, HM Treasury, Business & Trade

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'data', 'spending.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Patterns that indicate non-cash accounting items
const ACCOUNTING_PATTERNS = [
  /^AME\b/i,
  /^BoE APF/i,
  /indemnity/i,
  /NatWest share/i,
  /COVID business loans/i,
  /COVID loan provision/i,
  /provision release/i,
  /decommissioning provisions/i,
  /CfD/i,
  /^Other \(AME/i,
  /^Other \(NatWest/i,
];

// Departments where "Other" residuals should NOT be auto-tagged
const SKIP_DEPTS = ["Transport"];

function isAccounting(name) {
  return ACCOUNTING_PATTERNS.some(p => p.test(name));
}

let tagged = 0;
data.departments.items.forEach(dept => {
  if (!dept.breakdown || Array.isArray(dept.breakdown)) return;
  const skip = SKIP_DEPTS.some(s => dept.name.includes(s));
  Object.entries(dept.breakdown).forEach(([fy, items]) => {
    items.forEach(item => {
      // Remove any previous tag
      delete item.accounting;
      if (!skip && isAccounting(item.name)) {
        item.accounting = true;
        tagged++;
      }
    });
  });
});

console.log(`Tagged ${tagged} items as accounting adjustments.`);

// Verify: show tagged items
data.departments.items.forEach(dept => {
  if (!dept.breakdown || Array.isArray(dept.breakdown)) return;
  Object.entries(dept.breakdown).forEach(([fy, items]) => {
    items.filter(i => i.accounting).forEach(i => {
      console.log(`  ${dept.name} ${fy}: ${i.name} = ${i.value}`);
    });
  });
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('\nWritten to', file);
