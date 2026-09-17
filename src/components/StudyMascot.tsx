import React, { useState } from 'react';
import { Mascot } from 'page-mascot';
import { getMascotDirectionsUri, getMascotReactionsUri, MASCOT_LIST } from '../utils/mascotSprites';
import { soundManager } from '../utils/audio';
import { MascotType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StudyMascotProps {
  size?: number;
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  interactivePoke?: boolean;
  mascot?: MascotType;
}

export const StudyMascot: React.FC<StudyMascotProps> = ({
  size = 64,
  className = '',
  showTooltip = false,
  tooltipText,
  interactivePoke = true,
  mascot: propMascot
}) => {
  const { settings } = useTheme();
  const currentMascot = propMascot || settings.mascotType || 'osananajimi';
  const mascotInfo = MASCOT_LIST.find(m => m.id === currentMascot) || MASCOT_LIST[0];

  const [pokeCount, setPokeCount] = useState<number>(0);
  const [activeMessage, setActiveMessage] = useState<string>(
    tooltipText || `Chào bạn! Tớ là ${mascotInfo.name} ${mascotInfo.emoji}`
  );
  const [showMessage, setShowMessage] = useState<boolean>(false);

  const getMascotMessages = (mId: MascotType) => {
    switch (mId) {
      // ===== ANIME DẠNG NGƯỜI =====
      case 'osananajimi':
        return [
          'Dậy học bài nhanh lên, đồ ngốc này! 👧',
          'Tớ làm bento với ghi chú cho cậu rồi nè~ ✨',
          'Đừng có lười nữa, tớ giận thật đấy! 💢',
          'Cố lên nha, thi xong tớ bao đi ăn kem! 🍦',
        ];
      case 'student_boy':
        return [
          'Bro! Cùng nhau cày nát đề thi nào! 👦',
          'Câu này dễ ợt, để tớ chỉ cho nè! ⚡',
          'Đừng bỏ cuộc giữa chừng chứ chiến hữu! 🚀',
          'Cày xong đi làm ván game xả stress nha! 🎮',
        ];
      case 'tsundere':
        return [
          'Hừ! Không phải tớ cố ý nhắc bài cho cậu đâu nhé! 👱‍♀️',
          'Làm sai câu ngớ ngẩn thế hả... Baka! 💢',
          'Tớ... tớ chỉ tiện tay lật trang vở thôi đấy! ⁄(⁄ ⁄•⁄-⁄•⁄ ⁄)⁄',
          'Nếu cậu đạt điểm 10 thì... tớ khen một câu cũng được! 😤',
        ];
      case 'kuudere':
        return [
          '...Tập trung. ❄️',
          'Đề thi này không khó nếu tư duy logic. 📄',
          '...Làm tốt lắm. Giữ vững nhịp độ này. 🧊',
          'Đừng phân tâm bởi những thứ xung quanh. 🎧',
        ];
      case 'headmaster':
        return [
          'Kỷ luật thép là chìa khóa của học vấn đỉnh cao. 👨‍🏫',
          'Tôi kỳ vọng rất lớn vào sự bứt phá của em hôm nay. 📘',
          'Hãy chứng minh bằng kết quả điểm số thực tế. 🖋️',
          'Rất tốt. Sự nỗ lực không bao giờ phản bội em. 🌟',
        ];
      case 'young_ceo':
        return [
          'Thời gian là tài sản quý giá nhất, tối ưu hiệu suất ngay. 👔',
          'Đầu tư vào kiến thức luôn sinh lợi nhuận cao nhất. 📈',
          'Kế hoạch hành động rõ ràng, giải quyết dứt điểm mục tiêu! 💼',
          'Xuất sắc. Hiệu quả công việc này đáng giá triệu đô. 💰',
        ];
      case 'oneesan':
        return [
          'Ara ara~ Em làm bài chăm chỉ thế này chị thương lắm nha! 👩‍💼',
          'Chỗ nào chưa hiểu cứ hỏi chị, đừng ngại nhé cưng~ 🌸',
          'Ngoan lắm! Học xong chị xoa đầu thưởng cho nè! 💕',
          'Cố lên nào em trai/em gái ngoan của chị! ✨',
        ];
      case 'imouto':
        return [
          'Onii-chan/Onee-chan học giỏi quá đi à! 👧',
          'Giải xong bài này dẫn em đi mua truyện tranh nha~ 🍓',
          'Đừng lười nha, em sẽ mách mẹ đó lêu lêu! 😜',
          'Cố lên nàooo, em luôn cổ vũ cho người giỏi nhất! 💖',
        ];
      case 'idol':
        return [
          'Kira kira~! Bắn tim tiếp 1000% năng lượng học tập! 🎤✨',
          'Fanclub của bạn đang chờ đón bảng điểm tuyệt đối đó! 💖',
          'Một, hai, ba... Cố lên! Bạn là ngôi sao sáng nhất! 🌟',
          'Yayyy! Xuất sắc tuyệt vời luôn idol ơi! 🎵',
        ];
      case 'maid':
        return [
          'Goshujin-sama, trà ấm và bài học đã sẵn sàng ạ. 🎀',
          'Em xin phép đồng hành cùng sự tiến bộ của chủ nhân. ☕',
          'Ngài đã làm việc rất vất vả rồi ạ, xin giữ gìn sức khỏe! 🌸',
          'Thật vinh hạnh khi được chứng kiến ngài thành công! ✨',
        ];
      case 'detective':
        return [
          'Chân tướng của câu trả lời chính xác chỉ có một! 🔍',
          'Mọi manh mối ngữ pháp đều dẫn về đáp án này. 🕵️‍♂️',
          'Loại trừ những đáp án sai, sự thật sẽ lộ diện! 💡',
          'Suy luận sắc bén lắm, đúng chuẩn thám tử tài ba! 🎯',
        ];
      case 'dj_girl':
        return [
          'Drop the beat! Bật mode tập trung max volume! 🎧⚡',
          'Nhịp điệu học tập đang cực kỳ mượt mà! Quẩy tiếp! 🎶',
          'Đừng để tụt mood, giải sạch đề thi nào! 💥',
          'Bản phối điểm số này chuẩn bị leo top 1 bảng xếp hạng! 🚀',
        ];
      case 'streamer':
        return [
          'Hello cả nhà iu! Hôm nay chúng ta live stream cày top 1! 📺',
          'Mọi người thả tim cho bạn học bá này đi nàooo! 💜',
          'Donate cho bạn một tràng pháo tay vì câu trả lời đúng! 👏',
          'Nhớ bấm follow sự chăm chỉ của bản thân mỗi ngày nha! ✨',
        ];
      case 'yandere':
        return [
          'Cậu chỉ được học với một mình tớ thôi... Nhớ chưa? 🔪❤️',
          'Nếu cậu nhìn đứa khác... tớ sẽ xé nát đề thi của họ! 🩸',
          'Chỉ cần cậu chăm chỉ bên tớ, tớ sẽ bảo vệ cậu mãi mãi... 🌹',
          'Điểm 10 này thuộc về hai chúng ta... MÃI MÃI! 🖤',
        ];
      case 'gamer':
        return [
          'Coi câu hỏi này như Boss cuối, combo dứt điểm ngay! 🎮⚡',
          'Farm điểm kinh nghiệm, chuẩn bị thăng cấp Học Bá! 🗡️',
          'Đừng feed điểm cho câu hỏi bẫy nha chiến hữu! 🛡️',
          'GG WP! Trận đấu kiến thức này ta đã thắng áp đảo! 🏆',
        ];
      case 'ninja':
        return [
          'Xuất quỷ nhập thần, giải bài trong chớp mắt. 🥷',
          'Nhẫn giả không bao giờ dao động trước nghịch cảnh. 🗡️',
          'Tốc chiến tốc thắng, không để lại bất kỳ lỗi sai nào. 🌪️',
          'Nhiệm vụ hoàn thành xuất sắc trong bóng đêm. 🍃',
        ];
      case 'mage':
        return [
          'Khai mở ma pháp ngôn từ, giải mã bí thuật tri thức! 🧙‍♂️🔮',
          'Mana đang tràn đầy, thi triển câu thần chú trả lời đúng! ⚡',
          'Cuốn cổ thư này đã được giải mã trọn vẹn! 📖✨',
          'Sức mạnh pháp thuật học vấn của ngươi thật đáng nể! 🌟',
        ];
      case 'princess':
        return [
          'Sự chăm chỉ của bạn thật trang nhã và đáng ngưỡng mộ! 👑🌸',
          'Vương quốc tri thức luôn chào đón những người kiên trì. 💖',
          'Hãy giữ phong thái cao quý và tự tin tiến bước nhé! ✨',
          'Thật tuyệt mỹ! Bạn xứng đáng nhận vương miện danh dự! 💎',
        ];
      case 'knight':
        return [
          'Thề lấy kiếm và khiên bảo vệ học trò vượt qua kỳ thi! 🛡️⚔️',
          'Danh dự của hiệp sĩ không cho phép ta đầu hàng! ⚜️',
          'Tiến lên! Phá vỡ mọi chướng ngại vật trong bài thi! 🏰',
          'Chiến công hiển hách! Bạn là chiến binh dũng cảm nhất! 🏆',
        ];
      case 'vampire':
        return [
          'Máu của kẻ lười biếng rất đắng... Hãy học tử tế đi! 🧛🍷',
          'Đêm nay ta sẽ cùng ngươi chinh phục mọi cổ ngữ. 🌙',
          'Ngươi có trí tuệ sắc bén đấy, phàm nhân thú vị... 🩸',
          'Bất tử trong tri thức, đó là đặc ân lớn nhất. 🦇',
        ];
      case 'demon_lord':
        return [
          'Lũ phàm nhân kia! Dám lười biếng ta sẽ thiêu rụi! 😈🔥',
          'Sức mạnh tri thức tối thượng này... quả không tồi! ⚔️',
          'Kẻ chiến thắng đề thi này mới xứng đáng đứng cạnh ta! 👑',
          'Ha ha ha! Tiếp tục bành trướng quyền lực học vấn đi! ⚡',
        ];
      case 'chuuni':
        return [
          'Cánh tay phải ta đang phong ấn sức mạnh hắc ám... ⚡',
          'Đừng để Tà Nhãn thức tỉnh trước những câu hỏi tầm thường này! 👁️',
          'Ma giới đang rung chuyển trước chuỗi trả lời đúng của ta! 🌌',
          'Khế ước tri thức cổ xưa đã hoàn toàn kích hoạt! 🩸',
        ];

      // ===== THẦN THOẠI & HUYỀN ẢO =====
      case 'slime':
        return [
          'Bé Slime núng nính chúc bạn học vui vẻ! 💧✨',
          'Poyo poyo! Nạp thêm kiến thức tròn vo nè! 🫧',
          'Trơn tru như slime, vượt qua mọi câu hỏi khó! 👑',
          'Đáng yêu chưa nè! Thưởng bạn một huy hiệu nước! 🌊',
        ];
      case 'ghost':
        return [
          'Boo! Tớ là hồn ma cute nhắc bạn không được lười! 👻',
          'Bay lơ lửng canh chừng bạn làm bài nè~ 🔮',
          'Làm đúng hết rồi kìa, không dọa được bạn nữa rồi! ✨',
          'Hi hi! Tớ phù phép cho bạn may mắn điểm cao nha! 💜',
        ];
      case 'dragon':
        return [
          'Khí chất đế vương không cho phép ngươi bỏ cuộc! 🐲👑',
          'Hừm! Uy nghi lên, làm bài thật chuẩn xác vào! 🔥',
          'Bản vương ban tặng ngươi điểm số tối đa! 🌟',
          'Bá khí ngút trời, tiếp tục thống lĩnh bảng vàng! ⚔️',
        ];
      case 'robot':
        return [
          'Beep boop! Thuật toán AI đã tối ưu hóa trí nhớ! 🤖⚡',
          'Độ chính xác dữ liệu đạt mức 99.99%! 🚀',
          'Kích hoạt bộ xử lý siêu tốc cho bài tập tiếp theo! 🧠',
          'Nâng cấp hệ thống thành công! Điểm 10 trong tầm tay! 🔋',
        ];

      // ===== LINH VẬT ĐỘNG VẬT ĐỘC BẢN =====
      case 'owl':
        return [
          'Cú Học Giả kính cẩn đồng hành cùng bạn! 🦉📚',
          'Nhớ ghi chép lại các lỗi sai vào sổ tay nha! 💡',
          'Tập trung cao độ, đêm khuya hay ngày sáng đều tinh anh! 🌙',
          'Kiến thức là ngọn hải đăng soi sáng tương lai! 🌟',
        ];
      case 'cat':
        return [
          'Meow! Mèo cam chăm chỉ ghi chép từng bài học! 🐱🐾',
          'Boop chuông vàng lấy may mắn làm bài chuẩn xác nào! ✨',
          'Ngoan ngoãn làm xong bài rồi ta cùng ngủ trưa nha! 💤',
          'Meo meo! Đỉnh quá đi, xứng đáng được thưởng cá hộp! 🐟',
        ];
      case 'fox':
        return [
          'Cáo lanh lợi đã nhìn thấu quy luật bài toán! 🦊👓',
          'Phân tích kỹ đề bài, không để dính bẫy ngớ ngẩn nhé! 🎯',
          'Trí tuệ sắc bén như ánh trăng rằm! 🍂',
          'Chuẩn không cần chỉnh! Cứ thế mà phát huy! 💡',
        ];
      case 'bear':
        return [
          'Gấu mũ beret luôn đồng hành kiên trì cùng bạn! 🐻🎨',
          'Chậm mà chắc, từng bước xây dựng nền tảng vững vàng! 🍯',
          'Uống ngụm trà mật ong rồi cùng giải tiếp nha bạn hiền! 🍵',
          'Bạn đang tiến bộ vượt bậc từng ngày đó! 🌟',
        ];
      case 'bunny':
        return [
          'Thỏ trắng tai dài phản xạ nhanh như chớp! 🐰⚡',
          'Nhanh tay lẹ mắt, điểm tối đa về tay ta! 🥕',
          'Nhún nhảy tiến thẳng về vạch đích điểm 10! 🌸',
          'Yayyy! Xuất sắc lắm bạn thỏ ơi! 🎈',
        ];
      case 'shiba':
        return [
          'Gâu gâu! Shiba vàng tràn trề năng lượng tích cực! 🐕💛',
          'Cười tươi lên nào, học tập là niềm vui mà! 🎾',
          'Đỉnh chóp luôn bro! Tớ tự hào về bạn lắm! 🌟',
          'Nỗ lực hết mình, không gì có thể cản bước bạn! 🐾',
        ];
      case 'penguin':
        return [
          'Cánh cụt vùng băng giá giữ vững kỷ luật thép! 🐧❄️',
          'Bão tuyết cũng không ngăn được tinh thần hiếu học! 🏔️',
          'Từng bước kiên định trên con đường thành công! 🎖️',
          'Tuyệt đối chuẩn mực và xuất chúng! 🏆',
        ];
      case 'wolf':
        return [
          'Sói xám chỉ hành động khi nắm chắc phần thắng. 🐺❄️',
          'Tập trung, quyết đoán, không có chỗ cho sự phân tâm. 💼',
          'Kết quả này hoàn toàn nằm trong tính toán của tôi. 📊',
          'Giữ vững phong độ thủ lĩnh này. 🎯',
        ];
      case 'swan':
        return [
          'Nữ hoàng thiên nga ban phước lành thanh cao! 🦢💜',
          'Nét chữ và tư duy của bạn thật trang nhã tuyệt vời! ✨',
          'Hội đồng học thuật tự hào về sự bứt phá của bạn! 👑',
          'Tỏa sáng rực rỡ như viên ngọc quý! 💎',
        ];
      case 'lion':
        return [
          'Sư tử bờm vàng gầm vang bản lĩnh người dẫn đầu! 🦁🔥',
          'Thủ lĩnh là người dám đương đầu với những đề bài hóc búa nhất! 🏆',
          'Bá khí uy dũng, không một bài toán nào làm khó được bạn! ⚡',
          'Chiến thắng này thuộc về người kiên định nhất! 🥇',
        ];
      case 'deer':
        return [
          'Hươu sừng pha lê soi rọi sự thông tuệ tĩnh tại. 🦌🌿',
          'Tâm an trí sáng, mọi điều phức tạp đều trở nên giản đơn. 🔮',
          'Phong thái danh gia vọng tộc đầy tự tin! 🍃',
          'Xuất sắc, trực giác của bạn rất chuẩn xác! ✨',
        ];
      case 'panther':
        return [
          'Hắc báo ẩn thân, ra đòn chính xác trong tích tắc. 🐆🌙',
          'Nhanh, gọn, chuẩn xác từng câu hỏi. 🎯',
          '...Làm tốt lắm. Tiếp tục. ⚡',
          'Tốc độ và sự tập trung đỉnh cao. 🖤',
        ];
      case 'villain':
        return [
          'Quạ đen hắc ám cười khẩy trên những câu hỏi bẫy! 🦅🔮',
          'Tà mị và sắc sảo, không ai lừa được bạn đâu! 😈',
          'Bóng đêm trí tuệ đã nuốt chửng mọi lỗi sai! 🌌',
          'Hắc ám lực lượng chúc mừng chiến thắng của bạn! 💜',
        ];
      case 'memegirl':
        return [
          'Ếch Meme Pepe: Cười ẻ với độ bá đạo của bạn! 🐸🔥',
          'Bắn meme chúc mừng bạn học bá điểm 10! 🚀',
          'Đề thi này tuổi tôm, quẩy nát không trượt phát nào! 🧢',
          'EZ game! Meme Queen ban tặng bạn 1000 like! 💅',
        ];
      case 'chaotic':
        return [
          'Khỉ siêu quậy phá cách bùng nổ năng lượng! 🐵💥',
          'Học là phải vui, quẩy hết mình bung hết sức! 🍌',
          'Nghĩ khác biệt, làm bài theo cách đỉnh nhất! ⚡',
          'Haha chất chơi người dơi quá bạn ơiii! 🎸',
        ];
      case 'classmate':
        return [
          'Bé Hamster nhút nhát... tặng bạn nhánh cỏ may mắn nè! 🐹🍀',
          'C-cậu học giỏi quá... Cho tớ học chung với nha! ⁄(⁄ ⁄•⁄-⁄•⁄ ⁄)⁄',
          'Ôm hạt hướng dương cổ vũ bạn hết mình luôn! 🌻',
          'Cố lên nha, tớ luôn ngồi bàn bên cạnh ủng hộ cậu! 💕',
        ];

      default:
        return [
          'Học tập chăm chỉ nhé bạn ơi! ✨',
          'Boop! Cố lên bạn nhỏ! 🌟',
          'Nhớ ôn lại bài trong Sổ Tay nha! 📖',
          'Cố lên, điểm 10 thẳng tiến! 🏆',
        ];
    }
  };

  const handlePoke = () => {
    if (interactivePoke) {
      soundManager.playMascotPoke();
    }
    const msgs = getMascotMessages(currentMascot);
    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);
    setActiveMessage(msgs[nextCount % msgs.length]);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 3200);
  };

  const directionsUri = getMascotDirectionsUri(currentMascot);
  const reactionsUri = getMascotReactionsUri(currentMascot);

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      onMouseDown={handlePoke}
    >
      {/* Interactive Mascot powered by page-mascot */}
      <div 
        className="transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        title={`${mascotInfo.name} - Rê chuột để nhìn theo, nhấn để chọc!`}
      >
        <Mascot
          directions={directionsUri}
          reactions={reactionsUri}
          size={size}
          label={`Linh vật ${mascotInfo.name}`}
        />
      </div>

      {/* Floating speech bubble when poked */}
      {(showTooltip || showMessage) && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-2xl bg-slate-900/95 text-white text-[11.5px] font-medium whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in duration-200 z-50 flex items-center gap-1.5 backdrop-blur-sm">
          <span>{activeMessage}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 border-r border-b border-slate-700 rotate-45"></div>
        </div>
      )}
    </div>
  );
};
