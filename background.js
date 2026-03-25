// OGP画像URLのキャッシュ
const imageCache = new Map();

// DLsiteの作品ページURLを生成
function getProductUrl(code) {
  const prefix = code.substring(0, 2).toUpperCase();
  const productId = code.toUpperCase();

  // プレフィックスに応じたサイトを選択
  let site = 'home';
  if (prefix === 'BJ') {
    site = 'books';
  } else if (prefix === 'VJ') {
    site = 'pro';
  }

  return `https://www.dlsite.com/${site}/work/=/product_id/${productId}.html`;
}

// HTMLからOGP画像URLを抽出
function extractOgImage(html) {
  const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (match) {
    return match[1];
  }
  // 別の形式も試す
  const altMatch = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  return altMatch ? altMatch[1] : null;
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getOgImage') {
    const code = request.code;

    // キャッシュチェック
    if (imageCache.has(code)) {
      sendResponse({ success: true, imageUrl: imageCache.get(code) });
      return true;
    }

    const url = getProductUrl(code);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        const imageUrl = extractOgImage(html);
        if (imageUrl) {
          imageCache.set(code, imageUrl);
          sendResponse({ success: true, imageUrl });
        } else {
          sendResponse({ success: false, error: 'OGP image not found' });
        }
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 非同期レスポンスを示す
  }
});
