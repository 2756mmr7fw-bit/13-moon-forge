const USER_ID_KEY = "13moonforge_user_id";

/**
 * Gets or creates a persistent anonymous user ID stored in localStorage.
 * This identifies the user for Moon subscription checks until full auth is added.
 */
export function getUserId(): string {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = `user-${crypto.randomUUID()}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return `user-${Math.random().toString(36).slice(2)}`;
  }
}
