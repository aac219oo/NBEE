import { render } from "@react-email/components";
import NewsletterEmail from "@heiso/core/emails/newsletter";
import type { NewsletterSenderSetting } from "@heiso/core/types/newsletter";

/**
 * 文章內容子集（給 render 使用）。呼叫端從 `articlePosts` 挑相關欄位即可。
 */
export interface NewsletterArticleContent {
  slug: string;
  /** 文章預設（頂層）title */
  title: string | null;
  /** 文章預設 seoDescription（會作為 excerpt 來源）*/
  seoDescription: string | null;
  /** 文章預設封面圖 */
  featuredImage: string | null;
  /** i18n 多語內容，結構如 { "en": { title, seoDescription, featuredImage }, ... } */
  i18n?: Record<string, Partial<ArticleI18nEntry>> | null;
}

export interface ArticleI18nEntry {
  title: string;
  seoDescription: string;
  featuredImage: string;
  excerpt: string;
}

export interface NewsletterSubscriberContext {
  email: string;
  language: string;
  unsubscribeToken: string;
}

export interface BrandContext {
  name: string;
  logoUrl: string;
  companyAddress: string;
  /**
   * 前台文章頁的 base URL（已含 tenant domain）。
   * 組成最終 articleUrl = `${baseUrl}/${language}/articles/${slug}`
   */
  baseUrl: string;
  /** Unsubscribe 頁的 base URL（通常 = `${baseUrl}/unsubscribe`）。 */
  unsubscribeBaseUrl: string;
}

export interface RenderNewsletterOptions {
  article: NewsletterArticleContent;
  subscriber: NewsletterSubscriberContext;
  brand: BrandContext;
  /** 當次寄送要用的 subject / preview text（呼叫端已按語言挑好）。 */
  subject: string;
  previewText: string;
  /** Sender 設定（目前未直接用於 template，保留給未來需要時）。 */
  sender?: NewsletterSenderSetting;
}

export interface RenderedNewsletter {
  html: string;
  /**
   * 當次實際使用的語言（= subscriber.language）。
   * 本函式**不做 fallback**：呼叫端必須先確認 `article.i18n[language]` 存在；
   * 否則應在寄送流程排除該訂閱者（嚴格模式 B.1）。
   */
  language: string;
  /**
   * 用於 List-Unsubscribe header 的 URL（個人化 token）。
   */
  unsubscribeUrl: string;
  /**
   * 閱讀全文連結。
   */
  articleUrl: string;
}

/**
 * 依訂閱者語言渲染 Newsletter HTML。
 *
 * 多語處理規則（嚴格模式 B.1）：
 * - 本函式要求呼叫端確保 `article.i18n[subscriber.language]` 存在；找不到時拋錯
 * - 唯一例外：若 `language` 等於 "頂層視為預設語言" 的情境由呼叫端決定，直接傳頂層欄位即可
 *
 * 呼叫端責任：
 * 1. 按 `subscribers.language` 分組
 * 2. 對每個 group 檢查 `article.i18n[lang]` 存在性（或頂層 fallback 規則）
 * 3. 存在才調用此函式渲染
 * 4. 不存在的 group 直接排除（不寄）
 */
export async function renderNewsletterEmail(
  options: RenderNewsletterOptions,
): Promise<RenderedNewsletter> {
  const { article, subscriber, brand, subject, previewText } = options;

  const content = resolveArticleContent(article, subscriber.language);
  if (!content) {
    throw new Error(
      `renderNewsletterEmail: article has no content for language='${subscriber.language}' and no top-level fallback; caller should have excluded this subscriber`,
    );
  }

  const articleUrl = buildArticleUrl(brand.baseUrl, subscriber.language, article.slug);
  const unsubscribeUrl = buildUnsubscribeUrl(
    brand.unsubscribeBaseUrl,
    subscriber.unsubscribeToken,
  );

  const html = await render(
    NewsletterEmail({
      language: subscriber.language,
      articleTitle: content.title,
      articleExcerpt: content.excerpt,
      articleCoverImage: content.featuredImage,
      articleUrl,
      previewText,
      unsubscribeUrl,
      brandName: brand.name,
      brandLogoUrl: brand.logoUrl,
      companyAddress: brand.companyAddress,
    }),
  );

  return {
    html,
    language: subscriber.language,
    unsubscribeUrl,
    articleUrl,
  };
}

/**
 * 依語言取文章內容。
 *
 * - 若 `article.i18n[language]` 存在 → 用該語言版本（title / seoDescription / featuredImage）
 * - 否則若是「預設語言」（呼叫端應於外層判斷；此函式退而求其次看頂層是否有 title）
 *   → 用頂層欄位
 * - 都無則 return null
 *
 * 嚴格模式下呼叫端應該在此函式返回 null 時**不寄給該訂閱者**。
 */
function resolveArticleContent(
  article: NewsletterArticleContent,
  language: string,
): ResolvedContent | null {
  const i18nEntry = article.i18n?.[language];
  if (i18nEntry && i18nEntry.title) {
    return {
      title: i18nEntry.title,
      excerpt: i18nEntry.excerpt ?? i18nEntry.seoDescription ?? "",
      featuredImage: i18nEntry.featuredImage ?? article.featuredImage ?? null,
    };
  }

  // 頂層 fallback（僅當呼叫端認為 language 對應頂層時才有效，否則此 branch 應被上游排除）
  if (article.title) {
    return {
      title: article.title,
      excerpt: article.seoDescription ?? "",
      featuredImage: article.featuredImage,
    };
  }

  return null;
}

interface ResolvedContent {
  title: string;
  excerpt: string;
  featuredImage: string | null;
}

function buildArticleUrl(baseUrl: string, language: string, slug: string): string {
  const trimmedBase = baseUrl.replace(/\/$/, "");
  return `${trimmedBase}/${language}/articles/${slug}`;
}

function buildUnsubscribeUrl(baseUrl: string, token: string): string {
  const trimmedBase = baseUrl.replace(/\/$/, "");
  return `${trimmedBase}?t=${encodeURIComponent(token)}`;
}
