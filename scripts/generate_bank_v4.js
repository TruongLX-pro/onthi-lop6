const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const v3Path = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v3.jsonl');
const outputJsonlPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v4.jsonl');
const outputMdPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v4.md');

const extras = [
  ...require('./bank-v4/social'),
  ...require('./bank-v4/advanced')
];

const groupOrder = [
  '3|Tự nhiên và Xã hội',
  '4|Lịch sử và Địa lí',
  '5|Lịch sử và Địa lí',
  '4|Khoa học',
  '5|Khoa học',
  '4|Tiếng Việt',
  '5|Tiếng Việt'
];

function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function countBy(list, keyFn) {
  return list.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function complexityScore(item) {
  const questionLength = String(item.question || '').length;
  const passageLength = String(item.passage || '').length;
  const optionsLength = Object.values(item.options || {}).join(' ').length;
  const skillBonus = Array.isArray(item.skill_tag) ? item.skill_tag.length * 8 : 0;
  return questionLength + Math.round(passageLength * 0.6) + Math.round(optionsLength * 0.25) + skillBonus;
}

function sortForOutput(a, b) {
  const groupIndex = new Map(groupOrder.map((value, index) => [value, index]));
  const originIndex = new Map([
    ['v4-hard', 0],
    ['v3-hard', 1],
    ['v2-retained', 2]
  ]);
  const tierIndex = new Map([
    ['hard', 0],
    ['core-plus', 1],
    ['core', 2]
  ]);
  const diffIndex = new Map([
    ['vận dụng', 0],
    ['thông hiểu', 1],
    ['nhận biết', 2]
  ]);

  const groupA = groupIndex.get(`${a.grade}|${a.subject}`) ?? 999;
  const groupB = groupIndex.get(`${b.grade}|${b.subject}`) ?? 999;
  if (groupA !== groupB) return groupA - groupB;

  const originA = originIndex.get(a.source_origin) ?? 9;
  const originB = originIndex.get(b.source_origin) ?? 9;
  if (originA !== originB) return originA - originB;

  const tierA = tierIndex.get(a.quality_tier) ?? 9;
  const tierB = tierIndex.get(b.quality_tier) ?? 9;
  if (tierA !== tierB) return tierA - tierB;

  const diffA = diffIndex.get(a.difficulty) ?? 9;
  const diffB = diffIndex.get(b.difficulty) ?? 9;
  if (diffA !== diffB) return diffA - diffB;

  return String(a.topic || '').localeCompare(String(b.topic || ''), 'vi');
}

function main() {
  const v3 = readJsonl(v3Path);

  const existingHard = v3
    .filter((item) => item.source_origin === 'v3-hard')
    .map((item) => ({
      ...item,
      dataset_id: 'kntt-lop6-ontap-bank-v4',
      revision_round: 'v4',
      selection_reason: 'kept_v3_hard'
    }));

  const retainedStructuredOrApplied = v3
    .filter((item) => item.source_origin === 'v2-retained')
    .filter((item) => item.type !== 'single_choice' || item.difficulty === 'vận dụng')
    .map((item) => ({
      ...item,
      dataset_id: 'kntt-lop6-ontap-bank-v4',
      revision_round: 'v4',
      quality_tier: item.difficulty === 'vận dụng' ? 'hard' : 'core-plus',
      selection_reason: item.difficulty === 'vận dụng' ? 'kept_retained_applied' : 'kept_retained_non_single'
    }));

  const curatedCoreSingles = [];
  for (const group of groupOrder) {
    const pool = v3
      .filter((item) => item.source_origin === 'v2-retained')
      .filter((item) => item.type === 'single_choice' && item.difficulty === 'thông hiểu')
      .filter((item) => `${item.grade}|${item.subject}` === group)
      .sort((a, b) => complexityScore(b) - complexityScore(a))
      .slice(0, 4)
      .map((item) => ({
        ...item,
        dataset_id: 'kntt-lop6-ontap-bank-v4',
        revision_round: 'v4',
        quality_tier: 'core-plus',
        selection_reason: 'curated_retained_single_choice'
      }));

    curatedCoreSingles.push(...pool);
  }

  const hardExtras = extras.map((item) => ({
    ...item,
    dataset_id: 'kntt-lop6-ontap-bank-v4',
    source_origin: 'v4-hard',
    quality_tier: 'hard',
    revision_round: 'v4',
    selection_reason: 'new_v4_hard'
  }));

  const combined = [...existingHard, ...retainedStructuredOrApplied, ...curatedCoreSingles, ...hardExtras]
    .sort(sortForOutput)
    .map((item, index) => ({ ...item, number: index + 1 }));

  fs.writeFileSync(outputJsonlPath, combined.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');

  const byDifficulty = countBy(combined, (item) => item.difficulty);
  const bySubject = countBy(combined, (item) => `${item.grade}-${item.subject}`);
  const byOrigin = countBy(combined, (item) => item.source_origin);
  const byTier = countBy(combined, (item) => item.quality_tier);
  const byType = countBy(combined, (item) => item.type);
  const byReason = countBy(combined, (item) => item.selection_reason);

  const lines = [
    '# KNTT Lop 6 On Tap Bank v4',
    '',
    'Bo v4 la vong nang cap tiep theo cua v3, tap trung thay dan cac cau core single_choice con de bang cau hard moi va bo retained da duoc tuyen chon lai.',
    '',
    '## Cach cai tien v4',
    '- Giu toan bo cau v3-hard.',
    '- Giu retained neu cau do la dang phi single_choice hoac da dat muc van dung.',
    '- Chi giu lai mot lop nho single_choice thong hieu da duoc tuyen chon lai theo tung nhom mon.',
    '- Bo sung cum cau v4-hard moi bam bai hoc, uu tien tinh huong, suy luan, so sanh, doc hieu ngan va van dung.',
    '',
    `## Tong so cau hoi: ${combined.length}`,
    '',
    '## Phan bo theo do kho',
    ...Object.entries(byDifficulty).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Phan bo theo nhom mon',
    ...Object.entries(bySubject).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Phan bo theo nguon',
    ...Object.entries(byOrigin).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Phan bo theo quality_tier',
    ...Object.entries(byTier).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Phan bo theo dang cau hoi',
    ...Object.entries(byType).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Cach chon cau retained',
    ...Object.entries(byReason).map(([key, value]) => `- ${key}: ${value}`),
    ''
  ];

  fs.writeFileSync(outputMdPath, lines.join('\n'), 'utf8');
  console.log(`Generated ${combined.length} questions -> ${outputJsonlPath}`);
}

main();
