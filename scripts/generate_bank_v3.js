const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const v2Path = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v2.jsonl');
const outputJsonlPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v3.jsonl');
const outputMdPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v3.md');

const extras = [
  ...require('./bank-v3/tnxh3'),
  ...require('./bank-v3/lsdl4'),
  ...require('./bank-v3/lsdl5'),
  ...require('./bank-v3/kh4'),
  ...require('./bank-v3/kh5'),
  ...require('./bank-v3/tv4'),
  ...require('./bank-v3/tv5')
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

function main() {
  const v2 = readJsonl(v2Path);
  const retained = v2
    .filter((item) => item.difficulty !== 'nhận biết')
    .map((item) => ({
      ...item,
      dataset_id: 'kntt-lop6-ontap-bank-v3',
      source_origin: 'v2-retained',
      quality_tier: item.difficulty === 'vận dụng' ? 'hard' : 'core'
    }));

  const hardExtras = extras.map((item) => ({
    ...item,
    dataset_id: 'kntt-lop6-ontap-bank-v3',
    source_origin: 'v3-hard',
    quality_tier: 'hard'
  }));

  const order = [
    '3|Tự nhiên và Xã hội',
    '4|Lịch sử và Địa lí',
    '5|Lịch sử và Địa lí',
    '4|Khoa học',
    '5|Khoa học',
    '4|Tiếng Việt',
    '5|Tiếng Việt'
  ];
  const groupIndex = new Map(order.map((value, index) => [value, index]));
  const diffIndex = new Map([['vận dụng', 0], ['thông hiểu', 1], ['nhận biết', 2]]);
  const originIndex = new Map([['v3-hard', 0], ['v2-retained', 1]]);

  const combined = [...hardExtras, ...retained]
    .sort((a, b) => {
      const groupA = groupIndex.get(`${a.grade}|${a.subject}`) ?? 999;
      const groupB = groupIndex.get(`${b.grade}|${b.subject}`) ?? 999;
      if (groupA !== groupB) return groupA - groupB;
      const originA = originIndex.get(a.source_origin) ?? 9;
      const originB = originIndex.get(b.source_origin) ?? 9;
      if (originA !== originB) return originA - originB;
      const diffA = diffIndex.get(a.difficulty) ?? 9;
      const diffB = diffIndex.get(b.difficulty) ?? 9;
      if (diffA !== diffB) return diffA - diffB;
      return String(a.topic).localeCompare(String(b.topic), 'vi');
    })
    .map((item, index) => ({ ...item, number: index + 1 }));

  fs.writeFileSync(outputJsonlPath, combined.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');

  const byDifficulty = countBy(combined, (item) => item.difficulty);
  const bySubject = countBy(combined, (item) => `${item.grade}-${item.subject}`);
  const byOrigin = countBy(combined, (item) => item.source_origin);
  const byTier = countBy(combined, (item) => item.quality_tier);

  const lines = [
    '# KNTT Lop 6 On Tap Bank v3',
    '',
    'Bo v3 duoc bien soan lai theo huong tang do phan hoa va bam sat bai hoc trong SGK KNTT.',
    '',
    '## Van de cua v2',
    '- Qua uu tien do phu chu de, chua du cau hoi tinh huong va suy luan.',
    '- Phan bo do kho chua hop li cho muc tieu on thi dau vao lop 6.',
    '- Lech manh ve single_choice, it cau sap xep, ghep noi, tra loi ngan.',
    '',
    '## Nguyen tac cai tien v3',
    '- Giu lai nhung cau thong hieu/van dung cua v2 con dung va co ich.',
    '- Bo sung them cum cau hoi hard theo bai hoc, co source_unit/source_lesson/skill_tag.',
    '- Tang ti le cau hoi tinh huong, suy luan, so sanh, doc hieu ngan.',
    '',
    `## Tong so cau hoi: ${combined.length}`,
    '',
    '## Phan bo theo do kho',
    ...Object.entries(byDifficulty).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Phan bo theo nhom mon',
    ...Object.entries(bySubject).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Thanh phan cua v3',
    ...Object.entries(byOrigin).map(([key, value]) => `- ${key}: ${value}`),
    ...Object.entries(byTier).map(([key, value]) => `- quality_tier ${key}: ${value}`),
    '',
    '## Metadata moi',
    '- source_origin',
    '- quality_tier',
    '- source_unit',
    '- source_lesson',
    '- skill_tag',
    ''
  ];

  fs.writeFileSync(outputMdPath, lines.join('\n'), 'utf8');
  console.log(`Generated ${combined.length} questions -> ${outputJsonlPath}`);
}

main();
