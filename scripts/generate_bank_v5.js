const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const v4Path = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v4.jsonl');
const outputJsonlPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v5.jsonl');
const outputMdPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v5.md');

const extras = [
  ...require('./bank-v5/social'),
  ...require('./bank-v5/science'),
  ...require('./bank-v5/language')
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

function normalize(text) {
  return String(text || '').toLowerCase();
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function hashSeed(text) {
  let hash = 0;
  for (const ch of String(text || '')) {
    hash = (hash * 33 + ch.charCodeAt(0)) % 1000003;
  }
  return hash;
}

function getCorrectText(item) {
  return item.options?.[item.correct_answer];
}

function getDistractorBank(item) {
  const text = normalize([
    item.subject,
    item.topic,
    item.source_unit,
    item.source_lesson,
    item.question,
    ...(item.skill_tag || [])
  ].join(' '));

  if (text.includes('bản đồ') || text.includes('trục thời gian') || text.includes('phương tiện học tập') || text.includes('quả địa cầu')) {
    return [
      'Bản đồ địa hình',
      'Bản đồ hành chính',
      'Trục thời gian',
      'Lược đồ khí hậu',
      'Bảng chú giải',
      'Quả địa cầu'
    ];
  }

  if (text.includes('cháy') || text.includes('hoả hoạn') || text.includes('đuối nước') || text.includes('bão') || text.includes('điện') || text.includes('an toàn')) {
    return [
      'Tự xử lí ngay khi chưa có người lớn hỗ trợ',
      'Đứng gần để quan sát kĩ hơn rồi quyết định sau',
      'Làm theo thói quen cho nhanh mà không cần kiểm tra độ an toàn',
      'Dùng tay hoặc vật không phù hợp để thử mức độ nguy hiểm',
      'Chờ sự việc tự qua đi rồi mới báo cho người lớn'
    ];
  }

  if (text.includes('họ hàng') || text.includes('gia đình') || text.includes('xưng hô')) {
    return ['Cậu', 'Mợ', 'Bác', 'Anh họ', 'Chị họ', 'Cô'];
  }

  if (text.includes('di tích') || text.includes('di sản') || text.includes('lễ hội') || text.includes('truyền thống')) {
    return [
      'Tin đồn truyền miệng chưa kiểm chứng',
      'Chi tiết thêm thắt cho hấp dẫn hơn sự thật',
      'Tự ý chạm vào hiện vật để quan sát gần',
      'Chen lấn hoặc gây ồn để được chú ý',
      'Chọn nguồn bất kì miễn là dễ tìm'
    ];
  }

  if (text.includes('đồng bằng') || text.includes('tây nguyên') || text.includes('nam bộ') || text.includes('miền trung') || text.includes('vùng')) {
    return [
      'Cao nguyên đất đỏ ba dan',
      'Đồng bằng châu thổ rộng',
      'Kênh rạch dày đặc',
      'Nhiều bãi biển và đầm phá',
      'Ruộng bậc thang trên sườn núi'
    ];
  }

  if (text.includes('quốc khánh') || text.includes('điện biên phủ') || text.includes('chiến dịch hồ chí minh') || text.includes('cách mạng tháng tám') || text.includes('lịch sử') || text.includes('nhân vật lịch sử')) {
    return [
      'Chiến thắng Điện Biên Phủ năm 1954',
      'Cách mạng tháng Tám năm 1945',
      'Chiến dịch Hồ Chí Minh năm 1975',
      'Nhà nước Văn Lang',
      'Hiệp định Giơ-ne-vơ năm 1954'
    ];
  }

  if (text.includes('biển') || text.includes('đảo') || text.includes('môi trường') || text.includes('rác') || text.includes('tài nguyên') || text.includes('xanh')) {
    return [
      'Khai thác nhiều hơn mà không cần phục hồi',
      'Chỉ cần quan tâm lợi ích trước mắt',
      'Bảo vệ môi trường là việc riêng của người lớn',
      'Mỗi việc nhỏ của học sinh đều không tạo khác biệt',
      'Tiện đâu bỏ đó vì môi trường có thể tự làm sạch'
    ];
  }

  if (text.includes('thực vật') || text.includes('động vật') || text.includes('cây') || text.includes('rễ') || text.includes('hạt') || text.includes('vi khuẩn') || text.includes('nấm') || text.includes('dinh dưỡng') || text.includes('sức khoẻ') || text.includes('phòng bệnh')) {
    return [
      'Không cần quan tâm điều kiện sống nếu đã có thức ăn',
      'Chỉ cần nhìn bề ngoài là biết hoàn toàn tình trạng sức khoẻ',
      'Mọi sinh vật đều có nhu cầu sống giống hệt nhau',
      'Thói quen vệ sinh chỉ cần thực hiện khi thấy bẩn rõ',
      'Sinh vật có thể phát triển tốt dù môi trường không phù hợp'
    ];
  }

  if (text.includes('hỗn hợp') || text.includes('dung dịch') || text.includes('biến đổi') || text.includes('nước sạch') || text.includes('năng lượng') || text.includes('âm thanh') || text.includes('ánh sáng') || text.includes('nhiệt')) {
    return [
      'Dùng nam châm trong mọi trường hợp tách chất',
      'Thêm một chất khác vào là có thể tách ngay',
      'Mọi biến đổi nhìn thấy đều là biến đổi hoá học',
      'Nguồn năng lượng nào cũng dùng vô hạn như nhau',
      'Chỉ cần có ánh sáng là không cần quan sát cách sử dụng'
    ];
  }

  if (text.includes('tính từ') || text.includes('quan hệ từ') || text.includes('câu ghép') || text.includes('dấu gạch ngang') || text.includes('liên kết') || text.includes('câu chủ đề')) {
    return ['danh từ', 'động từ', 'trạng ngữ', 'chủ ngữ', 'dấu hai chấm', 'cặp quan hệ từ tuy ... nhưng ...'];
  }

  if (text.includes('viết thư') || text.includes('bài văn') || text.includes('đoạn văn') || text.includes('mở bài') || text.includes('kết bài') || text.includes('báo cáo') || text.includes('nhan đề')) {
    return [
      'Liệt kê ý rời rạc không theo trình tự',
      'Chỉ nêu cảm xúc chung chung mà thiếu chi tiết',
      'Lặp lại một câu nhiều lần để tạo ấn tượng',
      'Đưa nhiều chi tiết không liên quan để bài dài hơn',
      'Chép nguyên một mẫu có sẵn mà không cần điều chỉnh'
    ];
  }

  if (text.includes('đọc hiểu') || text.includes('ý chính') || text.includes('chi tiết') || text.includes('cảm xúc') || text.includes('nhân hoá') || text.includes('so sánh')) {
    return [
      'Chi tiết phụ nhưng không làm rõ nội dung trung tâm',
      'Thông tin không xuất hiện trong văn bản',
      'Nhận xét quá rộng so với đoạn văn',
      'Cảm xúc trái ngược với ngữ cảnh đang được nói tới',
      'Một chi tiết có thật nhưng không phải ý cần tìm'
    ];
  }

  return null;
}

function buildEnhancedOptions(item) {
  if (item.type !== 'single_choice' || !item.options || !item.correct_answer) return item;
  if (item.source_origin !== 'v2-retained') return { ...item, distractor_enhanced: false, options_version: item.options_version || 'legacy' };

  const correctText = getCorrectText(item);
  if (!correctText) return item;

  const bank = getDistractorBank(item);
  if (!bank) return { ...item, distractor_enhanced: false };

  const existingDistractors = Object.entries(item.options)
    .filter(([key]) => key !== item.correct_answer)
    .map(([, value]) => value);

  const distractors = unique([...bank, ...existingDistractors]).filter((text) => text !== correctText).slice(0, 3);
  if (distractors.length < 3) return { ...item, distractor_enhanced: false };

  const permutes = [
    [0, 1, 2, 3],
    [1, 0, 2, 3],
    [2, 1, 0, 3],
    [3, 1, 2, 0],
    [1, 2, 3, 0],
    [2, 3, 0, 1]
  ];
  const seed = hashSeed(`${item.topic}|${item.question}`);
  const permutation = permutes[seed % permutes.length];
  const labels = ['A', 'B', 'C', 'D'];
  const choices = [
    { text: correctText, correct: true },
    ...distractors.map((text) => ({ text, correct: false }))
  ];
  const arranged = permutation.map((index) => choices[index]);
  const options = {};
  let correctAnswer = 'A';
  arranged.forEach((choice, index) => {
    const label = labels[index];
    options[label] = choice.text;
    if (choice.correct) correctAnswer = label;
  });

  const changed = JSON.stringify(options) !== JSON.stringify(item.options);
  return {
    ...item,
    options,
    correct_answer: correctAnswer,
    distractor_enhanced: changed,
    options_version: changed ? 'v5-enhanced' : item.options_version || 'legacy'
  };
}

function sortForOutput(a, b) {
  const groupIndex = new Map(groupOrder.map((value, index) => [value, index]));
  const originIndex = new Map([
    ['v5-hard', 0],
    ['v4-hard', 1],
    ['v3-hard', 2],
    ['v2-retained', 3]
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
  const v4 = readJsonl(v4Path).map((item) => buildEnhancedOptions({
    ...item,
    dataset_id: 'kntt-lop6-ontap-bank-v5',
    revision_round: 'v5',
    parent_dataset: 'kntt-lop6-ontap-bank-v4'
  }));

  const hardExtras = extras.map((item) => ({
    ...item,
    dataset_id: 'kntt-lop6-ontap-bank-v5',
    revision_round: 'v5',
    source_origin: 'v5-hard',
    quality_tier: 'hard',
    selection_reason: 'new_v5_hard',
    options_version: item.type === 'single_choice' ? 'v5-authored' : undefined,
    distractor_enhanced: item.type === 'single_choice' ? true : undefined
  }));

  const combined = [...hardExtras, ...v4]
    .sort(sortForOutput)
    .map((item, index) => ({ ...item, number: index + 1 }));

  fs.writeFileSync(outputJsonlPath, combined.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');

  const byDifficulty = countBy(combined, (item) => item.difficulty);
  const bySubject = countBy(combined, (item) => `${item.grade}-${item.subject}`);
  const byOrigin = countBy(combined, (item) => item.source_origin);
  const byTier = countBy(combined, (item) => item.quality_tier);
  const byType = countBy(combined, (item) => item.type);
  const enhancedCount = combined.filter((item) => item.type === 'single_choice' && item.distractor_enhanced).length;

  const lines = [
    '# KNTT Lop 6 On Tap Bank v5',
    '',
    'Bo v5 nang cap tiep theo theo hai huong: tang so cau hoi len xap xi 300 va cai thien distractor cho dang single_choice.',
    '',
    '## Nguyen tac v5',
    '- Giu nen kien thuc va phan hoa cua v4.',
    '- Bo sung them cum cau hard moi cho tung nhom mon.',
    '- Ap dung mot vong nang cap distractor cho cau single_choice cu de phuong an sai cung mien kien thuc hon.',
    '',
    `## Tong so cau hoi: ${combined.length}`,
    `## So cau single_choice da duoc enhance distractor: ${enhancedCount}`,
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
    ''
  ];

  fs.writeFileSync(outputMdPath, lines.join('\n'), 'utf8');
  console.log(`Generated ${combined.length} questions -> ${outputJsonlPath}`);
}

main();


