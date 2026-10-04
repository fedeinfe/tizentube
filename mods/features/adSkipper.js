// Fallback for ads that still reach the player (e.g. when YouTube changes its
// responses before the JSON filters in adblock.js are updated): while the
// player is in ad mode, mute it, press the skip button if there is one and
// fast-forward the ad.

import { configRead } from '../config.js';

const SKIP_BUTTON_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    'ytlr-skip-button-renderer',
    'ytlr-skip-ad-renderer',
    '[class*="skip-ad-button"]'
];

// Ads delivered as a separate video are short. Anything longer is most likely
// the actual video with the ad stitched in, so don't jump to its end.
const MAX_SEPARATE_AD_DURATION = 120;

let adState = null;

function isAdShowing(player) {
    return player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
}

function clickSkipButton(player) {
    for (const selector of SKIP_BUTTON_SELECTORS) {
        const button = player.querySelector(selector) || document.querySelector(selector);
        if (button) {
            button.click();
            return true;
        }
    }
    return false;
}

function skipAd(player) {
    const video = player.querySelector('video') || document.querySelector('video');
    if (!video) return;

    if (!adState || adState.video !== video) {
        adState = {
            video,
            muted: video.muted,
            playbackRate: video.playbackRate
        };
        console.info('[TizenTube] Ad detected in player, skipping it');
    }

    video.muted = true;
    if (clickSkipButton(player)) return;

    const duration = video.duration;
    if (isFinite(duration) && duration > 0 && duration <= MAX_SEPARATE_AD_DURATION) {
        if (video.currentTime < duration - 0.5) video.currentTime = duration - 0.1;
    } else {
        try {
            video.playbackRate = 16;
        } catch (e) {
            try {
                video.playbackRate = 4;
            } catch (e) { }
        }
    }
}

function restorePlayer() {
    if (!adState) return;
    const { video, muted, playbackRate } = adState;
    adState = null;
    video.muted = muted;
    try {
        video.playbackRate = playbackRate;
    } catch (e) { }
}

function checkForAds() {
    if (!configRead('enableAdBlock')) return restorePlayer();
    const player = document.querySelector('.html5-video-player');
    if (player && isAdShowing(player)) {
        skipAd(player);
    } else {
        restorePlayer();
    }
}

setInterval(checkForAds, 500);
