/**
 * 將字串轉換為網址友善格式 (Slug)，未包含空值檢查。
 */
export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\s\d]/gu, "-")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 將字串轉換為網址友善格式 (Slug)，包含空值安全檢查，防止程式崩潰。
 */
export function simpleSlugify(str: string): string {
  if (!str) return "";

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\s\d]/gu, "-")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 判斷是否為 HTTP(S) 連結（包含協議相對的 //example.com）
 */
export function isHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  const str = String(url).trim();
  // 快速判斷 http/https 或協議相對 URL
  if (/^(https?:\/\/|\/\/)/i.test(str)) return true;
  // 使用 URL 嘗試解析（對純相對路徑與錨點會拋錯）
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 移除 URL 字符串末尾的單個斜線 (/)
 * @param url 待處理的 URL
 * @returns 移除尾部斜線後的 URL 字符串
 */
export function removeTrailingSlash(url: string | null | undefined): string {
  // 如果輸入是 null, undefined, 或不是字符串，則返回空字符串
  if (!url || typeof url !== "string") {
    return "";
  }
  return url.replace(/\/+$/, "");
}
