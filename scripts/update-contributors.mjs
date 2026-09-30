import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const readmePath = join(repoRoot, 'README.md');
const checkOnly = process.argv.includes('--check');
const knownContributors = new Map([
  ['664259011@webmail.npru.ac.th', ['Phongsakorn Tangpok', '3oomm']],
  ['664259031@webmail.npru.ac.th', ['Alongkon Natphunwat', 'nine9031']],
  ['136414303+nine9031@users.noreply.github.com', ['Alongkon Natphunwat', 'nine9031']],
  ['156178493+sundayyogurt@users.noreply.github.com', ['Krit', 'SundayYogurt']],
]);

const log = execFileSync('git', ['log', '--all', '--format=%an%x09%ae%x09%cs'], {
  cwd: repoRoot,
  encoding: 'utf8',
});
const contributors = new Map();
let latestDate = '';

for (const line of log.trim().split(/\r?\n/)) {
  if (!line) continue;
  const [author, rawEmail, date] = line.split('\t');
  const email = rawEmail.toLowerCase();
  if (email.includes('github-actions[bot]') || author === 'github-actions[bot]') continue;

  const known = knownContributors.get(email);
  const name = known?.[0] ?? author;
  const handle = known?.[1] ?? null;
  const key = known ? name : email;
  const entry = contributors.get(key) ?? { name, handle, count: 0 };
  entry.count += 1;
  contributors.set(key, entry);
  if (date > latestDate) latestDate = date;
}

if (!latestDate || contributors.size === 0) throw new Error('No human commits found');

const rows = [...contributors.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
const total = rows.reduce((sum, row) => sum + row.count, 0);
const percent = (count) => `${(count / total * 100).toFixed(1)}%`;
const escapeMarkdown = (value) => value.replace(/[|<>\r\n]/g, ' ');
const escapeMermaid = (value) => value.replace(/["\r\n]/g, ' ');
const [, month, day] = latestDate.match(/^\d{4}-(\d{2})-(\d{2})$/) ?? [];
const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
if (!month) throw new Error(`Invalid commit date: ${latestDate}`);
const formattedDate = `${Number(day)} ${months[Number(month) - 1]} ${latestDate.slice(0, 4)}`;

const table = [
  '| Contributor | GitHub | Commits | สัดส่วน |',
  '|---|---|---:|---:|',
  ...rows.map(({ name, handle, count }) => {
    const profile = handle ? `[@${handle}](https://github.com/${handle})` : '—';
    return `| ${escapeMarkdown(name)} | ${profile} | **${count}** | **${percent(count)}** |`;
  }),
  `| **รวม** |  | **${total}** | **100%** |`,
];
const chart = [
  '```mermaid',
  'pie showData',
  '    title สัดส่วน commits ของ FlyUp Frontend',
  ...rows.map(({ name, count }) => `    "${escapeMermaid(name)} — ${percent(count)}" : ${count}`),
  '```',
];
const note = `> สถิติคำนวณจาก \`git log --all\` ของ repository \`flyup\` ณ วันที่ **${formattedDate}** โดยรวมชื่อและอีเมล commit หลายรูปแบบของบุคคลเดียวกันแล้ว ตัวเลข commits ใช้แสดงกิจกรรมใน Git เท่านั้น ไม่ใช่ตัววัดปริมาณหรือคุณค่าของงานทั้งหมด`;
const content = [
  '<!-- contributors:start -->',
  ...table,
  '',
  ...chart,
  '',
  note,
  '<!-- contributors:end -->',
].join('\n');

const readme = readFileSync(readmePath, 'utf8');
const block = /<!-- contributors:start -->[\s\S]*?<!-- contributors:end -->/;
if (!block.test(readme)) throw new Error('Contributor markers not found in README.md');
const updated = readme.replace(block, content);
if (updated === readme) {
  console.log('Contributor statistics are up to date.');
} else if (checkOnly) {
  console.error('Contributor statistics are out of date. Run node scripts/update-contributors.mjs');
  process.exitCode = 1;
} else {
  writeFileSync(readmePath, updated);
  console.log(`Updated contributor statistics: ${total} commits.`);
}
