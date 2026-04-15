/**
 * Newsletter email template 的多語 UI 字串。
 *
 * 依訂閱者 `language` 選擇對應 map；找不到時 fallback 到 `zh-TW`。
 * 新增語言時在本檔案補上 key 即可，template 端無需改動。
 */

export interface NewsletterUiStrings {
  readMore: string;
  unsubscribe: string;
  unsubscribeDescription: string;
  footerTagline: string;
}

const UI_STRINGS: Record<string, NewsletterUiStrings> = {
  "zh-TW": {
    readMore: "閱讀全文 →",
    unsubscribe: "取消訂閱",
    unsubscribeDescription: "不想再收到此電子報？",
    footerTagline: "感謝訂閱我們的電子報。",
  },
  "zh-CN": {
    readMore: "阅读全文 →",
    unsubscribe: "取消订阅",
    unsubscribeDescription: "不想再收到此电子报？",
    footerTagline: "感谢订阅我们的电子报。",
  },
  en: {
    readMore: "Read more →",
    unsubscribe: "Unsubscribe",
    unsubscribeDescription: "Don't want to receive these emails?",
    footerTagline: "Thanks for subscribing to our newsletter.",
  },
  ja: {
    readMore: "続きを読む →",
    unsubscribe: "配信停止",
    unsubscribeDescription: "このメールマガジンの配信を停止しますか?",
    footerTagline: "メールマガジンをご購読いただきありがとうございます。",
  },
};

const FALLBACK_LANG = "zh-TW";

export function getNewsletterUiStrings(language: string): NewsletterUiStrings {
  return UI_STRINGS[language] ?? UI_STRINGS[FALLBACK_LANG];
}

export function getSupportedNewsletterLanguages(): string[] {
  return Object.keys(UI_STRINGS);
}
