/*
 * Dedup active Subjects that share the same identity (code+name+type+grade_level).
 * Keeps the lowest id, reassigns any references (CourseAssignments, FixedActivities,
 * Schedules, SubRequests) to the keeper, then deletes the extra rows.
 *
 * Usage:
 *   node scripts/dedup-subjects.js         # dry-run: prints what it WOULD do
 *   node scripts/dedup-subjects.js --apply # backs up the DB, then applies changes
 *
 * ponytail: one-off maintenance script; keeps a timestamped backup on --apply.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'school_schedule.db');
const APPLY = process.argv.includes('--apply');
const REF_TABLES = ['CourseAssignments', 'FixedActivities', 'Schedules', 'SubRequests'];

const db = new Database(DB_PATH);

const groups = db.prepare(`
  SELECT code, name, type, IFNULL(grade_level_id,-1) g, COUNT(*) n,
         MIN(id) keep, GROUP_CONCAT(id) ids
  FROM Subjects
  WHERE is_active = 1
  GROUP BY code, name, type, IFNULL(grade_level_id,-1)
  HAVING n > 1
`).all();

if (groups.length === 0) {
  console.log('No duplicate active subjects found. Nothing to do.');
  db.close();
  process.exit(0);
}

console.log(`Found ${groups.length} duplicate group(s):\n`);
const plan = [];
for (const grp of groups) {
  const ids = grp.ids.split(',').map(Number);
  const drop = ids.filter(id => id !== grp.keep);
  const refs = {};
  for (const t of REF_TABLES) {
    const c = db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE subject_id IN (${drop.join(',')})`).get().c;
    if (c > 0) refs[t] = c;
  }
  console.log(`  ${grp.code} "${grp.name}" [${grp.type}] grade=${grp.g === -1 ? 'NULL' : grp.g}`);
  console.log(`    keep id=${grp.keep}, delete id=${drop.join(',')}${Object.keys(refs).length ? `, reassign refs: ${JSON.stringify(refs)}` : ', no refs'}`);
  plan.push({ keep: grp.keep, drop });
}

if (!APPLY) {
  console.log('\nDRY-RUN. Re-run with --apply to execute.');
  db.close();
  process.exit(0);
}

// Backup before mutating (R0 safety)
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${DB_PATH}.bak-${stamp}`;
db.close();
fs.copyFileSync(DB_PATH, backup);
console.log(`\nBackup written: ${backup}`);

const wdb = new Database(DB_PATH);
const tx = wdb.transaction(() => {
  let reassigned = 0, deleted = 0;
  for (const { keep, drop } of plan) {
    for (const t of REF_TABLES) {
      const r = wdb.prepare(
        `UPDATE ${t} SET subject_id = ? WHERE subject_id IN (${drop.join(',')})`
      ).run(keep);
      reassigned += r.changes;
    }
    const r = wdb.prepare(
      `DELETE FROM Subjects WHERE id IN (${drop.join(',')})`
    ).run();
    deleted += r.changes;
  }
  return { reassigned, deleted };
});
const { reassigned, deleted } = tx();
wdb.close();
console.log(`Done. Reassigned ${reassigned} reference(s), deleted ${deleted} duplicate subject(s).`);
