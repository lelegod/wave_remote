/**
 * Wave Remote - Content Script
 * 
 * Injected into YouTube and Netflix pages.
 * Listens for commands from background.js and controls video playback.
 */

// Find the video element on the page
function getVideoElement() {
    // YouTube
    let video = document.querySelector('video.html5-main-video');
    if (video) return video;

    // Netflix
    video = document.querySelector('video');
    if (video) return video;

    // Fallback: any video element
    return document.querySelector('video');
}

// Toggle play/pause
function togglePlay() {
    const video = getVideoElement();
    if (!video) {
        console.log('[Wave Remote] No video element found');
        return;
    }

    if (video.paused) {
        video.play();
        console.log('[Wave Remote] ▶️ Playing');
    } else {
        video.pause();
        console.log('[Wave Remote] ⏸️ Paused');
    }
}

// Seek forward
function seekForward(seconds) {
    const video = getVideoElement();
    if (!video) {
        console.log('[Wave Remote] No video element found');
        return;
    }

    // Netflix: Use keyboard Right Arrow
    if (window.location.hostname.includes('netflix.com')) {
        // Focus the video player area first
        const playerContainer = document.querySelector('.watch-video') ||
            document.querySelector('.NFPlayer') ||
            document.body;
        playerContainer.focus();

        // Dispatch keyboard event
        const event = new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            code: 'ArrowRight',
            keyCode: 39,
            which: 39,
            bubbles: true,
            cancelable: true,
            view: window
        });
        document.activeElement.dispatchEvent(event);
        document.dispatchEvent(event);
        console.log('[Wave Remote] ⏩ Netflix: Sent Right Arrow key');
        return;
    }

    // YouTube and others: Direct seek
    const newTime = Math.min(video.currentTime + seconds, video.duration);
    video.currentTime = newTime;
    console.log(`[Wave Remote] ⏩ Seeked forward ${seconds}s to ${newTime.toFixed(1)}s`);
}

// Seek backward
function seekBackward(seconds) {
    const video = getVideoElement();
    if (!video) {
        console.log('[Wave Remote] No video element found');
        return;
    }

    // Netflix: Use keyboard Left Arrow
    if (window.location.hostname.includes('netflix.com')) {
        // Focus the video player area first
        const playerContainer = document.querySelector('.watch-video') ||
            document.querySelector('.NFPlayer') ||
            document.body;
        playerContainer.focus();

        // Dispatch keyboard event
        const event = new KeyboardEvent('keydown', {
            key: 'ArrowLeft',
            code: 'ArrowLeft',
            keyCode: 37,
            which: 37,
            bubbles: true,
            cancelable: true,
            view: window
        });
        document.activeElement.dispatchEvent(event);
        document.dispatchEvent(event);
        console.log('[Wave Remote] ⏪ Netflix: Sent Left Arrow key');
        return;
    }

    // YouTube and others: Direct seek
    const newTime = Math.max(video.currentTime - seconds, 0);
    video.currentTime = newTime;
    console.log(`[Wave Remote] ⏪ Seeked backward ${seconds}s to ${newTime.toFixed(1)}s`);
}

// Listen for commands from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Wave Remote] Content received:', message.type);

    switch (message.type) {
        case 'TOGGLE_PLAY':
            togglePlay();
            sendResponse({ success: true });
            break;

        case 'SEEK_FORWARD':
            seekForward(message.seconds || 10);
            sendResponse({ success: true });
            break;

        case 'SEEK_BACKWARD':
            seekBackward(message.seconds || 10);
            sendResponse({ success: true });
            break;

        case 'GET_VIDEO_STATUS':
            const video = getVideoElement();
            sendResponse({
                hasVideo: !!video,
                paused: video?.paused,
                currentTime: video?.currentTime,
                duration: video?.duration
            });
            break;
    }
});

console.log('[Wave Remote] Content script loaded on', window.location.hostname);
