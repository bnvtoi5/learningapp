/**
 * Utility generator for smart, rich, diverse contextual sentences (Fill in Blank & Flashcard examples).
 * Solves the repetitive / inflexible single template problem in offline generation and fallback.
 */

export interface SmartSentenceResult {
  sentenceWithBlank: string; // Sentence with "___"
  fullSentence: string;      // Sentence with target word
  translation: string;       // Natural Vietnamese translation
}

interface ContextTemplate {
  englishPattern: (word: string) => string;
  vietnamesePattern: (meaning: string) => string;
}

const NOUN_TEMPLATES: ContextTemplate[] = [
  {
    englishPattern: (w) => `The professor highlighted the significance of ${w} in modern research.`,
    vietnamesePattern: (m) => `Giáo sư đã nhấn mạnh tầm quan trọng của ${m} trong nghiên cứu hiện đại.`
  },
  {
    englishPattern: (w) => `Recent technological advancements have completely transformed our approach to ${w}.`,
    vietnamesePattern: (m) => `Những tiến bộ công nghệ gần đây đã thay đổi hoàn toàn cách chúng ta tiếp cận ${m}.`
  },
  {
    englishPattern: (w) => `Effective communication requires a deep understanding of ${w}.`,
    vietnamesePattern: (m) => `Giao tiếp hiệu quả đòi hỏi sự hiểu biết sâu sắc về ${m}.`
  },
  {
    englishPattern: (w) => `Her dedication to ${w} has inspired everyone in the workplace.`,
    vietnamesePattern: (m) => `Sự cống hiến của cô ấy cho ${m} đã truyền cảm hứng cho mọi người tại nơi làm việc.`
  },
  {
    englishPattern: (w) => `The government introduced new policies aimed at promoting ${w} across the country.`,
    vietnamesePattern: (m) => `Chính phủ đã đưa ra các chính sách mới nhằm thúc đẩy ${m} trên toàn quốc.`
  },
  {
    englishPattern: (w) => `Finding a healthy balance between work and ${w} is vital for long-term happiness.`,
    vietnamesePattern: (m) => `Tìm kiếm sự cân bằng lành mạnh giữa công việc và ${m} là điều cốt yếu cho hạnh phúc lâu dài.`
  },
  {
    englishPattern: (w) => `Many international organizations are actively supporting the development of ${w}.`,
    vietnamesePattern: (m) => `Nhiều tổ chức quốc tế đang tích cực hỗ trợ sự phát triển của ${m}.`
  },
  {
    englishPattern: (w) => `Scientific studies have revealed compelling evidence regarding the impact of ${w}.`,
    vietnamesePattern: (m) => `Các nghiên cứu khoa học đã tiết lộ bằng chứng thuyết phục liên quan đến tác động của ${m}.`
  }
];

const ADJECTIVE_TEMPLATES: ContextTemplate[] = [
  {
    englishPattern: (w) => `The local residents were exceptionally ${w} toward all international visitors.`,
    vietnamesePattern: (m) => `Cư dân địa phương đặc biệt ${m} đối với tất cả du khách quốc tế.`
  },
  {
    englishPattern: (w) => `His colleagues admired him for maintaining a remarkably ${w} attitude under pressure.`,
    vietnamesePattern: (m) => `Các đồng nghiệp ngưỡng mộ anh ấy vì luôn duy trì thái độ ${m} ngay cả khi chịu áp lực.`
  },
  {
    englishPattern: (w) => `The manager commended the entire team for their ${w} contribution to the project.`,
    vietnamesePattern: (m) => `Người quản lý đã biểu dương cả nhóm vì đóng góp ${m} của họ vào dự án.`
  },
  {
    englishPattern: (w) => `She delivered a very ${w} presentation that impressed the whole audience.`,
    vietnamesePattern: (m) => `Cô ấy đã thực hiện một bài thuyết trình rất ${m}, gây ấn tượng sâu sắc cho toàn bộ khán giả.`
  },
  {
    englishPattern: (w) => `In today's fast-paced environment, staying ${w} is an invaluable advantage.`,
    vietnamesePattern: (m) => `Trong môi trường năng động ngày nay, việc giữ cho mình ${m} là một lợi thế vô giá.`
  },
  {
    englishPattern: (w) => `The hotel provides a uniquely ${w} atmosphere that makes guests feel right at home.`,
    vietnamesePattern: (m) => `Khách sạn mang đến một không gian đặc trưng ${m}, giúp du khách cảm thấy như đang ở nhà.`
  }
];

const VERB_TEMPLATES: ContextTemplate[] = [
  {
    englishPattern: (w) => `The committee decided to ${w} the proposal after thorough review.`,
    vietnamesePattern: (m) => `Ủy ban đã quyết định ${m} đề xuất sau khi xem xét kỹ lưỡng.`
  },
  {
    englishPattern: (w) => `Students are encouraged to ${w} actively during classroom discussions.`,
    vietnamesePattern: (m) => `Học sinh được khuyến khích ${m} một cách chủ động trong các buổi thảo luận lớp học.`
  },
  {
    englishPattern: (w) => `To succeed in the modern market, businesses must constantly ${w} and innovate.`,
    vietnamesePattern: (m) => `Để thành công trên thị trường hiện đại, các doanh nghiệp phải liên tục ${m} và đổi mới.`
  },
  {
    englishPattern: (w) => `She worked tirelessly to ${w} her personal goals throughout the year.`,
    vietnamesePattern: (m) => `Cô ấy đã làm việc không mệt mỏi để ${m} các mục tiêu cá nhân của mình trong suốt cả năm.`
  },
  {
    englishPattern: (w) => `Experts advise young professionals to ${w} their skills regularly.`,
    vietnamesePattern: (m) => `Các chuyên gia khuyên các chuyên gia trẻ nên thường xuyên ${m} kỹ năng của mình.`
  }
];

const GENERAL_TEMPLATES: ContextTemplate[] = [
  {
    englishPattern: (w) => `She demonstrated a remarkable example of ${w} during the annual conference.`,
    vietnamesePattern: (m) => `Cô ấy đã thể hiện một minh chứng đáng chú ý về ${m} trong hội nghị thường niên.`
  },
  {
    englishPattern: (w) => `Having a clear perspective on ${w} helps individuals make wiser choices.`,
    vietnamesePattern: (m) => `Có được một góc nhìn rõ ràng về ${m} giúp các cá nhân đưa ra những lựa chọn sáng suốt hơn.`
  },
  {
    englishPattern: (w) => `The workshop was designed to help participants explore the concept of ${w}.`,
    vietnamesePattern: (m) => `Hội thảo được thiết kế để giúp các học viên khám phá khái niệm về ${m}.`
  },
  {
    englishPattern: (w) => `Everyone agreed that ${w} plays a fundamental role in sustainable development.`,
    vietnamesePattern: (m) => `Mọi người đều đồng ý rằng ${m} đóng vai trò nền tảng trong sự phát triển bền vững.`
  },
  {
    englishPattern: (w) => `Through patience and dedication, they successfully mastered ${w}.`,
    vietnamesePattern: (m) => `Nhờ sự kiên nhẫn và tận tụy, họ đã làm chủ ${m} một cách thành công.`
  }
];

/**
 * Tạo câu ví dụ thông minh, tự nhiên, đa dạng ngữ cảnh cho dạng điền từ và flashcard
 */
export function createSmartFillInBlank(word: string, rawMeaning: string, index: number = 0): SmartSentenceResult {
  const cleanWord = word.trim();
  const cleanMeaning = (rawMeaning || cleanWord)
    .replace(/^([a-z]\s*:\s*|\(adj\)|\(v\)|\(n\)|\(adv\))\s*/i, '')
    .trim();

  // Phát hiện dạng từ cơ bản từ nghĩa tiếng Việt
  const lowerMeaning = cleanMeaning.toLowerCase();
  let candidatePool = GENERAL_TEMPLATES;

  if (
    lowerMeaning.startsWith('thân thiện') ||
    lowerMeaning.startsWith('chăm chỉ') ||
    lowerMeaning.startsWith('thông minh') ||
    lowerMeaning.startsWith('tuyệt') ||
    lowerMeaning.startsWith('đẹp') ||
    lowerMeaning.startsWith('nhanh') ||
    lowerMeaning.includes('(adj)') ||
    lowerMeaning.endsWith('tính')
  ) {
    candidatePool = ADJECTIVE_TEMPLATES;
  } else if (
    lowerMeaning.startsWith('làm') ||
    lowerMeaning.startsWith('thực hiện') ||
    lowerMeaning.startsWith('khám phá') ||
    lowerMeaning.startsWith('tìm') ||
    lowerMeaning.startsWith('quyết định') ||
    lowerMeaning.startsWith('phát triển') ||
    lowerMeaning.includes('(v)')
  ) {
    candidatePool = VERB_TEMPLATES;
  } else if (
    lowerMeaning.startsWith('sự ') ||
    lowerMeaning.startsWith('việc ') ||
    lowerMeaning.startsWith('người ') ||
    lowerMeaning.startsWith('môi trường') ||
    lowerMeaning.startsWith('kiến thức') ||
    lowerMeaning.includes('(n)')
  ) {
    candidatePool = NOUN_TEMPLATES;
  } else {
    // Luân phiên các nhóm template theo chỉ số index để mỗi từ là 1 câu khác nhau
    const pools = [NOUN_TEMPLATES, ADJECTIVE_TEMPLATES, GENERAL_TEMPLATES, VERB_TEMPLATES];
    candidatePool = pools[index % pools.length];
  }

  // Chọn template theo index để không bị trùng lặp giữa các từ trong cùng một danh sách
  const templateIdx = (index + cleanWord.length) % candidatePool.length;
  const template = candidatePool[templateIdx];

  const fullSentence = template.englishPattern(cleanWord);
  const sentenceWithBlank = template.englishPattern('___');
  const translation = template.vietnamesePattern(cleanMeaning);

  return {
    sentenceWithBlank,
    fullSentence,
    translation
  };
}
