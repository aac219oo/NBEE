from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # 跳轉到 dev-center
        try:
            page.goto('http://localhost:3000/dev-center')
            page.wait_for_load_state('networkidle')
            # 等待一下確保動畫完成
            time.sleep(2)
            page.screenshot(path='dev_center_review.png', full_page=True)
            print("截圖已儲存至 dev_center_review.png")
        except Exception as e:
            print(f"發生錯誤: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
