// 階段一的假聊天服務。
//
// 做法:同一個瀏覽器的不同分頁,用 BroadcastChannel(分頁之間互相傳話的內建功能)交換
// 「我在線上」「我離開了」「我說了一句話」。歷史訊息存在 localStorage。
// 所以:開兩個分頁就能互相聊天;但手機和電腦之間彼此看不到,這要等階段二。
//
// 這個檔案要盡量模仿真的行為(延遲、重名失敗、斷線),讓畫面在階段一就把這些情況處理好。

import { CATCHUP_LIMIT, HISTORY_LIMIT } from '../types';
import type { ConnectionStatus, JoinResult, Member, Message, SendResult } from '../types';
import { nicknameKey, validateMessage, validateNickname } from '../lib/validation';
import { Emitter } from './emitter';
import type { ChatEventMap, ChatService } from './ChatService';

const CHANNEL_NAME = 'anon-chat-mock';
const STORE_KEY = 'anon-chat-mock:messages';
const HEARTBEAT_MS = 2000;
const PEER_TTL_MS = 6500;
const NETWORK_DELAY_MS = 120;

interface Peer {
  nickname: string;
  joinedAt: string;
}
interface PeerRecord extends Peer {
  seenAt: number;
}

type Wire =
  | { t: 'who'; from: string }
  | { t: 'presence'; from: string; nickname: string; joinedAt: string }
  | { t: 'bye'; from: string }
  | { t: 'chat'; from: string; message: Message };

/** 只有開發用的開關,畫面的正式部分不會用到 */
export interface MockControls {
  setOffline(offline: boolean): void;
  isOffline(): boolean;
  setDemo(demo: boolean): void;
  isDemo(): boolean;
}

const BOT_NAMES = ['小明', '阿柏', '夜貓', 'Momo', '🐙章魚', '小草', 'Kai'];
const BOT_LINES = [
  '晚安各位 👋',
  '今天好冷,你們那邊有下雨嗎?',
  '這種天氣最適合窩在家裡吃火鍋',
  '+1 🍲',
  '哈哈哈哈哈',
  '有人要一起打遊戲嗎?',
  '剛下班,終於可以躺平了',
  '推薦一首歌:最近一直單曲循環 🎧',
  '明天又要上班了……',
  '我也是!',
  '晚餐吃什麼好',
  '好睏喔 😴',
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function makeId(): string {
  // crypto.randomUUID 只在 https 或 localhost 能用;用區域網路的 http 網址測試時要有備案
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStored(): Message[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (m): m is Message =>
        !!m &&
        typeof m.id === 'string' &&
        typeof m.nickname === 'string' &&
        typeof m.content === 'string' &&
        typeof m.createdAt === 'string',
    );
  } catch {
    return [];
  }
}

function appendStored(message: Message): void {
  try {
    const all = readStored();
    all.push(message);
    localStorage.setItem(STORE_KEY, JSON.stringify(all.slice(-CATCHUP_LIMIT)));
  } catch {
    // 存不了(例如無痕視窗)就只留在記憶體裡的即時傳遞
  }
}

export class MockChatService implements ChatService, MockControls {
  private readonly clientId = makeId();
  private readonly events = new Emitter<ChatEventMap>();
  private readonly channel: BroadcastChannel | null;
  private readonly peers = new Map<string, PeerRecord>();
  private readonly bots = new Map<string, Peer>();
  private readonly countWatchers = new Set<(count: number) => void>();

  private nickname: string | null = null;
  private joinedAt = '';
  private joined = false;
  private offline = false;
  private demo = false;
  private lastSeenAt = '';
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private botTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: { demo?: boolean } = {}) {
    try {
      this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
    } catch {
      this.channel = null;
    }
    if (this.channel) this.channel.onmessage = (e: MessageEvent<Wire>) => this.onWire(e.data);
    setInterval(() => this.sweep(), 1000);
    this.post({ t: 'who', from: this.clientId });
    if (options.demo) this.setDemo(true);
  }

  // ───────── ChatService ─────────

  on<K extends keyof ChatEventMap>(event: K, handler: ChatEventMap[K]): () => void {
    return this.events.on(event, handler);
  }

  watchOnlineCount(callback: (count: number) => void): () => void {
    this.countWatchers.add(callback);
    this.post({ t: 'who', from: this.clientId });
    callback(this.count());
    return () => {
      this.countWatchers.delete(callback);
    };
  }

  async join(nickname: string): Promise<JoinResult> {
    const check = validateNickname(nickname);
    if (!check.ok) return { ok: false, error: 'NICKNAME_INVALID' };
    if (this.offline) return { ok: false, error: 'NETWORK_ERROR' };
    if (this.joined) this.leave();

    this.events.emit('status', 'connecting');
    const name = check.value;

    // 先問一圈「誰在線上」,看這個代號有沒有人用
    this.post({ t: 'who', from: this.clientId });
    await sleep(400);
    if (this.isTaken(name)) return { ok: false, error: 'NICKNAME_TAKEN' };

    // 登記上線。兩個人同時用同一個代號時,登記完再檢查一次,晚到的人退出
    this.nickname = name;
    this.joinedAt = new Date().toISOString();
    this.announce();
    await sleep(300);
    if (this.hasEarlierRival(name)) {
      this.post({ t: 'bye', from: this.clientId });
      this.nickname = null;
      return { ok: false, error: 'NICKNAME_TAKEN' };
    }

    this.joined = true;
    this.heartbeat = setInterval(() => {
      if (!this.offline) this.announce();
    }, HEARTBEAT_MS);

    const history = readStored().slice(-HISTORY_LIMIT);
    this.lastSeenAt = history.length ? history[history.length - 1].createdAt : new Date().toISOString();
    this.events.emit('history', history);
    this.emitMembers();
    this.events.emit('status', 'connected');
    this.emitCount();
    return { ok: true };
  }

  async sendMessage(content: string): Promise<SendResult> {
    if (!this.joined || this.offline || !this.nickname) return { ok: false, error: 'NOT_CONNECTED' };
    const check = validateMessage(content);
    if (!check.ok) return { ok: false, error: check.error };

    await sleep(NETWORK_DELAY_MS);
    if (this.offline) return { ok: false, error: 'NOT_CONNECTED' };
    this.deliver({
      id: makeId(),
      nickname: this.nickname,
      content: check.value,
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  leave(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    if (this.joined || this.nickname) this.post({ t: 'bye', from: this.clientId });
    this.joined = false;
    this.nickname = null;
    this.emitCount();
  }

  // ───────── 開發用開關 ─────────

  isOffline(): boolean {
    return this.offline;
  }

  setOffline(offline: boolean): void {
    if (offline === this.offline) return;
    this.offline = offline;
    if (offline) {
      if (this.joined) this.events.emit('status', 'reconnecting');
    } else {
      void this.resume();
    }
  }

  isDemo(): boolean {
    return this.demo;
  }

  /** 示範模式:出現幾個假使用者,他們會聊天、進出。一個人測試時用 */
  setDemo(demo: boolean): void {
    if (demo === this.demo) return;
    this.demo = demo;
    if (demo) {
      const mine = this.nickname ? nicknameKey(this.nickname) : '';
      BOT_NAMES.slice(0, 4)
        .filter((name) => nicknameKey(name) !== mine)
        .forEach((name, i) => {
          const joinedAt = new Date(Date.now() - (i + 1) * 60_000).toISOString();
          this.bots.set(name, { nickname: name, joinedAt });
        });
      this.scheduleBot();
    } else {
      if (this.botTimer) clearTimeout(this.botTimer);
      this.bots.clear();
    }
    this.afterPeersChanged();
  }

  // ───────── 內部:分頁之間的傳話 ─────────

  private post(wire: Wire): void {
    this.channel?.postMessage(wire);
  }

  private announce(): void {
    if (!this.nickname) return;
    this.post({ t: 'presence', from: this.clientId, nickname: this.nickname, joinedAt: this.joinedAt });
  }

  private onWire(wire: Wire): void {
    if (this.offline || wire.from === this.clientId) return;
    switch (wire.t) {
      case 'who':
        if (this.nickname) this.announce();
        break;
      case 'presence': {
        const known = this.peers.has(wire.from);
        this.peers.set(wire.from, { nickname: wire.nickname, joinedAt: wire.joinedAt, seenAt: Date.now() });
        if (!known) {
          if (this.joined) this.events.emit('notice', { kind: 'joined', nickname: wire.nickname, at: new Date().toISOString() });
          this.afterPeersChanged();
        }
        break;
      }
      case 'bye': {
        const peer = this.peers.get(wire.from);
        if (peer && this.peers.delete(wire.from)) {
          if (this.joined) this.events.emit('notice', { kind: 'left', nickname: peer.nickname, at: new Date().toISOString() });
          this.afterPeersChanged();
        }
        break;
      }
      case 'chat':
        if (this.joined) {
          this.lastSeenAt = wire.message.createdAt;
          this.events.emit('message', wire.message);
        }
        break;
    }
  }

  /** 太久沒有心跳的分頁,視為已經離開(例如直接被關掉) */
  private sweep(): void {
    if (this.offline) return;
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.peers) {
      if (now - peer.seenAt > PEER_TTL_MS) {
        this.peers.delete(id);
        changed = true;
        if (this.joined) this.events.emit('notice', { kind: 'left', nickname: peer.nickname, at: new Date().toISOString() });
      }
    }
    if (changed) this.afterPeersChanged();
  }

  // ───────── 內部:名單與代號 ─────────

  private members(): Member[] {
    const list: Member[] = [];
    if (this.joined && this.nickname) list.push({ nickname: this.nickname, joinedAt: this.joinedAt });
    for (const p of this.peers.values()) list.push({ nickname: p.nickname, joinedAt: p.joinedAt });
    for (const b of this.bots.values()) list.push({ nickname: b.nickname, joinedAt: b.joinedAt });
    return list.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }

  private count(): number {
    return this.peers.size + this.bots.size + (this.joined ? 1 : 0);
  }

  private emitMembers(): void {
    if (this.joined) this.events.emit('members', this.members());
  }

  private emitCount(): void {
    const n = this.count();
    this.countWatchers.forEach((cb) => cb(n));
  }

  private afterPeersChanged(): void {
    this.emitMembers();
    this.emitCount();
  }

  private isTaken(name: string): boolean {
    const key = nicknameKey(name);
    for (const p of this.peers.values()) if (nicknameKey(p.nickname) === key) return true;
    for (const b of this.bots.values()) if (nicknameKey(b.nickname) === key) return true;
    return false;
  }

  /** 有沒有別人用同一個代號,而且比我早到(同時到就比分頁編號,讓兩邊算出一樣的結果) */
  private hasEarlierRival(name: string): boolean {
    const key = nicknameKey(name);
    for (const [id, p] of this.peers) {
      if (nicknameKey(p.nickname) !== key) continue;
      if (p.joinedAt < this.joinedAt) return true;
      if (p.joinedAt === this.joinedAt && id < this.clientId) return true;
    }
    for (const b of this.bots.values()) if (nicknameKey(b.nickname) === key) return true;
    return false;
  }

  // ───────── 內部:訊息 ─────────

  /** 一則訊息成立:存起來、通知其他分頁、通知自己的畫面 */
  private deliver(message: Message): void {
    appendStored(message);
    this.post({ t: 'chat', from: this.clientId, message });
    this.lastSeenAt = message.createdAt;
    if (this.joined) this.events.emit('message', message);
  }

  // ───────── 內部:斷線後回來 ─────────

  private async resume(): Promise<void> {
    if (!this.joined || !this.nickname) return;
    await sleep(1200); // 模擬重新連線需要一點時間
    if (this.offline) return;

    // 斷線期間別人的進出我們都沒看到,重新問一次誰在線上
    this.peers.clear();
    this.post({ t: 'who', from: this.clientId });
    await sleep(500);
    if (this.offline) return;

    // 斷線太久,代號可能已經被別人拿走
    if (this.isTaken(this.nickname)) {
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = undefined;
      this.joined = false;
      this.nickname = null;
      this.emitCount();
      this.events.emit('evicted', 'NICKNAME_TAKEN');
      return;
    }

    this.announce();
    const missed = readStored()
      .filter((m) => m.createdAt > this.lastSeenAt)
      .slice(-CATCHUP_LIMIT);
    if (missed.length) this.lastSeenAt = missed[missed.length - 1].createdAt;
    this.events.emit('catchUp', missed);
    this.emitMembers();
    this.events.emit('status', 'connected' satisfies ConnectionStatus);
  }

  // ───────── 內部:示範模式的假使用者 ─────────

  private scheduleBot(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => this.runBot(), 2500 + Math.random() * 5500);
  }

  private runBot(): void {
    if (!this.demo) return;
    if (this.joined && !this.offline) {
      const present = [...this.bots.values()];
      const roll = Math.random();
      if (roll < 0.7 && present.length > 0) {
        const bot = present[Math.floor(Math.random() * present.length)];
        this.deliver({
          id: makeId(),
          nickname: bot.nickname,
          content: BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)],
          createdAt: new Date().toISOString(),
        });
      } else if (roll < 0.85 && present.length > 2) {
        const bot = present[Math.floor(Math.random() * present.length)];
        this.bots.delete(bot.nickname);
        this.events.emit('notice', { kind: 'left', nickname: bot.nickname, at: new Date().toISOString() });
        this.afterPeersChanged();
      } else {
        const away = BOT_NAMES.filter((n) => !this.bots.has(n) && !this.isTaken(n) && n !== this.nickname);
        if (away.length > 0) {
          const name = away[Math.floor(Math.random() * away.length)];
          this.bots.set(name, { nickname: name, joinedAt: new Date().toISOString() });
          this.events.emit('notice', { kind: 'joined', nickname: name, at: new Date().toISOString() });
          this.afterPeersChanged();
        }
      }
    }
    this.scheduleBot();
  }
}
