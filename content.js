// 作品コードの正規表現パターン
const PRODUCT_CODE_PATTERN = /[RBV]J\d{5,8}/gi;

// DLsiteの作品ページURLを生成
function getProductUrl(code) {
  const prefix = code.substring(0, 2).toUpperCase();
  const productId = code.toUpperCase();

  let site = 'home';
  if (prefix === 'BJ') {
    site = 'bl-home';
  } else if (prefix === 'VJ') {
    site = 'pro';
  }

  return `https://www.dlsite.com/${site}/work/=/product_id/${productId}.html`;
}

// ツールチップ要素
let tooltip = null;
let currentCode = null;

// ツールチップの作成
function createTooltip() {
  if (tooltip) return tooltip;

  tooltip = document.createElement('div');
  tooltip.className = 'dlsite-preview-tooltip';
  tooltip.innerHTML = `
    <div class="dlsite-preview-loading">Loading...</div>
    <a class="dlsite-preview-link" href="#" target="_blank" rel="noopener noreferrer" style="display: none;">
      <img class="dlsite-preview-image" />
    </a>
    <div class="dlsite-preview-error" style="display: none;"></div>
  `;
  document.body.appendChild(tooltip);

  return tooltip;
}

// ツールチップを表示
function showTooltip(rect, code) {
  createTooltip();

  // 位置を設定（選択範囲の下に表示）
  const padding = 8;
  const tooltipWidth = 320;
  const tooltipHeight = 240;

  let left = rect.left;
  let top = rect.bottom + padding;

  // 画面外にはみ出さないように調整
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth - padding;
  }
  if (left < 0) {
    left = padding;
  }
  if (top + tooltipHeight > window.innerHeight) {
    top = rect.top - tooltipHeight - padding;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.display = 'block';

  currentCode = code;

  // ローディング状態をリセット
  tooltip.querySelector('.dlsite-preview-loading').style.display = 'block';
  tooltip.querySelector('.dlsite-preview-link').style.display = 'none';
  tooltip.querySelector('.dlsite-preview-error').style.display = 'none';

  // リンク先を設定
  const link = tooltip.querySelector('.dlsite-preview-link');
  link.href = getProductUrl(code);

  // 画像を取得
  chrome.runtime.sendMessage({ type: 'getOgImage', code }, (response) => {
    if (chrome.runtime.lastError) {
      showError('Failed to connect');
      return;
    }

    if (response && response.success) {
      const img = tooltip.querySelector('.dlsite-preview-image');
      img.onload = () => {
        tooltip.querySelector('.dlsite-preview-loading').style.display = 'none';
        link.style.display = 'block';
      };
      img.onerror = () => {
        showError('Image load failed');
      };
      img.src = response.imageUrl;
    } else {
      showError(response?.error || 'Unknown error');
    }
  });
}

// エラー表示
function showError(message) {
  if (!tooltip) return;
  tooltip.querySelector('.dlsite-preview-loading').style.display = 'none';
  tooltip.querySelector('.dlsite-preview-link').style.display = 'none';
  const errorDiv = tooltip.querySelector('.dlsite-preview-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// ツールチップを非表示
function hideTooltip() {
  if (tooltip) {
    tooltip.style.display = 'none';
  }
  currentCode = null;
}

// 選択テキストから作品コードを検出
function findCodeInSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;

  const text = selection.toString();
  const matches = text.match(PRODUCT_CODE_PATTERN);

  if (matches && matches.length > 0) {
    return matches[0].toUpperCase();
  }

  return null;
}

// 選択範囲の座標を取得
function getSelectionRect() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

// テキスト選択時の処理
function handleSelection() {
  const code = findCodeInSelection();

  if (code && code !== currentCode) {
    const rect = getSelectionRect();
    if (rect && rect.width > 0) {
      showTooltip(rect, code);
    }
  }
}

// マウスアップで選択完了を検出
document.addEventListener('mouseup', (e) => {
  // ツールチップ内のクリックは無視
  if (tooltip && tooltip.contains(e.target)) {
    return;
  }

  // 少し遅延させて選択状態が確定してから処理
  setTimeout(handleSelection, 10);
});

// ツールチップ外をクリックしたら非表示
document.addEventListener('mousedown', (e) => {
  if (tooltip && tooltip.style.display !== 'none') {
    // ツールチップ内のクリックは無視
    if (!tooltip.contains(e.target)) {
      hideTooltip();
    }
  }
});
