const SESSION_KEY = 'imposter_session_id';
const NICKNAME_KEY = 'imposter_nickname';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name);
}
