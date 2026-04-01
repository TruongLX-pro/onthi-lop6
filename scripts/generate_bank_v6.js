const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const v5Path = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v5.jsonl');
const outputJsonlPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v6.jsonl');
const outputMdPath = path.join(rootDir, 'data', 'kntt-lop6-ontap-bank-v6.md');

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
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function hashSeed(text) {
  let hash = 0;
  for (const ch of String(text || '')) hash = (hash * 33 + ch.charCodeAt(0)) % 1000003;
  return hash;
}

function detectDomain(item) {
  const text = normalize([
    item.subject,
    item.topic,
    item.source_unit,
    item.source_lesson,
    item.question,
    item.passage,
    ...(item.skill_tag || [])
  ].join(' '));

  if (/(tinh tu|danh tu|dong tu|dai tu|quan he tu|trang ngu|chu ngu|vi ngu|cau ghep|dau gach ngang|dau ngoac kep|dau hai cham|lien ket cau|cau chu de)/.test(text)) return 'grammar';
  if (/(viet thu|bai van|doan van|mo bai|ket bai|bao cao|ta nguoi|ta phong canh|neu y kien|the hien tinh cam)/.test(text)) return 'writing';
  if (/(doc hieu|y chinh|cam xuc|chi tiet|nhan hoa|so sanh|tu ngu|nhan de|tinh cam)/.test(text)) return 'reading';
  if (/(chay|hoa hoan|duoi nuoc|bao|xam hai|tron truot|an toan o truong|an toan khi)/.test(text)) return 'safety';
  if (/(mua ban|ket noi voi cong dong|giu gin tai san cong|truong hoc|truyen thong truong|ngay hoi doc sach|cong dong)/.test(text)) return 'community';
  if (/(ho hang|gia dinh|xung ho|mung tho|ki niem gia dinh)/.test(text)) return 'family';
  if (/(san xuat|nong nghiep|thu cong|cong nghiep|lang nghe|nghe nghiep)/.test(text)) return 'production';
  if (/(mat troi|mat trang|trai dat|phuong huong|ngay va dem|khi hau|bau troi)/.test(text)) return 'astronomy';
  if (/(dien bien phu|chien dich ho chi minh|cach mang thang tam|quoc khanh|nhan vat lich su|phu nam|cham-pa|van lang|au lac|nha nuoc|khoi nghia|lam son|hau le|khang chien|asean|van minh co dai)/.test(text)) return 'history';
  if (/(dia phuong|di tich|di san|le hoi|den hung|co do hue|hoi an|thang long|ha noi|phuong tien hoc tap|truc thoi gian|ban do|tay nguyen|nam bo|dong bang|mien trung|trung du|thanh pho ho chi minh|dia dao cu chi)/.test(text)) return 'geography-history';
  if (/(tieu hoa|than kinh|dinh duong|suc khoe|tuoi day thi|nam va nu|ve sinh|phong benh)/.test(text)) return 'health';
  if (/(thuc vat|dong vat|re | re$|than|la | la$|hoa|qua|hat|nam|vi khuan|sinh san|chuoi thuc an|moi truong song|cay trong|vat nuoi)/.test(text)) return 'biology';
  if (/(hon hop|dung dich|bien doi|nuoc sach|khong khi|am thanh|anh sang|nhiet|nang luong|mach dien|dan dien|cach dien|truyen nhiet|chuyen the)/.test(text)) return 'science';
  if (/(bien|dao|moi truong|tai nguyen|rac|nguon nuoc|dat va bao ve dat|xanh|sach|dep)/.test(text)) return 'environment';
  return 'generic';
}

function detectStem(item) {
  const q = normalize(item.question);
  if (/(xung ho|huong nao|bo phan nao|vung nao|chau luc nao|cay trong nao|vat lieu nao|nguon nang luong nao|khu vuc do la|thuoc vung nao)/.test(q)) return 'term';
  if (/(nguon nao|phuong tien nao|loai ban do nao|dung nguon nao|xem loai ban do nao|truc tiep tren)/.test(q)) return 'tool';
  if (/(vi sao|tai sao|giai thich nao|nguyen nhan|chu yeu vi|hau qua nao|vai tro nao)/.test(q)) return 'reason';
  if (/(viec nao|hanh dong nao|hoat dong nao|cach nao|phuong an nao|thoi quen nao|bien phap nao|noi dung nao nen|cach xu li|ung xu the nao|chuan bi nao|nen uu tien|nen lam|khong nen|phu hop nhat|the hien y thuc|the hien su|giup bao ve|cach dat den|cach tim hieu|cau mo dau nao|cau ket bai nao)/.test(q)) return 'action';
  if (/(nhan xet nao|y nao|diem nao|ket luan nao|nhan dinh nao)/.test(q)) return 'statement';
  if (/(nhan de nao|y chinh|cam xuc gi|tu ngu nao|chi tiet nao)/.test(q)) return 'reading';
  return 'generic';
}

function getBank(item) {
  const domain = detectDomain(item);
  const stem = detectStem(item);

  if (domain === 'astronomy' && stem === 'term') return ['Bắc', 'Nam', 'Đông', 'Tây'];
  if (domain === 'family' && stem === 'term') return ['Ông', 'Bà', 'Bác', 'Chú', 'Cô', 'Dì', 'Cậu', 'Mợ', 'Anh họ', 'Chị họ'];
  if (domain === 'grammar' && stem === 'term') return ['danh từ', 'động từ', 'tính từ', 'đại từ', 'quan hệ từ', 'trạng ngữ', 'chủ ngữ', 'vị ngữ'];
  if (domain === 'science' && stem === 'term') return ['nhựa', 'đồng', 'nhôm', 'sắt', 'năng lượng mặt trời', 'than đá', 'dầu mỏ', 'khí thiên nhiên'];
  if (domain === 'biology' && stem === 'term') return ['Rễ', 'Thân', 'Lá', 'Hoa', 'Quả', 'Hạt'];
  if ((domain === 'geography-history' || domain === 'history') && stem === 'tool') return ['Bản đồ hành chính Việt Nam', 'Bản đồ địa hình', 'Trục thời gian', 'Quả địa cầu', 'Bảng chú giải'];
  if (domain === 'history' && stem === 'term') return ['Cách mạng tháng Tám năm 1945', 'Chiến thắng Điện Biên Phủ năm 1954', 'Chiến dịch Hồ Chí Minh năm 1975', 'Nhà nước Văn Lang', 'Địa đạo Củ Chi', 'ASEAN'];
  if (domain === 'geography-history' && stem === 'term') return ['Tây Nguyên', 'Nam Bộ', 'Đồng bằng Bắc Bộ', 'Duyên hải miền Trung', 'Trung du và miền núi Bắc Bộ', 'Thăng Long - Hà Nội', 'Địa đạo Củ Chi', 'Đền Hùng'];

  const actionBanks = {
    family: [
      'Chuẩn bị lời chúc và giúp việc vừa sức theo khả năng',
      'Lắng nghe, thể hiện sự quan tâm và cư xử lễ phép',
      'Tự ý quyết định thay người lớn cho nhanh',
      'Chỉ chú ý tới điều mình thích mà bỏ qua người thân'
    ],
    safety: [
      'Báo người lớn và tránh xa khu vực nguy hiểm',
      'Tự xử lí ngay khi chưa đánh giá mức độ nguy hiểm',
      'Đứng gần quan sát kĩ hơn rồi mới quyết định',
      'Làm theo bạn bè cho nhanh dù chưa an toàn'
    ],
    community: [
      'Xếp hàng, giữ trật tự và phối hợp với mọi người',
      'Tự ý làm theo ý mình dù ảnh hưởng người khác',
      'Chỉ tham gia hình thức mà không thực hiện việc chính',
      'Chen lấn hoặc bỏ dở vì nghĩ việc nhỏ không quan trọng'
    ],
    production: [
      'Làm gốm bằng tay ở làng nghề',
      'Lắp ráp ô tô trong nhà máy lớn',
      'Trồng lúa trên cánh đồng rộng',
      'Khai thác khoáng sản ở mỏ lộ thiên'
    ],
    'geography-history': [
      'Đối chiếu tư liệu chính thống và quan sát đúng đối tượng cần tìm hiểu',
      'Chọn thông tin dễ nhớ dù chưa rõ nguồn',
      'Thêm thắt chi tiết cho hấp dẫn hơn thực tế',
      'Chỉ nghe một nguồn rồi kết luận ngay'
    ],
    history: [
      'Tìm hiểu sự kiện bằng tài liệu chính thống và liên hệ ý nghĩa lịch sử',
      'Chỉ nhớ tên mốc thời gian mà không cần hiểu nội dung',
      'So sánh tùy ý không cần căn cứ sự kiện',
      'Chọn sự kiện vì nghe quen tai hơn'
    ],
    biology: [
      'Chăm sóc đúng điều kiện sống và quan sát sự thay đổi của sinh vật',
      'Cho rằng sinh vật nào cũng sống giống nhau trong mọi môi trường',
      'Chỉ nhìn vẻ ngoài rồi kết luận ngay',
      'Tự ý tác động mạnh vào cây, con vật để thử phản ứng'
    ],
    health: [
      'Giữ vệ sinh, ăn uống điều độ và thực hiện thói quen lành mạnh',
      'Làm theo sở thích dù ảnh hưởng sức khoẻ',
      'Bỏ qua dấu hiệu chưa tốt vì nghĩ sẽ tự hết',
      'Chỉ chú ý khi đã có vấn đề nghiêm trọng'
    ],
    science: [
      'Quan sát, thử nghiệm đúng cách và chọn phương pháp phù hợp',
      'Dùng một cách xử lí cho mọi hiện tượng',
      'Thêm vật khác vào mà không cần biết tác dụng',
      'Kết luận ngay mà không quan sát điều kiện thí nghiệm'
    ],
    environment: [
      'Phân loại rác, tiết kiệm tài nguyên và giữ gìn môi trường chung',
      'Tiện đâu bỏ đó vì nghĩ việc nhỏ không ảnh hưởng',
      'Ưu tiên nhanh gọn hơn bảo vệ môi trường',
      'Cho rằng bảo vệ môi trường là việc của người khác'
    ],
    writing: [
      'Chọn chi tiết tiêu biểu và sắp xếp ý mạch lạc',
      'Liệt kê ý rời rạc không theo trình tự',
      'Lặp lại một ý cho đủ dài',
      'Đưa nhiều chi tiết không liên quan'
    ],
    reading: [
      'Chọn chi tiết bám sát văn bản và hướng vào ý cần tìm',
      'Dựa vào suy đoán không có trong văn bản',
      'Chọn chi tiết phụ vì thấy nổi bật hơn',
      'Suy ra cảm xúc trái ngược với ngữ cảnh'
    ],
    generic: [
      'Chọn cách làm phù hợp với mục tiêu và điều kiện thực tế',
      'Làm theo cảm tính cho nhanh',
      'Bỏ qua bước quan trọng vì nghĩ không cần thiết',
      'Chọn phương án nổi bật nhất về hình thức'
    ]
  };

  const reasonBanks = {
    safety: [
      'Vì có thể làm tình huống nguy hiểm hơn hoặc gây hại cho bản thân',
      'Vì xử lí vội vàng thường thiếu an toàn',
      'Vì cần ưu tiên bảo vệ người trước rồi mới xử lí sự việc',
      'Vì người nhỏ tuổi luôn nên đứng gần để quan sát rõ hơn'
    ],
    astronomy: [
      'Vì Trái Đất nhận ánh sáng từ Mặt Trời không giống nhau ở từng thời điểm, từng khu vực',
      'Vì Mặt Trăng tự phát ra ánh sáng mạnh hơn vào ban ngày',
      'Vì mọi nơi trên Trái Đất luôn có khí hậu giống nhau',
      'Vì mây quyết định hoàn toàn ngày và đêm'
    ],
    'geography-history': [
      'Vì điều kiện tự nhiên thường ảnh hưởng trực tiếp đến đời sống và sản xuất của con người',
      'Vì vị trí, địa hình và sông ngòi có thể tạo nên đặc điểm riêng của từng vùng',
      'Vì mọi vùng có đặc điểm tự nhiên và hoạt động giống hệt nhau',
      'Vì thiên nhiên hầu như không liên quan tới sản xuất'
    ],
    history: [
      'Vì đó là mốc có ý nghĩa lớn đối với quá trình giành, giữ hoặc xây dựng đất nước',
      'Vì sự kiện đó gắn với bước chuyển quan trọng của lịch sử dân tộc',
      'Vì lịch sử chỉ cần nhớ tên mà không cần hiểu ý nghĩa',
      'Vì sự kiện lớn thường không ảnh hưởng đến hiện tại'
    ],
    biology: [
      'Vì mỗi sinh vật cần những điều kiện sống phù hợp để phát triển',
      'Vì bộ phận của cây cối hoặc cơ thể có chức năng khác nhau',
      'Vì chỉ cần có một yếu tố là sinh vật luôn phát triển tốt',
      'Vì mọi sinh vật thích nghi giống nhau trong mọi hoàn cảnh'
    ],
    health: [
      'Vì thói quen hằng ngày ảnh hưởng trực tiếp đến sức khoẻ và khả năng học tập',
      'Vì cơ thể cần được chăm sóc đúng cách để hoạt động tốt',
      'Vì chỉ khi có bệnh mới cần quan tâm vệ sinh và nghỉ ngơi',
      'Vì cơ thể trẻ em không bị ảnh hưởng bởi nếp sinh hoạt'
    ],
    science: [
      'Vì mỗi hiện tượng có nguyên nhân, điều kiện và cách xử lí phù hợp riêng',
      'Vì tính chất của vật chất quyết định cách quan sát, sử dụng hoặc tách chúng',
      'Vì mọi hiện tượng khoa học đều được giải thích giống nhau',
      'Vì chỉ cần nhìn bằng mắt là hiểu đầy đủ bản chất hiện tượng'
    ],
    environment: [
      'Vì môi trường và tài nguyên liên quan trực tiếp đến sinh vật và đời sống con người',
      'Vì hành động nhỏ lặp lại nhiều lần vẫn có thể gây tác động lớn',
      'Vì môi trường có thể tự phục hồi hoàn toàn dù con người không thay đổi',
      'Vì chỉ hoạt động của nhà máy mới ảnh hưởng tới môi trường'
    ],
    reading: [
      'Vì chi tiết hoặc từ ngữ đó làm rõ hơn nội dung, cảm xúc hay ý chính của văn bản',
      'Vì tác giả dùng hình ảnh để gợi suy nghĩ cho người đọc',
      'Vì mọi chi tiết trong đoạn đều có giá trị như nhau nên chọn đáp án nào cũng được',
      'Vì cảm xúc của người đọc luôn tách rời nội dung văn bản'
    ],
    generic: [
      'Vì điều kiện, hoàn cảnh và mục tiêu cụ thể quyết định cách hiểu đúng nhất',
      'Vì không cần căn cứ vào nội dung thực tế để giải thích',
      'Vì mọi trường hợp đều có thể suy ra theo một cách duy nhất',
      'Vì chỉ cần dựa vào cảm giác là đủ'
    ]
  };

  const statementBanks = {
    'geography-history': ['Điều kiện tự nhiên và hoạt động của con người có mối liên hệ chặt chẽ', 'Mỗi vùng có thể có đặc điểm nổi bật riêng', 'Mọi vùng đều hoàn toàn giống nhau', 'Thiên nhiên không ảnh hưởng đến sản xuất'],
    history: ['Đó là mốc quan trọng trong lịch sử dân tộc', 'Sự kiện ấy giúp hiểu rõ hơn quá trình dựng nước và giữ nước', 'Mốc lịch sử chỉ có ý nghĩa trong sách giáo khoa', 'Các sự kiện lịch sử lớn thường không liên quan nhau'],
    environment: ['Việc nhỏ nhưng đúng vẫn góp phần bảo vệ môi trường', 'Lợi ích trước mắt không nên đặt cao hơn môi trường lâu dài', 'Chỉ người lớn mới cần quan tâm môi trường', 'Môi trường không liên quan đến đời sống thường ngày'],
    grammar: ['Câu hoặc từ ngữ cần được xem trong ngữ cảnh để xác định đúng vai trò', 'Mỗi thành phần câu đảm nhiệm một chức năng riêng', 'Từ nào đứng đầu câu cũng là trạng ngữ', 'Chỉ cần nhìn độ dài từ là xác định được loại từ'],
    writing: ['Bài viết cần rõ ý, có trọng tâm và chi tiết phù hợp', 'Độ dài không thay thế cho chất lượng', 'Càng nhiều ý rời rạc càng sinh động', 'Không cần sắp xếp ý nếu cảm xúc chân thật'],
    generic: ['Nội dung đúng thường bám sát dữ kiện và yêu cầu câu hỏi', 'Chi tiết nổi bật chưa chắc là ý phù hợp nhất', 'Mọi nhận xét chủ quan đều có giá trị như nhau', 'Không cần đối chiếu dữ kiện vẫn có thể kết luận']
  };

  const toolBanks = {
    history: ['Trục thời gian', 'Bản đồ hành chính Việt Nam', 'Quả địa cầu', 'Bảng chú giải'],
    'geography-history': ['Bản đồ hành chính Việt Nam', 'Bản đồ địa hình', 'Quả địa cầu', 'Trục thời gian', 'Bảng chú giải'],
    generic: ['Tư liệu chính thống', 'Bảng chú giải', 'Trục thời gian', 'Suy đoán cá nhân']
  };

  const readingBanks = {
    reading: ['Chi tiết bám sát ý chính của đoạn', 'Một chi tiết phụ xuất hiện trong đoạn', 'Suy đoán không có căn cứ trực tiếp', 'Cảm xúc hoặc nhan đề lệch hướng nội dung'],
    generic: ['Chi tiết tiêu biểu nhất', 'Thông tin bên lề', 'Suy đoán quá rộng', 'Ý không xuất hiện trong văn bản']
  };

  if (stem === 'action') return actionBanks[domain] || actionBanks.generic;
  if (stem === 'reason') return reasonBanks[domain] || reasonBanks.generic;
  if (stem === 'statement') return statementBanks[domain] || statementBanks.generic;
  if (stem === 'tool') return toolBanks[domain] || toolBanks.generic;
  if (stem === 'reading') return readingBanks[domain] || readingBanks.generic;

  if (domain === 'grammar') return ['danh từ', 'động từ', 'tính từ', 'đại từ', 'quan hệ từ', 'trạng ngữ', 'chủ ngữ', 'vị ngữ'];
  if (domain === 'history') return ['Cách mạng tháng Tám năm 1945', 'Chiến thắng Điện Biên Phủ năm 1954', 'Chiến dịch Hồ Chí Minh năm 1975', 'Nhà nước Văn Lang', 'ASEAN'];
  if (domain === 'geography-history') return ['Đồng bằng Bắc Bộ', 'Tây Nguyên', 'Nam Bộ', 'Duyên hải miền Trung', 'Trung du và miền núi Bắc Bộ', 'Bản đồ hành chính Việt Nam'];
  if (domain === 'biology') return ['Rễ', 'Thân', 'Lá', 'Hoa', 'Quả', 'Hạt'];
  if (domain === 'health') return ['Ăn uống điều độ, hợp vệ sinh', 'Thức khuya thường xuyên', 'Bỏ qua vệ sinh cá nhân', 'Vận động quá sức ngay sau khi ăn'];
  if (domain === 'science') return ['Lọc hoặc để lắng', 'Dùng nam châm cho mọi trường hợp', 'Mạch điện kín', 'Mạch điện hở'];
  if (domain === 'environment') return ['Bảo vệ môi trường là trách nhiệm chung', 'Tiện đâu bỏ đó', 'Khai thác mà không phục hồi', 'Tiết kiệm tài nguyên'];
  if (domain === 'family') return ['Ông', 'Bà', 'Bác', 'Cô', 'Dì', 'Cậu'];
  return null;
}

function buildReviewedOptions(item) {
  if (item.type !== 'single_choice' || !item.options || !item.correct_answer) return item;
  if (item.distractor_enhanced) {
    return {
      ...item,
      distractor_reviewed: true,
      distractor_changed: false,
      options_review_version: 'v6-reviewed-kept'
    };
  }

  const domain = detectDomain(item);
  const stem = detectStem(item);
  const shouldRewrite = item.source_origin === 'v2-retained' || stem === 'term' || stem === 'tool' || domain === 'grammar' || domain === 'history' || domain === 'geography-history';
  if (!shouldRewrite) {
    return {
      ...item,
      distractor_reviewed: true,
      distractor_changed: false,
      options_review_version: 'v6-reviewed-kept'
    };
  }

  const correctText = item.options[item.correct_answer];
  const bank = getBank(item) || [];
  const existingDistractors = Object.entries(item.options)
    .filter(([key]) => key !== item.correct_answer)
    .map(([, value]) => value);
  const distractors = unique([...bank, ...existingDistractors]).filter((text) => text !== correctText).slice(0, 3);

  if (distractors.length < 3) {
    return {
      ...item,
      distractor_reviewed: true,
      distractor_changed: false,
      options_review_version: 'v6-reviewed-fallback'
    };
  }

  const choices = [{ text: correctText, correct: true }, ...distractors.map((text) => ({ text, correct: false }))];
  const labels = ['A', 'B', 'C', 'D'];
  const permutations = [[0,1,2,3],[1,0,2,3],[2,1,0,3],[3,1,2,0],[1,2,3,0],[2,3,0,1]];
  const permutation = permutations[hashSeed(`${item.topic}|${item.question}|v6`) % permutations.length];
  const arranged = permutation.map((index) => choices[index]);
  const options = {};
  let correctAnswer = 'A';
  arranged.forEach((choice, index) => {
    const label = labels[index];
    options[label] = choice.text;
    if (choice.correct) correctAnswer = label;
  });

  const changed = JSON.stringify(options) !== JSON.stringify(item.options) || correctAnswer !== item.correct_answer;
  return {
    ...item,
    options,
    correct_answer: correctAnswer,
    distractor_reviewed: true,
    distractor_changed: changed,
    options_review_version: changed ? 'v6-reviewed-changed' : 'v6-reviewed-kept'
  };
}

const groupOrder = [
  '3|Tự nhiên và Xã hội',
  '4|Lịch sử và Địa lí',
  '5|Lịch sử và Địa lí',
  '4|Khoa học',
  '5|Khoa học',
  '4|Tiếng Việt',
  '5|Tiếng Việt'
];

function sortForOutput(a, b) {
  const groupIndex = new Map(groupOrder.map((value, index) => [value, index]));
  const originIndex = new Map([['v5-hard',0],['v4-hard',1],['v3-hard',2],['v2-retained',3]]);
  const tierIndex = new Map([['hard',0],['core-plus',1],['core',2]]);
  const diffIndex = new Map([['vận dụng',0],['thông hiểu',1],['nhận biết',2]]);

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
  const rows = readJsonl(v5Path)
    .map((item) => ({ ...item, dataset_id: 'kntt-lop6-ontap-bank-v6', revision_round: 'v6', parent_dataset: 'kntt-lop6-ontap-bank-v5' }))
    .map(buildReviewedOptions)
    .sort(sortForOutput)
    .map((item, index) => ({ ...item, number: index + 1 }));

  fs.writeFileSync(outputJsonlPath, rows.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');

  const singles = rows.filter((x) => x.type === 'single_choice');
  const reviewedCount = singles.filter((x) => x.distractor_reviewed).length;
  const changedCount = singles.filter((x) => x.distractor_changed).length;
  const byReviewVersion = countBy(singles, (x) => x.options_review_version || 'none');

  const lines = [
    '# KNTT Lop 6 On Tap Bank v6',
    '',
    'Bo v6 la vong review distractor toan bo cho single_choice tren nen v5.',
    '',
    `## Tong so cau hoi: ${rows.length}`,
    `## So cau single_choice da review: ${reviewedCount}`,
    `## So cau single_choice da thay doi distractor/thu tu lua chon: ${changedCount}`,
    '',
    '## Trang thai review',
    ...Object.entries(byReviewVersion).map(([key, value]) => `- ${key}: ${value}`),
    ''
  ];

  fs.writeFileSync(outputMdPath, lines.join('\n'), 'utf8');
  console.log(`Generated ${rows.length} questions -> ${outputJsonlPath}`);
}

main();


