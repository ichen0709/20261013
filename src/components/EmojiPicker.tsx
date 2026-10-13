const EMOJIS: { char: string; label: string }[] = [
  { char: '😀', label: '笑臉' },
  { char: '😂', label: '笑到流淚' },
  { char: '🙂', label: '微笑' },
  { char: '😍', label: '愛心眼' },
  { char: '😎', label: '酷' },
  { char: '🤔', label: '思考' },
  { char: '😭', label: '哭泣' },
  { char: '😡', label: '生氣' },
  { char: '👍', label: '讚' },
  { char: '👋', label: '揮手' },
  { char: '👏', label: '拍手' },
  { char: '🙏', label: '合掌' },
  { char: '💪', label: '肌肉' },
  { char: '❤️', label: '愛心' },
  { char: '🔥', label: '火' },
  { char: '🎉', label: '慶祝' },
  { char: '⭐', label: '星星' },
  { char: '☀️', label: '太陽' },
  { char: '☔', label: '雨傘' },
  { char: '🌙', label: '月亮' },
  { char: '🍲', label: '火鍋' },
  { char: '☕', label: '咖啡' },
  { char: '🐱', label: '貓' },
  { char: '😴', label: '睡覺' },
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="emoji" role="group" aria-label="emoji 選單">
      <div className="cap">常用</div>
      <div className="grid">
        {EMOJIS.map((e) => (
          <button key={e.char} type="button" aria-label={e.label} onClick={() => onPick(e.char)}>
            {e.char}
          </button>
        ))}
      </div>
    </div>
  );
}
