// 瀏覽器的 localStorage 在無痕視窗或被封鎖時會丟錯,所以每次讀寫都包起來,失敗就當作沒有。

const NICKNAME_KEY = 'anon-chat:nickname';

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // 存不了就算了,下次重新輸入
  }
}
