// 代號與訊息的檢查規則。前端先擋;階段二 Supabase 的資料表還有第二道一樣的規則。

import { MESSAGE_MAX, NICKNAME_MAX } from '../types';

// 控制字元:會讓畫面怪怪的,也沒有人需要
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// 文字方向控制字元、零寬字元:可以拿來假冒別人的代號或把畫面弄亂
const INVISIBLE_CHARS = /[​-‏‪-‮⁠⁦-⁩﻿]/g;

/** 字數(emoji 算一個字,不是兩個) */
export function charLength(text: string): number {
  return Array.from(text).length;
}

/** 超過上限的部分直接截掉,以「字」為單位 */
export function clampChars(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('') : text;
}

/** 比對代號是否相同時用:不分大小寫、去掉前後空白 */
export function nicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export type NicknameCheck = { ok: true; value: string } | { ok: false; error: 'NICKNAME_INVALID' };

export function validateNickname(raw: string): NicknameCheck {
  const value = raw.replace(CONTROL_CHARS, '').replace(INVISIBLE_CHARS, '').trim();
  const length = charLength(value);
  if (length < 1 || length > NICKNAME_MAX) return { ok: false, error: 'NICKNAME_INVALID' };
  return { ok: true, value };
}

export type MessageCheck =
  | { ok: true; value: string }
  | { ok: false; error: 'EMPTY' | 'TOO_LONG' };

export function validateMessage(raw: string): MessageCheck {
  const value = raw.replace(CONTROL_CHARS, '').replace(INVISIBLE_CHARS, '').trim();
  if (value.length === 0) return { ok: false, error: 'EMPTY' };
  if (charLength(value) > MESSAGE_MAX) return { ok: false, error: 'TOO_LONG' };
  return { ok: true, value };
}
