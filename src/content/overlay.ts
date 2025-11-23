/**
 * Floating overlay for all TLS providers
 * Shows guide, conditions, and Start button
 */

import type { ProviderId } from '../types';
import { getProviderOverlayConfig } from '../config/provider-overlay-config';

/**
 * Detect provider from current page hostname
 */
function detectProvider(): ProviderId | null {
  const hostname = window.location.hostname.toLowerCase();
  
  // Check each provider's host patterns
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter';
  } else if (hostname.includes('binance.com')) {
    return 'binance';
  } else if (hostname.includes('okx.com')) {
    return 'okx';
  } else if (hostname.includes('kucoin.com')) {
    return 'kucoin';
  } else if (hostname.includes('coinbase.com')) {
    return 'coinbase';
  } else if (hostname.includes('linkedin.com')) {
    return 'linkedin';
  } else if (hostname.includes('fiverr.com')) {
    return 'fiverr';
  } else if (hostname.includes('upwork.com')) {
    return 'upwork';
  } else if (hostname.includes('youtube.com')) {
    return 'youtube';
  } else if (hostname.includes('tiktok.com')) {
    return 'tiktok';
  } else if (hostname.includes('twitch.tv')) {
    return 'twitch';
  } else if (hostname.includes('github.com')) {
    return 'github';
  } else if (hostname.includes('telegram.org')) {
    return 'telegram';
  } else if (hostname.includes('coursera.org')) {
    return 'coursera';
  } else if (hostname.includes('udemy.com')) {
    return 'udemy';
  } else if (hostname.includes('edx.org')) {
    return 'edx';
  }
  
  return null;
}

/**
 * Check if user is on the correct page for verification
 */
function checkCorrectPage(provider: ProviderId, requiredPage?: string): boolean {
  if (!requiredPage) return true; // No specific page required
  
  const currentUrl = window.location.href.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  
  console.log('[AnyLayer] Checking page for:', provider, { currentUrl, pathname });
  
  switch (provider) {
    case 'twitter':
      // Check if on profile page (not home feed)
      const isTwitterProfile = pathname.includes('/') && pathname !== '/' && 
                               pathname !== '/home' && pathname !== '/explore' &&
                               !pathname.includes('/messages') && !pathname.includes('/notifications');
      console.log('[AnyLayer] Twitter profile check:', isTwitterProfile, pathname);
      return isTwitterProfile;
      
    case 'youtube':
      // Check if on channel page or studio
      return currentUrl.includes('/channel/') || 
             currentUrl.includes('studio.youtube.com') ||
             pathname.includes('/@');  // New YouTube channel URLs
             
    case 'linkedin':
      // Check if on own profile (has '/in/' in path)
      return pathname.includes('/in/');
      
    case 'binance':
    case 'okx':
    case 'kucoin':
    case 'coinbase':
      // Check if on verification/KYC page
      return currentUrl.includes('verification') || 
             currentUrl.includes('kyc') ||
             currentUrl.includes('identification');
             
    case 'fiverr':
    case 'upwork':
      // Check if on seller/freelancer profile
      return pathname.includes('/seller') || 
             pathname.includes('/freelancer') ||
             pathname.includes('/profile');
             
    case 'tiktok':
    case 'twitch':
      // Check if on channel/profile page
      return pathname.includes('/@') || pathname.includes('/channel');
      
    default:
      return true;
  }
}

/**
 * Check if user is logged in (provider-specific) - IMPROVED
 */
function checkLoginStatus(provider: ProviderId): boolean {
  console.log('[AnyLayer] Checking login status for:', provider);
  
  switch (provider) {
    case 'twitter':
      // Multiple checks for Twitter login
      const twitterChecks = [
        document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]'),
        document.querySelector('[aria-label*="Account menu"]'),
        document.querySelector('[data-testid="primaryColumn"]'),
        document.querySelector('[data-testid="AppTabBar_Home_Link"]'),
        document.querySelector('a[href="/compose/tweet"]'),
        // Cookie check
        document.cookie.includes('auth_token')
      ];
      const isTwitterLoggedIn = twitterChecks.some(check => check);
      console.log('[AnyLayer] Twitter login checks:', { 
        foundElements: twitterChecks.filter(c => c).length,
        isLoggedIn: isTwitterLoggedIn 
      });
      return isTwitterLoggedIn;
      
    case 'binance':
    case 'okx':
    case 'kucoin':
    case 'coinbase':
      return !!document.querySelector('[class*="user-menu"]') ||
             !!document.querySelector('[data-testid="user-menu"]') ||
             !!document.cookie.split(';').find(c => c.trim().startsWith('auth_token=') || c.trim().startsWith('token='));
             
    case 'linkedin':
      // More comprehensive LinkedIn detection
      const linkedinChecks = [
        document.querySelector('[data-test-id="nav-settings__dropdown-trigger"]'),
        document.querySelector('.global-nav__me'),
        document.querySelector('.nav-item__profile-member-photo'),
        document.querySelector('[data-control-name="identity_profile_photo"]'),
        document.querySelector('.global-nav__primary-link-me-menu-trigger'),
        document.querySelector('#global-nav-icon'),
        document.querySelector('[data-control-name="nav.settings"]'),
        document.querySelector('.nav-item__icon'),
        document.querySelector('img.global-nav__me-photo'),
        // Cookie check
        document.cookie.includes('li_at=') || document.cookie.includes('JSESSIONID=')
      ];
      const isLinkedInLoggedIn = linkedinChecks.some(check => check);
      console.log('[AnyLayer] LinkedIn login checks:', { 
        foundElementsCount: linkedinChecks.filter(c => c && typeof c !== 'boolean').length,
        hasCookie: document.cookie.includes('li_at=') || document.cookie.includes('JSESSIONID='),
        isLoggedIn: isLinkedInLoggedIn,
        url: window.location.href
      });
      return isLinkedInLoggedIn;
      
    case 'fiverr':
      // Improved Fiverr login detection with multiple checks
      const fiverrChecks = [
        document.querySelector('nav [data-testid="profile-icon"]'), // Profile icon in header
        document.querySelector('button[aria-label="User Menu"]'), // User menu
        document.querySelector('.user-menu'), // User menu container
        document.querySelector('[data-qa="user-menu"]'), // User menu data attribute
        document.querySelector('a[href*="/users/"]'), // User profile link
        // Cookie checks
        document.cookie.includes('fiverr_session='),
        document.cookie.includes('logged_in=')
      ];
      const isFiverrLoggedIn = fiverrChecks.some(check => check);
      console.log('[AnyLayer] Fiverr login checks:', {
        foundElementsCount: fiverrChecks.filter(c => c && typeof c !== 'boolean').length,
        hasCookie: document.cookie.includes('fiverr_session=') || document.cookie.includes('logged_in='),
        isLoggedIn: isFiverrLoggedIn,
        url: window.location.href
      });
      return isFiverrLoggedIn;
      
    case 'upwork':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('oauth_token='));
      
    case 'youtube':
      // More comprehensive YouTube detection
      const youtubeChecks = [
        document.querySelector('ytd-topbar-menu-button-renderer'),
        document.querySelector('#avatar-btn'),
        document.querySelector('[aria-label*="Account menu"]'),
        document.querySelector('button[aria-label*="Google Account"]'),
        // Cookie check
        document.cookie.includes('LOGIN_INFO=') || document.cookie.includes('SSID=')
      ];
      const isYouTubeLoggedIn = youtubeChecks.some(check => check);
      console.log('[AnyLayer] YouTube login checks:', { 
        foundElements: youtubeChecks.filter(c => c).length,
        isLoggedIn: isYouTubeLoggedIn 
      });
      return isYouTubeLoggedIn;
      
    case 'tiktok':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('tt_chain_token='));
      
    case 'twitch':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('auth-token='));
      
    default:
      return false;
  }
}

/**
 * Show error overlay
 */
function showErrorOverlay(title: string, message: string) {
  const overlay = document.createElement('div');
  overlay.id = 'anylayer-zkTLS-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 380px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(255, 107, 107, 0.4);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 2px;
    animation: slideIn 0.3s ease-out;
  `;

  const inner = document.createElement('div');
  inner.style.cssText = `
    background: white;
    border-radius: 18px;
    padding: 24px;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  `;

  const errorIcon = document.createElement('div');
  errorIcon.style.cssText = `
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  `;
  errorIcon.textContent = '⚠️';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: #f5f5f5;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 8px;
    width: 32px;
    height: 32px;
    line-height: 1;
    border-radius: 8px;
  `;
  closeBtn.onclick = () => overlay.remove();

  header.appendChild(errorIcon);
  header.appendChild(closeBtn);

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-weight: 700;
    font-size: 18px;
    color: #1a1a1a;
    margin-bottom: 12px;
  `;
  titleEl.textContent = title;

  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    font-size: 14px;
    color: #666;
    line-height: 1.6;
  `;
  messageEl.textContent = message;

  inner.appendChild(header);
  inner.appendChild(titleEl);
  inner.appendChild(messageEl);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);
}

/**
 * Create provider overlay with collapsible feature
 */
export function createProviderOverlay(providerId?: ProviderId) {
  // Always detect from current page to avoid mismatches
  const detectedProvider = detectProvider();
  
  // Use detected provider, or fallback to provided one
  const provider = detectedProvider || providerId;
  
  if (!provider) {
    console.warn('[AnyLayer Overlay] Unknown provider for current page:', window.location.hostname);
    showErrorOverlay('Provider not supported', 'This page is not a supported provider. Please navigate to Twitter, LinkedIn, YouTube, or other supported platforms.');
    return null;
  }

  // Log both for debugging
  console.log('[AnyLayer Overlay] Creating overlay - Detected:', detectedProvider, 'Requested:', providerId, 'Using:', provider);

  // Remove existing overlay if present
  const existing = document.getElementById('anylayer-zkTLS-overlay');
  if (existing) {
    existing.remove();
  }

  const config = getProviderOverlayConfig(provider);
  const providerName = config.providerName;
  
  // Wait for DOM to be fully loaded before checking login status
  const checkWithDelay = () => {
    return new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  };
  
  // Initial check (might be false if page not loaded)
  let isLoggedIn = checkLoginStatus(provider);
  let isOnCorrectPage = checkCorrectPage(provider, config.requiredPage);
  
  // Recheck after page fully loads
  checkWithDelay().then(() => {
    const newLoginStatus = checkLoginStatus(provider);
    const newPageStatus = checkCorrectPage(provider, config.requiredPage);
    
    if (newLoginStatus !== isLoggedIn || newPageStatus !== isOnCorrectPage) {
      console.log('[AnyLayer Overlay] Status changed after page load:', {
        wasLoggedIn: isLoggedIn,
        nowLoggedIn: newLoginStatus,
        wasOnCorrectPage: isOnCorrectPage,
        nowOnCorrectPage: newPageStatus
      });
      isLoggedIn = newLoginStatus;
      isOnCorrectPage = newPageStatus;
      
      // Update UI
      updateOverlayStatus(overlay, provider);
      
      // Update status dot
      const statusDot = document.getElementById('anylayer-status-dot');
      if (statusDot) {
        statusDot.style.background = isLoggedIn && isOnCorrectPage ? '#28a745' : '#ffc107';
      }
    }
  });

  // Create overlay container - collapsible
  const overlay = document.createElement('div');
  overlay.id = 'anylayer-zkTLS-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    width: 380px;
    max-width: 90vw;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: all 0.3s ease;
  `;

  // Collapsed state
  let isCollapsed = false;

  // Header bar (always visible)
  const headerBar = document.createElement('div');
  headerBar.style.cssText = `
    padding: 14px 16px;
    background: #f8f9fa;
    border-radius: 12px 12px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
  `;

  const headerLeft = document.createElement('div');
  headerLeft.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 8px;';

  const statusDot = document.createElement('div');
  statusDot.id = 'anylayer-status-dot';
  statusDot.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${isLoggedIn && isOnCorrectPage ? '#28a745' : '#ffc107'};
  `;

  const headerTitle = document.createElement('div');
  headerTitle.style.cssText = `
    font-weight: 600;
    font-size: 14px;
    color: #1a1a1a;
  `;
  headerTitle.textContent = `${providerName} Snapshot`;

  headerLeft.appendChild(statusDot);
  headerLeft.appendChild(headerTitle);

  const headerRight = document.createElement('div');
  headerRight.style.cssText = 'display: flex; gap: 4px;';

  // Collapse/Expand button
  const collapseBtn = document.createElement('button');
  collapseBtn.id = 'anylayer-collapse-btn';
  collapseBtn.innerHTML = '▼';
  collapseBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 12px;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  `;
  collapseBtn.onmouseover = () => {
    collapseBtn.style.background = '#e9ecef';
  };
  collapseBtn.onmouseout = () => {
    collapseBtn.style.background = 'none';
  };

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  `;
  closeBtn.onmouseover = () => {
    closeBtn.style.background = '#e9ecef';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'none';
  };
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    overlay.remove();
  };

  headerRight.appendChild(collapseBtn);
  headerRight.appendChild(closeBtn);
  headerBar.appendChild(headerLeft);
  headerBar.appendChild(headerRight);

  // Content container (collapsible)
  const content = document.createElement('div');
  content.id = 'anylayer-content';
  content.style.cssText = `
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  `;

  // Initialize sections
  let pageSection: HTMLDivElement | null = null;
  let dataSection: HTMLDivElement;
  let guideSection: HTMLDivElement;

  // Required Page section (if specified) - cleaner
  if (config.requiredPage) {
    pageSection = document.createElement('div');
    pageSection.style.cssText = `
      background: #fffbf0;
      border: 1px solid #ffe5b4;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 16px;
    `;
    const pageText = document.createElement('div');
    pageText.style.cssText = `
      font-size: 13px;
      color: #856404;
      line-height: 1.5;
    `;
    pageText.innerHTML = `<strong>📍 ${config.requiredPage}</strong>`;
    pageSection.appendChild(pageText);
  }

  // Data Verification section - simpler
  dataSection = document.createElement('div');
  dataSection.style.cssText = `
    background: #f8f9fa;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 16px;
  `;
  const dataTitle = document.createElement('div');
  dataTitle.style.cssText = `
    font-weight: 600;
    font-size: 13px;
    color: #495057;
    margin-bottom: 10px;
  `;
  dataTitle.textContent = 'What we\'ll verify:';
  const dataList = document.createElement('div');
  dataList.style.cssText = `
    font-size: 13px;
    color: #6c757d;
    line-height: 1.8;
  `;
  
  config.dataVerified.forEach((item) => {
    const dataItem = document.createElement('div');
    dataItem.style.cssText = 'padding-left: 16px; position: relative;';
    dataItem.innerHTML = `<span style="position: absolute; left: 0; color: #28a745;">✓</span>${item}`;
    dataList.appendChild(dataItem);
  });
  
  dataSection.appendChild(dataTitle);
  dataSection.appendChild(dataList);

  // Guide section - simpler
  guideSection = document.createElement('div');
  guideSection.style.cssText = `
    margin-bottom: 16px;
    padding: 14px;
    background: #e7f3ff;
    border: 1px solid #c9e3ff;
    border-radius: 10px;
  `;
  const guideText = document.createElement('div');
  guideText.style.cssText = `
    font-size: 13px;
    color: #004085;
    line-height: 1.5;
  `;
  guideText.innerHTML = `💡 ${config.guide}`;
  guideSection.appendChild(guideText);

  // Conditions section with clickable links - simpler
  const conditionsSection = document.createElement('div');
  conditionsSection.style.cssText = `
    margin-bottom: 20px;
  `;
  const conditionsTitle = document.createElement('div');
  conditionsTitle.style.cssText = `
    font-weight: 600;
    font-size: 13px;
    color: #495057;
    margin-bottom: 10px;
  `;
  conditionsTitle.textContent = 'Requirements:';
  const conditionsList = document.createElement('ul');
  conditionsList.id = 'anylayer-conditions-list';
  conditionsList.style.cssText = `
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 13px;
    color: #6c757d;
  `;
  
  // Add conditions from config with dynamic checkboxes
  config.conditions.forEach((condition, index) => {
    const item = document.createElement('li');
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      opacity: 0.6;
      transition: opacity 0.3s;
    `;
    
    // Checkbox indicator
    const checkbox = document.createElement('span');
    checkbox.className = 'condition-checkbox';
    checkbox.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: 2px solid #ccc;
      border-radius: 4px;
      background: transparent;
      flex-shrink: 0;
      font-size: 14px;
      color: white;
      font-weight: bold;
      transition: all 0.3s;
    `;
    
    // If condition has a link, make it clickable
    if (condition.link) {
      const link = document.createElement('a');
      link.href = condition.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = condition.text;
      link.style.cssText = `
        color: #007bff;
        text-decoration: none;
        cursor: pointer;
        flex: 1;
      `;
      link.onmouseover = () => {
        link.style.textDecoration = 'underline';
      };
      link.onmouseout = () => {
        link.style.textDecoration = 'none';
      };
      item.appendChild(checkbox);
      item.appendChild(link);
    } else {
      const text = document.createElement('span');
      text.textContent = condition.text;
      text.style.cssText = 'flex: 1;';
      item.appendChild(checkbox);
      item.appendChild(text);
    }
    
    conditionsList.appendChild(item);
  });
  
  conditionsSection.appendChild(conditionsTitle);
  conditionsSection.appendChild(conditionsList);

  // Status/Error indicator
  const statusDiv = document.createElement('div');
  statusDiv.id = 'anylayer-status';
  statusDiv.style.cssText = `
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    display: ${isLoggedIn ? 'none' : 'block'};
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
  `;
  statusDiv.textContent = `⚠️ Please log in to ${providerName} first`;

  // Take Snapshot button - simpler and clearer
  const startBtn = document.createElement('button');
  startBtn.id = 'anylayer-start-btn';
  startBtn.textContent = isLoggedIn ? 'Take Snapshot' : `Log in to ${providerName}`;
  startBtn.style.cssText = `
    width: 100%;
    padding: 14px;
    background: ${isLoggedIn ? '#007bff' : '#ccc'};
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: ${isLoggedIn ? 'pointer' : 'not-allowed'};
    transition: all 0.2s;
  `;
  
  if (!isLoggedIn) {
    startBtn.disabled = true;
  } else {
    startBtn.onmouseover = () => {
      startBtn.style.background = '#0056b3';
    };
    startBtn.onmouseout = () => {
      startBtn.style.background = '#007bff';
    };
  }

  // Footer - minimal
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 20px;
    text-align: center;
    font-size: 11px;
    color: #adb5bd;
  `;
  footer.textContent = 'Privacy-first • Data stays local';

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -48%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
  `;
  document.head.appendChild(style);

  // Assemble overlay - updated for new structure
  content.appendChild(pageSection ? pageSection : document.createComment(''));
  if (pageSection) content.appendChild(pageSection);
  content.appendChild(dataSection);
  content.appendChild(guideSection);
  content.appendChild(conditionsSection);
  content.appendChild(statusDiv);
  content.appendChild(startBtn);
  content.appendChild(footer);
  
  overlay.appendChild(headerBar);
  overlay.appendChild(content);

  // Collapse/expand functionality
  collapseBtn.onclick = (e) => {
    e.stopPropagation();
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      content.style.display = 'none';
      collapseBtn.innerHTML = '▲';
      overlay.style.width = 'auto';
      // Position at bottom-right when collapsed
      overlay.style.top = 'auto';
      overlay.style.bottom = '20px';
      overlay.style.transform = 'none';
    } else {
      content.style.display = 'block';
      collapseBtn.innerHTML = '▼';
      overlay.style.width = '380px';
      // Position at middle-right when expanded
      overlay.style.top = '50%';
      overlay.style.bottom = 'auto';
      overlay.style.transform = 'translateY(-50%)';
    }
  };

  // Header bar click to toggle
  headerBar.onclick = () => {
    collapseBtn.click();
  };

  // Add to page
  document.body.appendChild(overlay);

  // Handle Start button click
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    startBtn.style.opacity = '0.6';
    startBtn.style.cursor = 'not-allowed';

    // Show status
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#e3f2fd';
    statusDiv.style.color = '#1976d2';
    statusDiv.textContent = '⏳ Initiating verification...';

    try {
      // Send message to background script to start snapshot creation
      const response = await chrome.runtime.sendMessage({
        type: 'START_SNAPSHOT_FROM_OVERLAY',
        provider: provider
      });

      if (response.success) {
        statusDiv.style.background = '#e8f5e9';
        statusDiv.style.color = '#2e7d32';
        statusDiv.textContent = '✅ Verification started! Check extension popup for progress.';
        startBtn.textContent = 'Started';
      } else {
        throw new Error(response.error || 'Failed to start verification');
      }
    } catch (error) {
      statusDiv.style.background = '#ffebee';
      statusDiv.style.color = '#c62828';
      statusDiv.textContent = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      startBtn.disabled = false;
      startBtn.textContent = 'Start';
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    }
  });

  // START CONTINUOUS MONITORING
  startContinuousMonitoring(overlay, provider);

  // Clean up monitoring when overlay is removed (find close button without redeclaration)
  const headerCloseBtn = headerBar.querySelector('button:last-child') as HTMLButtonElement;
  if (headerCloseBtn) {
    const originalClose = headerCloseBtn.onclick;
    headerCloseBtn.onclick = (e) => {
      stopContinuousMonitoring();
      if (originalClose) originalClose.call(headerCloseBtn, e);
      else overlay.remove();
    };
  }

  return overlay;
}

async function updateOverlayStatus(overlay: HTMLElement, provider: ProviderId) {
  const statusDiv = overlay.querySelector('#anylayer-status') as HTMLElement;
  const startBtn = overlay.querySelector('#anylayer-start-btn') as HTMLButtonElement;
  const statusDot = document.getElementById('anylayer-status-dot');
  const statusText = document.getElementById('anylayer-status-text');
  const conditionsList = overlay.querySelector('#anylayer-conditions-list') as HTMLElement;

  if (!statusDiv || !startBtn) return;

  const config = getProviderOverlayConfig(provider);
  const providerName = config.providerName;

  try {
    // Check all conditions
    const walletData = await chrome.storage.local.get('userAddress');
    const hasWallet = !!walletData.userAddress;
    const isLoggedIn = checkLoginStatus(provider);
    const isOnCorrectPage = checkCorrectPage(provider, config.requiredPage);
    
    // Check if ALL conditions are met
    const allConditionsMet = hasWallet && isLoggedIn && isOnCorrectPage;

    // Update status dot
    if (statusDot) {
      if (allConditionsMet) {
        statusDot.style.background = '#28a745'; // Green - ready
        if (statusText) statusText.textContent = 'Schema Matched';
      } else if (isLoggedIn) {
        statusDot.style.background = '#ffc107'; // Yellow - partial
        if (statusText) statusText.textContent = 'Schema Matching';
      } else {
        statusDot.style.background = '#dc3545'; // Red - not logged in
        if (statusText) statusText.textContent = 'Schema Matching';
      }
    }
    
    // Update conditions checklist
    if (conditionsList) {
      const conditionItems = conditionsList.querySelectorAll('li');
      conditionItems.forEach((item, index) => {
        const checkbox = item.querySelector('.condition-checkbox') as HTMLElement;
        if (checkbox) {
          // Determine which condition this is
          let isConditionMet = false;
          if (index === 0) {
            // First condition: logged in
            isConditionMet = isLoggedIn;
          } else if (index === 1) {
            // Second condition: correct page (if applicable)
            isConditionMet = config.requiredPage ? isOnCorrectPage : true;
          } else if (index === conditionItems.length - 1) {
            // Last condition: wallet connected
            isConditionMet = hasWallet;
          } else {
            // Middle conditions: provider-specific (mark as met if logged in)
            isConditionMet = isLoggedIn;
          }
          
          // Update checkbox appearance
          if (isConditionMet) {
            checkbox.textContent = '✓';
            checkbox.style.background = '#28a745';
            checkbox.style.borderColor = '#28a745';
            item.style.opacity = '1';
          } else {
            checkbox.textContent = '';
            checkbox.style.background = 'transparent';
            checkbox.style.borderColor = '#ccc';
            item.style.opacity = '0.6';
          }
        }
      });
    }

    // Update status message and button
    if (!hasWallet) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#fff3cd';
      statusDiv.style.color = '#856404';
      statusDiv.textContent = '⚠️ Please connect your wallet first';
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    } else if (!isLoggedIn) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#fff3cd';
      statusDiv.style.color = '#856404';
      statusDiv.textContent = `⚠️ Please log in to ${providerName}`;
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    } else if (!isOnCorrectPage && config.requiredPage) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#fff3cd';
      statusDiv.style.color = '#856404';
      statusDiv.textContent = `⚠️ ${config.requiredPage}`;
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    } else {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#e8f5e9';
      statusDiv.style.color = '#2e7d32';
      statusDiv.textContent = '✅ Ready to start verification';
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    }
  } catch (error) {
    console.error('[AnyLayer Overlay] Error updating status:', error);
  }
}

// Continuous monitoring interval for real-time status updates
let monitoringInterval: NodeJS.Timeout | null = null;

function startContinuousMonitoring(overlay: HTMLElement, provider: ProviderId) {
  // Clear any existing interval
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Update status immediately
  updateOverlayStatus(overlay, provider);
  
  // Then check every 2 seconds
  monitoringInterval = setInterval(() => {
    updateOverlayStatus(overlay, provider);
  }, 2000);
  
  console.log('[AnyLayer] Started continuous page monitoring');
}

function stopContinuousMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('[AnyLayer] Stopped continuous page monitoring');
  }
}

// Listen for storage changes to update status
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.userAddress) {
    const overlay = document.getElementById('anylayer-zkTLS-overlay');
    if (overlay) {
      const provider = detectProvider();
      if (provider) {
        updateOverlayStatus(overlay, provider);
      }
    }
  }
});

// Export for backward compatibility
export const createTwitterOverlay = createProviderOverlay;
