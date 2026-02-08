(function () {
    'use strict';

    const ELEMENTS = {
        dropdown: () => document.getElementById('version'),
        downloadBtn: () => document.getElementById('downloadBtn'),
        httpsBtn: () => document.getElementById('httpsBtn'),
        fileSize: () => document.getElementById('fileSize'),
        checksum: () => document.getElementById('checksum'),
        buttonWrapper: () => document.querySelector('.button-wrapper')
    };

    const MESSAGES = {
        noLinks: '⚠️ Oops! No download links available for this version',
        seedReminder: '💚 Please seed after downloading via torrent'
    };

    const COPY_FEEDBACK_DURATION = 1500;
    const CHECKSUM_PREVIEW_LENGTH = 4;

    let versions = [];

    async function loadVersions() {
        try {
            const response = await fetch('versions.json');
            if (!response.ok) throw new Error('Failed to fetch versions');
            versions = await response.json();
            populateVersions();
        } catch (error) {
            console.error('Error loading versions:', error);
            showError('Failed to load version data');
        }
    }

    function showError(message) {
        const wrapper = ELEMENTS.buttonWrapper();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'helper-text error-text';
        errorDiv.textContent = `⚠️ ${message}`;
        errorDiv.style.color = '#dc3545';
        wrapper.appendChild(errorDiv);
    }

    function getLatestVersion() {
        const dated = versions.filter(version => {
            return version.date && !Number.isNaN(Date.parse(version.date));
        });

        if (!dated.length) {
            return versions[0];
        }

        return dated.reduce((latest, current) => {
            return new Date(current.date) > new Date(latest.date) ? current : latest;
        });
    }

    function getVersionKey(version) {
        return version.id || version.date || version.label || '';
    }

    function createVersionOption(version, isLatest) {
        const option = document.createElement('option');
        option.value = getVersionKey(version);
        const baseLabel = version.date
            ? (version.label ? `${version.date} - ${version.label}` : version.date)
            : (version.label || 'Untitled');
        option.textContent = isLatest ? `${baseLabel} - Latest` : baseLabel;
        return option;
    }

    function populateVersions() {
        if (!versions.length) return;

        const dropdown = ELEMENTS.dropdown();
        const latestVersion = getLatestVersion();
        const latestKey = latestVersion ? getVersionKey(latestVersion) : '';
        const preRender = versions.filter(version => version.id === 'seed-pre-render');
        const dated = versions.filter(version => version.date);
        const undated = versions.filter(version => !version.date && version.id !== 'seed-pre-render');
        const sortedDated = [...dated].sort((a, b) => new Date(b.date) - new Date(a.date));
        const restDated = sortedDated.filter(version => getVersionKey(version) !== latestKey);
        const ordered = [latestVersion, ...preRender, ...restDated, ...undated].filter(Boolean);

        ordered.forEach(version => {
            const isLatest = getVersionKey(version) === latestKey;
            dropdown.appendChild(createVersionOption(version, isLatest));
        });

        updateDownloadLink(getVersionKey(ordered[0]));
    }

    function formatChecksum(checksum) {
        if (!checksum || checksum.length < CHECKSUM_PREVIEW_LENGTH * 2) {
            return checksum || '-';
        }
        const start = checksum.substring(0, CHECKSUM_PREVIEW_LENGTH);
        const end = checksum.substring(checksum.length - CHECKSUM_PREVIEW_LENGTH);
        return `${start}...${end}`;
    }

    function isValidLink(link) {
        return link && link.trim() !== '';
    }

    function updateButton(button, link, shouldShow) {
        if (shouldShow && isValidLink(link)) {
            button.href = link;
            button.style.display = 'inline-flex';
            return true;
        } else {
            button.style.display = 'none';
            return false;
        }
    }

    function createHelperText(message, isError = false) {
        const helperText = document.createElement('div');
        helperText.className = isError ? 'helper-text error-text' : 'helper-text';
        helperText.textContent = message;
        if (isError) helperText.style.color = '#dc3545';
        return helperText;
    }

    function updateHelperText(buttonWrapper, hasAnyLink) {
        const existingHelper = buttonWrapper.querySelector('.helper-text');
        if (existingHelper) existingHelper.remove();

        const message = hasAnyLink ? MESSAGES.seedReminder : MESSAGES.noLinks;
        buttonWrapper.appendChild(createHelperText(message, !hasAnyLink));
    }

    function updateFileInfo(version) {
        ELEMENTS.fileSize().textContent = version.size || '-';
        const checksumEl = ELEMENTS.checksum();
        checksumEl.textContent = formatChecksum(version.checksum);
        checksumEl.dataset.full = version.checksum || '';
    }

    function updateDownloadLink(versionKey) {
        const version = versions.find(v => getVersionKey(v) === versionKey);
        if (!version) return;

        updateFileInfo(version);

        const hasMagnet = updateButton(ELEMENTS.downloadBtn(), version.magnetLink, true);
        const hasHttps = updateButton(ELEMENTS.httpsBtn(), version.httpsLink, true);
        const hasAnyLink = hasMagnet || hasHttps;

        updateHelperText(ELEMENTS.buttonWrapper(), hasAnyLink);
    }

    function copyChecksum(event) {
        const checksumEl = ELEMENTS.checksum();
        const fullChecksum = checksumEl.dataset.full || checksumEl.textContent;

        navigator.clipboard.writeText(fullChecksum).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            const originalBg = btn.style.background;
            const originalColor = btn.style.color;

            btn.textContent = '✓';
            btn.style.background = '#3c8527';
            btn.style.color = '#fff';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = originalBg;
                btn.style.color = originalColor;
            }, COPY_FEEDBACK_DURATION);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    window.updateDownloadLink = updateDownloadLink;
    window.copyChecksum = copyChecksum;

    document.addEventListener('DOMContentLoaded', loadVersions);
})();

// Tab switching
function switchTab(tabName) {
    const current = document.querySelector('.tab-content.tab-active');
    const next = document.getElementById('tab-' + tabName);

    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="' + tabName + '"]').classList.add('active');

    if (current && current !== next) {
        current.classList.add('tab-exit');
        current.classList.remove('tab-active');
        setTimeout(() => {
            current.classList.remove('tab-exit');
            current.style.display = 'none';
            next.style.display = 'block';
            // Force reflow so the enter animation plays
            void next.offsetWidth;
            next.classList.add('tab-active');
        }, 200);
    } else {
        next.style.display = 'block';
        void next.offsetWidth;
        next.classList.add('tab-active');
    }

    if (tabName === 'memories') {
        document.body.classList.add('memories-active');
        document.body.classList.remove('history-active', 'signwall-active');
        loadMemories();
    } else if (tabName === 'signwall') {
        document.body.classList.add('signwall-active');
        document.body.classList.remove('memories-active', 'history-active');
        renderSignWall();
    } else if (tabName === 'history') {
        document.body.classList.add('history-active');
        document.body.classList.remove('memories-active', 'signwall-active');
        renderTimeline();
    } else {
        document.body.classList.remove('memories-active', 'history-active', 'signwall-active');
    }
}

// Memories gallery - MEMORY_IMAGES loaded from public/img/images.js
// Run ./generate-images.sh after adding new images
const IMG_BASE = 'public/img/';
const DEFAULT_AUTHOR = '@entytaiment25';
let memoriesLoaded = false;

function parseTimestamp(entry, filename) {
    // Try YYYY-MM-DD_HH.MM.SS pattern
    let m = filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})\.(\d{2})\.(\d{2})/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
    // Try YYYY-MM-DD_HH-MM-SS pattern
    m = filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
    // Try YYYY-MM-DD (date only)
    m = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}`);
    // Fall back to explicit timestamp from the entry
    if (entry.timestamp) return new Date(entry.timestamp);
    return new Date(0);
}

function loadMemories() {
    if (memoriesLoaded) return;

    const gallery = document.getElementById('memoriesGallery');

    const sorted = [...MEMORY_IMAGES]
        .map(entry => {
            const isObj = typeof entry === 'object';
            const file = isObj ? entry.file : entry;
            const author = isObj ? entry.author : null;
            return { file, date: parseTimestamp(isObj ? entry : {}, file), author };
        })
        .sort((a, b) => b.date - a.date);

    gallery.innerHTML = '';

    if (sorted.length === 0) {
        gallery.innerHTML = '<div class="memories-empty">No memories yet</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    sorted.forEach(({ file, date, author }) => {
        const src = IMG_BASE + file;
        const displayAuthor = author || DEFAULT_AUTHOR;
        const item = document.createElement('div');
        item.className = 'memory-item';

        const img = document.createElement('img');
        img.src = src;
        img.alt = file;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onload = () => img.classList.add('loaded');
        img.onclick = () => openLightbox(src, date, displayAuthor);

        const overlay = document.createElement('div');
        overlay.className = 'memory-overlay';

        const authorEl = document.createElement('span');
        authorEl.className = 'memory-author';
        authorEl.textContent = displayAuthor;
        overlay.appendChild(authorEl);

        const dateStr = date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const dateEl = document.createElement('span');
        dateEl.className = 'memory-date';
        dateEl.textContent = dateStr;
        overlay.appendChild(dateEl);

        item.appendChild(img);
        item.appendChild(overlay);
        fragment.appendChild(item);
    });

    gallery.appendChild(fragment);
    memoriesLoaded = true;
}

function openLightbox(src, date, author) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    const captionEl = document.getElementById('lightboxCaption');

    img.src = src;
    let text = author || '';
    if (date instanceof Date && date.getTime() > 0) {
        const dateStr = date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        text += (text ? ' · ' : '') + dateStr;
    }
    captionEl.textContent = text;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
    if (event && event.target !== event.currentTarget && event.target.id !== 'lightboxImg') return;
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    const isMemories = document.getElementById('tab-memories').style.display !== 'none';
    const isHistory = document.getElementById('tab-history').style.display !== 'none';
    document.body.style.overflow = (isMemories || isHistory) ? '' : 'hidden';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
});

// -- Sign Wall --
// Signs loaded from signs.json
// Each sign: { col, row, text, color, glow }
// Grid size computed dynamically from actual sign positions

let signWallRendered = false;
let signWallData = null;
let signWallInteractionsBound = false;

function setupSignWallInteractions() {
    if (signWallInteractionsBound) return;
    const container = document.getElementById('signWallContainer');
    if (!container) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    container.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = container.scrollLeft;
        startTop = container.scrollTop;
        container.classList.add('dragging');
        container.setPointerCapture?.(event.pointerId);
    });

    container.addEventListener('pointermove', event => {
        if (!isDragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        container.scrollLeft = startLeft - dx;
        container.scrollTop = startTop - dy;
        event.preventDefault();
    });

    const endDrag = event => {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('dragging');
        if (container.hasPointerCapture?.(event.pointerId)) {
            container.releasePointerCapture?.(event.pointerId);
        }
    };

    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    container.addEventListener('pointerleave', endDrag);

    container.addEventListener('wheel', event => {
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        if (maxScrollLeft <= 0) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;
        container.scrollLeft += delta;
        event.preventDefault();
    }, { passive: false });

    signWallInteractionsBound = true;
}

// Convert Minecraft ARGB hex (#ffRRGGBB) to CSS hex (#RRGGBB)
function convertColor(color) {
    if (!color) return '#000000';
    // Strip # prefix
    const hex = color.replace('#', '');
    // If 8 chars (ARGB), drop first 2 (alpha)
    if (hex.length === 8) return '#' + hex.substring(2);
    return color;
}

async function loadSignData() {
    if (signWallData) return signWallData;
    try {
        const res = await fetch('signs.json');
        if (!res.ok) throw new Error('Failed to load signs');
        signWallData = await res.json();
    } catch (e) {
        console.error('Error loading sign data:', e);
        signWallData = [];
    }
    return signWallData;
}

async function renderSignWall() {
    setupSignWallInteractions();
    if (signWallRendered) return;

    const signs = await loadSignData();
    const grid = document.getElementById('signWallGrid');
    grid.innerHTML = '';

    if (signs.length === 0) {
        signWallRendered = true;
        return;
    }

    // Group signs by row to preserve the original row ordering
    const rowGroups = {};
    let minCol = Infinity;
    let maxCol = -Infinity;
    signs.forEach(sign => {
        const r = sign.row ?? 0;
        const c = sign.col ?? 0;
        if (!rowGroups[r]) rowGroups[r] = [];
        rowGroups[r].push(sign);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
    });

    const COLS = maxCol - minCol + 1;

    // Map sign rows to wall rows - row 0 in JSON = bottom of wall, no gaps
    const rowMapping = {};
    const usedRows = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);
    usedRows.forEach((r, i) => {
        // Bottom-up, consecutive: row 0 -> 5, row 1 -> 4, row 2 -> 3
        rowMapping[r] = usedRows.length - 1 - i;
    });

    // Build lookup: wallRow -> Map<col, sign>
    // Use actual col values, shifted left to remove empty columns
    const wallSignMap = new Map();
    for (const [signRow, group] of Object.entries(rowGroups)) {
        const wallRow = rowMapping[signRow] ?? parseInt(signRow, 10);
        group.forEach(sign => {
            const col = (sign.col ?? 0) - minCol;
            wallSignMap.set(`${col},${wallRow}`, sign);
        });
    }

    // Apply dynamic grid sizing using CSS-defined cell size
    const gridStyles = getComputedStyle(grid);
    const cellSize = parseFloat(gridStyles.getPropertyValue('--sign-cell-size')) || 80;
    grid.style.gridTemplateColumns = `repeat(${COLS}, ${cellSize}px)`;
    grid.style.gridAutoRows = `${cellSize}px`;
    grid.style.minWidth = `${COLS * cellSize}px`;

    let signCounter = 0;
    for (let row = 0; row < usedRows.length; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'copper-cell';

            // Copper block background
            const block = document.createElement('div');
            block.className = 'copper-block';
            const hueShift = (Math.random() - 0.5) * 8;
            const lightShift = (Math.random() - 0.5) * 5;
            block.style.filter = `hue-rotate(${hueShift}deg) brightness(${1 + lightShift / 100})`;
            cell.appendChild(block);

            // Place sign if this cell has one
            const key = `${col},${row}`;
            if (wallSignMap.has(key)) {
                const sign = wallSignMap.get(key);
                const signEl = document.createElement('div');
                signEl.className = 'wall-sign';
                signEl.style.animationDelay = `${signCounter * 0.006}s`;
                signCounter++;

                const cssColor = convertColor(sign.color);
                const lines = sign.text.split('\n').slice(0, 4);
                lines.forEach(line => {
                    const lineEl = document.createElement('div');
                    lineEl.className = 'sign-line';
                    lineEl.textContent = line;
                    lineEl.style.color = cssColor;
                    signEl.appendChild(lineEl);
                });

                cell.appendChild(signEl);
            }

            grid.appendChild(cell);
        }
    }

    signWallRendered = true;
}

// -- History Timeline --
let historyEvents = [];
let historyThanks = [];
let historyLoaded = false;
let timelineRendered = false;

async function loadHistoryEvents() {
    if (historyLoaded) return true;

    try {
        const response = await fetch('history.json');
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        if (Array.isArray(data)) {
            historyEvents = data;
            historyThanks = [];
        } else {
            historyEvents = Array.isArray(data?.events) ? data.events : [];
            historyThanks = Array.isArray(data?.thanks) ? data.thanks : [];
        }
        historyLoaded = true;
        return true;
    } catch (error) {
        console.error('Error loading history:', error);
        return false;
    }
}

function renderThanksList() {
    const thanksSection = document.querySelector('.history-thanks');
    const list = document.getElementById('historyThanksList');
    if (!thanksSection || !list) return;

    if (!historyThanks.length) {
        thanksSection.style.display = 'none';
        return;
    }

    thanksSection.style.display = '';
    list.innerHTML = '';

    const sortedThanks = [...historyThanks]
        .map(entry => {
            const name = entry?.name || 'Unknown';
            const trusted = Boolean(entry?.trusted);
            const contribution = entry?.contribution || '';
            const fullText = `${name}${trusted ? ' [trusted]' : ''}${contribution ? ' - ' + contribution : ''}`;
            return { name, trusted, contribution, fullText };
        })
        .sort((a, b) => b.fullText.length - a.fullText.length);

    sortedThanks.forEach(entry => {
        const item = document.createElement('li');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'thanks-name';
        nameSpan.textContent = entry.name;
        item.appendChild(nameSpan);

        if (entry.trusted) {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'thanks-tag';
            tagSpan.textContent = '[trusted]';
            item.appendChild(document.createTextNode(' '));
            item.appendChild(tagSpan);
        }

        if (entry.contribution) {
            item.appendChild(document.createTextNode(` - ${entry.contribution}`));
        }

        list.appendChild(item);
    });
}

async function renderTimeline() {
    if (timelineRendered) return;
    const container = document.getElementById('historyTimeline');
    container.innerHTML = '';

    const loaded = await loadHistoryEvents();
    renderThanksList();
    if (!loaded || !Array.isArray(historyEvents) || historyEvents.length === 0) {
        container.innerHTML = '<div class="history-empty">No history yet</div>';
        timelineRendered = true;
        return;
    }

    const sorted = [...historyEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach((evt, i) => {
        const node = document.createElement('div');
        node.className = 'tl-node';
        node.style.animationDelay = `${i * 0.12}s`;

        const dot = document.createElement('div');
        dot.className = 'tl-dot tl-cat-' + evt.category;

        const card = document.createElement('div');
        card.className = 'tl-card';

        const dateEl = document.createElement('span');
        dateEl.className = 'tl-date';
        dateEl.textContent = new Date(evt.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        const title = document.createElement('h3');
        title.className = 'tl-title';
        title.textContent = evt.title;

        const desc = document.createElement('p');
        desc.className = 'tl-desc';
        desc.textContent = evt.description;

        card.appendChild(dateEl);
        card.appendChild(title);
        card.appendChild(desc);

        node.appendChild(dot);
        node.appendChild(card);
        container.appendChild(node);
    });

    timelineRendered = true;
}
