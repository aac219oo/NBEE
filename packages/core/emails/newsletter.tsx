import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import {
  getNewsletterUiStrings,
  type NewsletterUiStrings,
} from "./newsletter-ui-strings";

export interface NewsletterEmailProps {
  /** 訂閱者語言（BCP 47，如 zh-TW / en / ja）。決定 UI 字串與內容版本。 */
  language: string;
  /** 文章標題（已依語言取對應版本）。 */
  articleTitle: string;
  /** 文章摘要（2-3 段，已依語言取對應版本）。 */
  articleExcerpt: string;
  /** 封面圖絕對 URL（600x315）。 */
  articleCoverImage?: string | null;
  /** 閱讀全文連結（前台文章頁絕對 URL，已含 locale）。 */
  articleUrl: string;
  /** Preview text（在收件匣標題後顯示的預覽文字）。 */
  previewText: string;
  /** 訂閱者專屬退訂連結（含 token）。 */
  unsubscribeUrl: string;
  /** 品牌名稱（Footer 顯示）。 */
  brandName: string;
  /** 品牌 Logo URL。 */
  brandLogoUrl: string;
  /** 公司地址（CAN-SPAM 法規要求）。 */
  companyAddress: string;
}

/**
 * Newsletter Email Template（多語版本）。
 *
 * 設計原則：
 * - Table-based layout（React Email 元件底層已轉 table）
 * - 寬度 600px 上限
 * - UI 字串（閱讀全文 / 取消訂閱 / Footer 文案）依 `language` 自動對應
 * - 內容欄位（title / excerpt / cover）由呼叫端**預先**依語言取好再傳入
 */
export const NewsletterEmail = (props: NewsletterEmailProps) => {
  const {
    language,
    articleTitle,
    articleExcerpt,
    articleCoverImage,
    articleUrl,
    previewText,
    unsubscribeUrl,
    brandName,
    brandLogoUrl,
    companyAddress,
  } = props;

  const ui: NewsletterUiStrings = getNewsletterUiStrings(language);

  return (
    <Html lang={language}>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-[#f6f9fc] font-sans p-2">
          <Container className="mx-auto my-[40px] max-w-[600px] rounded border border-solid border-[#f0f0f0] bg-white">
            {/* Header */}
            <Section className="px-[32px] pt-[32px] pb-[16px]">
              <Img
                src={brandLogoUrl}
                width="40"
                height="40"
                alt={brandName}
                className="rounded"
              />
              <Text className="m-0 mt-[8px] text-[14px] font-semibold text-[#111827]">
                {brandName}
              </Text>
            </Section>

            {/* Cover Image */}
            {articleCoverImage ? (
              <Section className="px-0">
                <Img
                  src={articleCoverImage}
                  width="600"
                  height="315"
                  alt={articleTitle}
                  className="w-full"
                />
              </Section>
            ) : null}

            {/* Title + Excerpt */}
            <Section className="px-[32px] pt-[24px]">
              <Heading
                as="h1"
                className="m-0 text-[24px] leading-[32px] font-bold text-[#111827]"
              >
                {articleTitle}
              </Heading>
              <Text className="mt-[16px] text-[16px] leading-[26px] text-[#374151] whitespace-pre-line">
                {articleExcerpt}
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className="px-[32px] pt-[24px] pb-[32px] text-center">
              <Link
                href={articleUrl}
                className="inline-block rounded-[6px] bg-[#111827] px-[24px] py-[12px] text-[14px] font-semibold text-white no-underline"
              >
                {ui.readMore}
              </Link>
            </Section>

            <Hr className="mx-[32px] my-0 border-t border-solid border-[#e5e7eb]" />

            {/* Footer */}
            <Section className="px-[32px] py-[24px]">
              <Text className="m-0 text-[12px] leading-[18px] text-[#6b7280]">
                {ui.footerTagline}
              </Text>
              <Text className="mt-[8px] text-[12px] leading-[18px] text-[#6b7280]">
                {ui.unsubscribeDescription}{" "}
                <Link
                  href={unsubscribeUrl}
                  className="text-[#6b7280] underline"
                >
                  {ui.unsubscribe}
                </Link>
              </Text>
              <Text className="mt-[12px] text-[11px] leading-[16px] text-[#9ca3af]">
                {brandName}
                <br />
                {companyAddress}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NewsletterEmail;
