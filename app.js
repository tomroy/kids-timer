/**
 * 兒童視覺化計時器 Kids Timer - 核心應用程式邏輯
 * 包含：SVG 扇形視覺化錶盤、觸控/滑鼠拖曳角度計算、雙模式與自訂模式、
 * 任務圖示管理、Web Audio 音效合成器、慶祝彩帶動畫、兒童防誤觸鎖與 Wake Lock。
 */

(() => {
  'use strict';

  // ==========================================================================
  // 1. 常數與預設資料定義
  // ==========================================================================
  const CLOCK_CENTER = 250;
  const SECTOR_RADIUS = 168;

  // 預設色塊主題選項
  const COLOR_THEMES = [
    {
      id: 'blue',
      name: '天空藍',
      primary: '#2563eb',
      dark: '#1d4ed8',
      light: '#dbeafe',
      soft: '#eff6ff',
      bgStart: '#f0f7ff',
      bgEnd: '#dbeafe'
    },
    {
      id: 'red',
      name: '活力紅',
      primary: '#ef4444',
      dark: '#dc2626',
      light: '#fee2e2',
      soft: '#fef2f2',
      bgStart: '#fff5f5',
      bgEnd: '#fee2e2'
    },
    {
      id: 'green',
      name: '森林綠',
      primary: '#10b981',
      dark: '#059669',
      light: '#d1fae5',
      soft: '#ecfdf5',
      bgStart: '#f0fdf4',
      bgEnd: '#d1fae5'
    },
    {
      id: 'orange',
      name: '陽光橘',
      primary: '#f97316',
      dark: '#ea580c',
      light: '#ffedd5',
      soft: '#fff7ed',
      bgStart: '#fffaf0',
      bgEnd: '#ffedd5'
    },
    {
      id: 'purple',
      name: '夢幻紫',
      primary: '#8b5cf6',
      dark: '#7c3aed',
      light: '#ede9fe',
      soft: '#f5f3ff',
      bgStart: '#faf5ff',
      bgEnd: '#ede9fe'
    },
    {
      id: 'pink',
      name: '蜜桃粉',
      primary: '#ec4899',
      dark: '#db2777',
      light: '#fce7f3',
      soft: '#fdf2f8',
      bgStart: '#fff5f9',
      bgEnd: '#fce7f3'
    }
  ];

  // 預設兒童日常任務清單
  const DEFAULT_TASKS = [
    { id: 'toys', emoji: '🧸', name: '收玩具時間', defaultMin: 5, mode: 'fast12' },
    { id: 'brush', emoji: '🪥', name: '刷牙洗臉', defaultMin: 3, mode: 'fast12' },
    { id: 'read', emoji: '📚', name: '看書閱讀', defaultMin: 15, mode: 'fast12' },
    { id: 'homework', emoji: '✏️', name: '寫作業', defaultMin: 25, mode: 'slow60' },
    { id: 'meal', emoji: '🍽️', name: '吃飯時間', defaultMin: 30, mode: 'slow60' },
    { id: 'play', emoji: '🎮', name: '遊戲時間', defaultMin: 20, mode: 'slow60' },
    { id: 'bath', emoji: '🛁', name: '洗澡時間', defaultMin: 15, mode: 'fast12' },
    { id: 'sleep', emoji: '🛏️', name: '準備睡覺', defaultMin: 10, mode: 'fast12' }
  ];

  // 新增自訂任務時可選的 Emoji
  const EMOJI_CHOICES = [
    '🎹', '🎨', '🧩', '👟', '🎒', '🧹', '🥛', '🍎',
    '🚲', '🐶', '🪴', '🧘', '📺', '⏱️', '🌟', '🚀'
  ];

  // ==========================================================================
  // 2. 應用程式狀態 (State)
  // ==========================================================================
  const state = {
    mode: 'fast12',            // 'fast12' (藍色快鐘 15分) | 'slow60' | 'custom'
    maxMinutes: 15,            // 當前轉盤一圈代表的最大分鐘數
    totalSeconds: 5 * 60,      // 設定的總秒數
    remainingSeconds: 5 * 60,  // 目前剩餘秒數（支援小數點以呈現平滑動畫）
    isRunning: false,
    isDragging: false,
    lastDragAngle: null,
    endTimeMs: null,           // 倒數目標時間戳記
    animFrameId: null,
    lastWholeSecond: null,

    // 使用者偏好與設定
    tickSoundEnabled: false,
    childLocked: false,
    showDigital: true,
    lastMinutePulse: true,
    alarmSound: 'xylophone',   // 'xylophone' | 'chime' | 'harp' | 'beep'
    customMaxMinutes: 30,
    customColorId: 'green',

    // 任務清單與當前選中任務
    tasks: [...DEFAULT_TASKS],
    activeTaskId: 'toys',
    selectedNewEmoji: '🎹'
  };

  // 讀取 localStorage 儲存的偏好設定
  function loadSavedSettings() {
    try {
      const raw = localStorage.getItem('kids_timer_settings_v1');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.customMaxMinutes) state.customMaxMinutes = Number(saved.customMaxMinutes);
      if (saved.customColorId) state.customColorId = saved.customColorId;
      if (saved.alarmSound) state.alarmSound = saved.alarmSound;
      if (typeof saved.showDigital === 'boolean') state.showDigital = saved.showDigital;
      if (typeof saved.lastMinutePulse === 'boolean') state.lastMinutePulse = saved.lastMinutePulse;
      if (typeof saved.tickSoundEnabled === 'boolean') state.tickSoundEnabled = saved.tickSoundEnabled;
      if (Array.isArray(saved.customTasks)) {
        state.tasks = [...DEFAULT_TASKS, ...saved.customTasks];
      }
    } catch (err) {
      console.warn('無法讀取儲存的設定：', err);
    }
  }

  function saveSettings() {
    try {
      const customTasks = state.tasks.filter((t) => t.isCustom);
      localStorage.setItem(
        'kids_timer_settings_v1',
        JSON.stringify({
          customMaxMinutes: state.customMaxMinutes,
          customColorId: state.customColorId,
          alarmSound: state.alarmSound,
          showDigital: state.showDigital,
          lastMinutePulse: state.lastMinutePulse,
          tickSoundEnabled: state.tickSoundEnabled,
          customTasks
        })
      );
    } catch (err) {
      console.warn('無法寫入設定：', err);
    }
  }

  // ==========================================================================
  // 3. Web Audio 音效合成器（無須外部音檔，支援離線播放）
  // ==========================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.alarmInterval = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // 播放單一音符
    playTone(freq, startTime, duration, type = 'sine', peakGain = 0.22) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    }

    // 秒針滴答聲
    playTick() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.playTone(950, now, 0.035, 'triangle', 0.06);
    }

    // 拖曳轉盤時的輕微刻度聲
    playStepClick() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.playTone(620, now, 0.025, 'sine', 0.05);
    }

    // 根據選擇的音效類型播放一段提醒旋律
    playAlarmPattern(soundType = state.alarmSound) {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const cleanType = soundType.trim();

      if (cleanType === 'xylophone') {
        // 歡樂木琴：C5 - E5 - G5 - C6 - G5 - C6
        const notes = [
          { f: 523.25, t: 0.0, d: 0.18 },
          { f: 659.25, t: 0.16, d: 0.18 },
          { f: 783.99, t: 0.32, d: 0.18 },
          { f: 1046.5, t: 0.48, d: 0.32 },
          { f: 783.99, t: 0.82, d: 0.18 },
          { f: 1046.5, t: 1.0, d: 0.45 }
        ];
        notes.forEach((n) => this.playTone(n.f, now + n.t, n.d, 'triangle', 0.28));
      } else if (cleanType === 'chime') {
        // 清脆鐘聲
        const notes = [
          { f: 880, t: 0.0, d: 0.6 },
          { f: 1174.66, t: 0.35, d: 0.6 },
          { f: 1318.51, t: 0.7, d: 0.9 }
        ];
        notes.forEach((n) => this.playTone(n.f, now + n.t, n.d, 'sine', 0.25));
      } else if (cleanType === 'harp') {
        // 溫柔豎琴琶音
        const freqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
        freqs.forEach((f, idx) => {
          this.playTone(f, now + idx * 0.11, 0.55, 'sine', 0.2);
        });
      } else {
        // 經典鬧鈴嗶嗶聲
        for (let i = 0; i < 4; i++) {
          this.playTone(880, now + i * 0.22, 0.12, 'square', 0.15);
        }
      }
    }

    startAlarmLoop() {
      this.stopAlarmLoop();
      this.playAlarmPattern(state.alarmSound);
      this.alarmInterval = setInterval(() => {
        this.playAlarmPattern(state.alarmSound);
      }, 2200);
    }

    stopAlarmLoop() {
      if (this.alarmInterval) {
        clearInterval(this.alarmInterval);
        this.alarmInterval = null;
      }
    }
  }

  const sound = new SoundEngine();

  // ==========================================================================
  // 4. DOM 元素參照
  // ==========================================================================
  const dom = {
    metaThemeColor: document.getElementById('meta-theme-color'),
    taskList: document.getElementById('task-list'),
    activeTaskEmoji: document.getElementById('active-task-emoji'),
    activeTaskName: document.getElementById('active-task-name'),
    clockCenterEmoji: document.getElementById('clock-center-emoji'),

    modeTabs: document.querySelectorAll('.mode-tab'),
    customModeDot: document.getElementById('custom-mode-dot'),
    customModeDesc: document.getElementById('custom-mode-desc'),

    clockWrapper: document.getElementById('clock-wrapper'),
    timerSvg: document.getElementById('timer-svg'),
    clockTrackBg: document.getElementById('clock-track-bg'),
    timerSector: document.getElementById('timer-sector'),
    clockTicks: document.getElementById('clock-ticks'),
    clockNumbers: document.getElementById('clock-numbers'),
    timerHandLine: document.getElementById('timer-hand-line'),
    timerHandle: document.getElementById('timer-handle'),
    timerHandleDot: document.getElementById('timer-handle-dot'),
    lockToast: document.getElementById('lock-toast'),

    digitalDisplay: document.getElementById('digital-display'),
    timeText: document.getElementById('time-text'),
    digitalStatus: document.getElementById('digital-status'),

    btnMinus1: document.getElementById('btn-minus-1'),
    btnPlus1: document.getElementById('btn-plus-1'),
    btnPlus5: document.getElementById('btn-plus-5'),
    btnStartPause: document.getElementById('btn-start-pause'),
    startPauseIcon: document.getElementById('start-pause-icon'),
    startPauseText: document.getElementById('start-pause-text'),
    btnReset: document.getElementById('btn-reset'),

    btnTick: document.getElementById('btn-tick'),
    tickIcon: document.getElementById('tick-icon'),
    btnLock: document.getElementById('btn-lock'),
    lockIcon: document.getElementById('lock-icon'),
    lockLabel: document.getElementById('lock-label'),
    btnSettings: document.getElementById('btn-settings'),
    btnFullscreen: document.getElementById('btn-fullscreen'),

    // 設定彈窗
    settingsModal: document.getElementById('settings-modal'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    customMaxPresets: document.getElementById('custom-max-presets'),
    inputCustomMax: document.getElementById('input-custom-max'),
    colorSwatches: document.getElementById('color-swatches'),
    soundOptions: document.getElementById('sound-options'),
    toggleShowDigital: document.getElementById('toggle-show-digital'),
    toggleLastMinutePulse: document.getElementById('toggle-last-minute-pulse'),

    // 自訂任務彈窗
    customTaskModal: document.getElementById('custom-task-modal'),
    btnCloseCustomTask: document.getElementById('btn-close-custom-task'),
    emojiPicker: document.getElementById('emoji-picker'),
    inputTaskName: document.getElementById('input-task-name'),
    inputTaskDefaultMin: document.getElementById('input-task-default-min'),
    btnAddTask: document.getElementById('btn-add-task'),

    // 時間到彈窗
    alarmModal: document.getElementById('alarm-modal'),
    alarmEmoji: document.getElementById('alarm-emoji'),
    alarmSubtitle: document.getElementById('alarm-subtitle'),
    btnDismissAlarm: document.getElementById('btn-dismiss-alarm'),
    btnAdd2Min: document.getElementById('btn-add-2min'),

    confettiCanvas: document.getElementById('confetti-canvas')
  };

  // ==========================================================================
  // 5. 螢幕恆亮 (Screen Wake Lock API)
  // ==========================================================================
  let wakeLockSentinel = null;

  async function requestWakeLock() {
    if ('wakeLock' in navigator && state.isRunning) {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
      } catch (_) {
        // 部分瀏覽器或低電量模式不支援時靜默忽略
      }
    }
  }

  function releaseWakeLock() {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.isRunning) {
      requestWakeLock();
    }
  });

  // ==========================================================================
  // 6. 主題色彩與錶盤刻度繪製
  // ==========================================================================
  function getActiveColorTheme() {
    if (state.mode === 'fast12') {
      return COLOR_THEMES.find((c) => c.id === 'blue');
    }
    if (state.mode === 'slow60') {
      return COLOR_THEMES.find((c) => c.id === 'red');
    }
    return COLOR_THEMES.find((c) => c.id === state.customColorId) || COLOR_THEMES[2];
  }

  function applyThemeColors() {
    const theme = getActiveColorTheme();
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-primary-dark', theme.dark);
    root.style.setProperty('--theme-primary-light', theme.light);
    root.style.setProperty('--theme-primary-soft', theme.soft);
    root.style.setProperty('--bg-gradient-start', theme.bgStart);
    root.style.setProperty('--bg-gradient-end', theme.bgEnd);

    dom.metaThemeColor.setAttribute('content', theme.primary);
    dom.timerSector.setAttribute('fill', theme.primary);
    dom.clockTrackBg.setAttribute('fill', theme.soft);
    dom.timerHandle.setAttribute('stroke', theme.primary);
    dom.timerHandleDot.setAttribute('fill', theme.primary);

    // 更新自訂模式按鈕上的小圓點與描述
    const customTheme = COLOR_THEMES.find((c) => c.id === state.customColorId) || COLOR_THEMES[2];
    dom.customModeDot.style.background = customTheme.primary;
    dom.customModeDesc.textContent = `最高 ${state.customMaxMinutes} 分鐘`;
  }

  // 極座標轉笛卡兒座標（0 度在正上方 12 點鐘方向，順時針增加）
  function polarToCartesian(cx, cy, radius, angleDegrees) {
    const angleRad = ((angleDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad)
    };
  }

  // 動態產生錶盤刻度與數字
  function renderClockFaceDial() {
    dom.clockTicks.innerHTML = '';
    dom.clockNumbers.innerHTML = '';

    const maxMin = state.maxMinutes;
    // 決定主刻度間隔（讓錶盤保持清晰易讀）
    let majorStep = 1;
    let minorDivisions = 60;

    if (maxMin <= 15) {
      majorStep = 1;
      minorDivisions = maxMin * 4; // 每 15 秒一細格
    } else if (maxMin <= 20) {
      majorStep = 2;
      minorDivisions = maxMin * 2;
    } else if (maxMin <= 30) {
      majorStep = 5;
      minorDivisions = maxMin;
    } else if (maxMin <= 60) {
      majorStep = 5;
      minorDivisions = 60;
    } else if (maxMin <= 90) {
      majorStep = 10;
      minorDivisions = 90;
    } else {
      majorStep = 15;
      minorDivisions = 60;
    }

    // 繪製細刻度與分鐘刻度
    for (let i = 0; i < minorDivisions; i++) {
      const angle = (i / minorDivisions) * 360;
      const minuteValue = (i / minorDivisions) * maxMin;
      const isMajor = Math.abs(minuteValue - Math.round(minuteValue)) < 0.001 &&
                      Math.round(minuteValue) % majorStep === 0;

      const outerR = 176;
      const innerR = isMajor ? 160 : 168;
      const p1 = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, outerR, angle);
      const p2 = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, innerR, angle);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1.x.toFixed(2));
      line.setAttribute('y1', p1.y.toFixed(2));
      line.setAttribute('x2', p2.x.toFixed(2));
      line.setAttribute('y2', p2.y.toFixed(2));
      line.setAttribute('stroke', isMajor ? '#0f172a' : '#94a3b8');
      line.setAttribute('stroke-width', isMajor ? '3.5' : '1.8');
      line.setAttribute('stroke-linecap', 'round');
      dom.clockTicks.appendChild(line);
    }

    // 繪製主刻度數字
    const numSteps = Math.floor(maxMin / majorStep);
    for (let s = 1; s <= numSteps; s++) {
      const minuteNum = s * majorStep;
      const angle = (minuteNum / maxMin) * 360;
      // 若剛好在 360 度則顯示最大分鐘數於 12 點鐘位置
      const pos = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, 200, angle === 360 ? 0 : angle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x.toFixed(2));
      text.setAttribute('y', pos.y.toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', '#0f172a');
      text.setAttribute('font-size', maxMin <= 15 ? '19' : '18');
      text.setAttribute('font-weight', '800');
      text.textContent = String(minuteNum);
      dom.clockNumbers.appendChild(text);
    }
  }

  // 更新扇形色塊、指針與數位時間顯示
  function updateClockVisuals() {
    const maxSeconds = state.maxMinutes * 60;
    const clampedRemaining = Math.max(0, Math.min(state.remainingSeconds, maxSeconds));
    const ratio = maxSeconds > 0 ? clampedRemaining / maxSeconds : 0;
    const angle = ratio * 360;

    // 繪製 SVG 扇形路徑
    if (angle <= 0.05) {
      dom.timerSector.setAttribute('d', '');
    } else if (angle >= 359.9) {
      // 滿圈時使用兩個半圓繪製完整圓形
      const r = SECTOR_RADIUS;
      const c = CLOCK_CENTER;
      const fullCirclePath = [
        `M ${c} ${c - r}`,
        `A ${r} ${r} 0 1 1 ${c} ${c + r}`,
        `A ${r} ${r} 0 1 1 ${c} ${c - r}`,
        'Z'
      ].join(' ');
      dom.timerSector.setAttribute('d', fullCirclePath);
    } else {
      const startPt = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, SECTOR_RADIUS, 0);
      const endPt = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, SECTOR_RADIUS, angle);
      const largeArcFlag = angle > 180 ? 1 : 0;
      const d = [
        `M ${CLOCK_CENTER} ${CLOCK_CENTER}`,
        `L ${startPt.x.toFixed(2)} ${startPt.y.toFixed(2)}`,
        `A ${SECTOR_RADIUS} ${SECTOR_RADIUS} 0 ${largeArcFlag} 1 ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)}`,
        'Z'
      ].join(' ');
      dom.timerSector.setAttribute('d', d);
    }

    // 更新指針與握把位置
    const handlePt = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, SECTOR_RADIUS, angle);
    dom.timerHandLine.setAttribute('x2', handlePt.x.toFixed(2));
    dom.timerHandLine.setAttribute('y2', handlePt.y.toFixed(2));
    dom.timerHandle.setAttribute('cx', handlePt.x.toFixed(2));
    dom.timerHandle.setAttribute('cy', handlePt.y.toFixed(2));
    dom.timerHandleDot.setAttribute('cx', handlePt.x.toFixed(2));
    dom.timerHandleDot.setAttribute('cy', handlePt.y.toFixed(2));

    // 倒數最後 60 秒呼吸閃爍提醒
    if (state.isRunning && state.lastMinutePulse && clampedRemaining > 0 && clampedRemaining <= 60) {
      dom.timerSector.classList.add('urgent-pulse');
    } else {
      dom.timerSector.classList.remove('urgent-pulse');
    }

    // 更新數位時間顯示
    const displaySec = Math.ceil(clampedRemaining);
    const mins = Math.floor(displaySec / 60);
    const secs = displaySec % 60;
    if (state.showDigital) {
      dom.digitalDisplay.classList.remove('hidden-digits');
      dom.timeText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      dom.digitalDisplay.classList.add('hidden-digits');
      dom.timeText.textContent = `約 ${Math.ceil(displaySec / 60)} 分鐘`;
    }

    if (state.isRunning) {
      dom.digitalStatus.textContent = '倒數計時進行中...';
    } else if (clampedRemaining <= 0) {
      dom.digitalStatus.textContent = '請轉動圓盤設定時間';
    } else {
      dom.digitalStatus.textContent = '點擊「開始計時」或拖曳轉盤';
    }
  }

  // ==========================================================================
  // 7. 觸控 / 滑鼠拖曳錶盤設定時間
  // ==========================================================================
  function getPointerAngleDegrees(clientX, clientY) {
    const rect = dom.timerSvg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // 計算從 12 點鐘方向順時針的角度 (0 ~ 360)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  }

  function applyAngleToTime(rawAngle) {
    let angle = rawAngle;

    // 防止從 350° 順時針跨過 0° 時瞬間跳回 0，或從 10° 逆時針跨過 0° 時跳到滿圈
    if (state.lastDragAngle !== null) {
      const diff = angle - state.lastDragAngle;
      if (diff < -180) {
        // 順時針跨過 12 點鐘方向 -> 鎖定在滿圈 360 度
        angle = 360;
      } else if (diff > 180) {
        // 逆時針跨過 12 點鐘方向 -> 鎖定在 0 度
        angle = 0;
      }
    }
    state.lastDragAngle = angle;

    const maxSeconds = state.maxMinutes * 60;
    const rawSeconds = (angle / 360) * maxSeconds;

    // 決定吸附刻度（15 分鐘以下以 15 秒為單位，其餘以 30 秒或 60 秒為單位）
    const snapStep = state.maxMinutes <= 15 ? 15 : 30;
    const snappedSeconds = Math.round(rawSeconds / snapStep) * snapStep;

    if (snappedSeconds !== Math.round(state.remainingSeconds)) {
      sound.playStepClick();
    }

    state.totalSeconds = snappedSeconds;
    state.remainingSeconds = snappedSeconds;

    if (state.isRunning) {
      state.endTimeMs = performance.now() + state.remainingSeconds * 1000;
    }

    updateClockVisuals();
  }

  function showLockedToast() {
    dom.lockToast.classList.remove('hidden');
    clearTimeout(showLockedToast.timer);
    showLockedToast.timer = setTimeout(() => {
      dom.lockToast.classList.add('hidden');
    }, 2200);
  }

  function initDialDragEvents() {
    dom.timerSvg.addEventListener('pointerdown', (e) => {
      if (state.childLocked) {
        showLockedToast();
        return;
      }
      e.preventDefault();
      dom.timerSvg.setPointerCapture(e.pointerId);
      state.isDragging = true;
      state.lastDragAngle = (state.remainingSeconds / (state.maxMinutes * 60)) * 360;
      const angle = getPointerAngleDegrees(e.clientX, e.clientY);
      applyAngleToTime(angle);
    });

    dom.timerSvg.addEventListener('pointermove', (e) => {
      if (!state.isDragging) return;
      e.preventDefault();
      const angle = getPointerAngleDegrees(e.clientX, e.clientY);
      applyAngleToTime(angle);
    });

    const endDrag = (e) => {
      if (!state.isDragging) return;
      state.isDragging = false;
      state.lastDragAngle = null;
      try {
        dom.timerSvg.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };

    dom.timerSvg.addEventListener('pointerup', endDrag);
    dom.timerSvg.addEventListener('pointercancel', endDrag);
  }

  // ==========================================================================
  // 8. 計時器核心控制（開始、暫停、重設、時間微調）
  // ==========================================================================
  function updateStartPauseButtonUI() {
    if (state.isRunning) {
      dom.btnStartPause.classList.add('running');
      dom.startPauseIcon.textContent = '⏸';
      dom.startPauseText.textContent = '暫停計時';
    } else {
      dom.btnStartPause.classList.remove('running');
      dom.startPauseIcon.textContent = '▶';
      dom.startPauseText.textContent = state.remainingSeconds < state.totalSeconds && state.remainingSeconds > 0
        ? '繼續計時'
        : '開始計時';
    }
  }

  function tickLoop(nowMs) {
    if (!state.isRunning) return;

    if (!state.isDragging) {
      const remainingMs = state.endTimeMs - nowMs;
      if (remainingMs <= 0) {
        state.remainingSeconds = 0;
        updateClockVisuals();
        handleTimerComplete();
        return;
      }

      state.remainingSeconds = remainingMs / 1000;
      const currentWholeSecond = Math.ceil(state.remainingSeconds);

      if (state.lastWholeSecond !== currentWholeSecond) {
        state.lastWholeSecond = currentWholeSecond;
        if (state.tickSoundEnabled && currentWholeSecond > 0) {
          sound.playTick();
        }
      }

      updateClockVisuals();
    }

    state.animFrameId = requestAnimationFrame(tickLoop);
  }

  function startTimer() {
    if (state.remainingSeconds <= 0) {
      // 若時間為 0，預設給 5 分鐘（或最大時間的一半）
      const fallback = Math.min(5, state.maxMinutes) * 60;
      state.totalSeconds = fallback;
      state.remainingSeconds = fallback;
    }

    sound.ensureContext();
    state.isRunning = true;
    state.endTimeMs = performance.now() + state.remainingSeconds * 1000;
    state.lastWholeSecond = Math.ceil(state.remainingSeconds);
    updateStartPauseButtonUI();
    requestWakeLock();

    cancelAnimationFrame(state.animFrameId);
    state.animFrameId = requestAnimationFrame(tickLoop);
  }

  function pauseTimer() {
    state.isRunning = false;
    cancelAnimationFrame(state.animFrameId);
    releaseWakeLock();
    updateStartPauseButtonUI();
    updateClockVisuals();
  }

  function resetTimer() {
    if (state.childLocked) {
      showLockedToast();
      return;
    }
    pauseTimer();
    const maxSec = state.maxMinutes * 60;
    state.remainingSeconds = Math.min(state.totalSeconds || 300, maxSec);
    updateStartPauseButtonUI();
    updateClockVisuals();
  }

  function adjustSeconds(deltaSeconds) {
    if (state.childLocked) {
      showLockedToast();
      return;
    }
    const maxSec = state.maxMinutes * 60;
    const nextSec = Math.max(0, Math.min(maxSec, Math.round(state.remainingSeconds) + deltaSeconds));
    state.remainingSeconds = nextSec;
    state.totalSeconds = nextSec;
    if (state.isRunning) {
      state.endTimeMs = performance.now() + nextSec * 1000;
    }
    sound.playStepClick();
    updateStartPauseButtonUI();
    updateClockVisuals();
  }

  // 當倒數歸零時觸發慶祝與提醒
  function handleTimerComplete() {
    pauseTimer();
    const currentTask = state.tasks.find((t) => t.id === state.activeTaskId) || state.tasks[0];
    dom.alarmEmoji.textContent = currentTask ? currentTask.emoji : '🎉';
    dom.alarmSubtitle.textContent = `「${currentTask ? currentTask.name : '計時任務'}」時間到囉！做得太棒了！`;
    dom.alarmModal.classList.remove('hidden');

    sound.startAlarmLoop();
    startConfetti();
  }

  function dismissAlarm() {
    sound.stopAlarmLoop();
    stopConfetti();
    dom.alarmModal.classList.add('hidden');
    // 恢復到上次設定的總時間方便下次使用
    state.remainingSeconds = state.totalSeconds;
    updateStartPauseButtonUI();
    updateClockVisuals();
  }

  // ==========================================================================
  // 9. 模式切換與任務清單渲染
  // ==========================================================================
  function switchClockMode(newMode, targetMinutes = null) {
    if (state.childLocked) {
      showLockedToast();
      return;
    }
    pauseTimer();
    state.mode = newMode;

    if (newMode === 'fast12') {
      state.maxMinutes = 15;
    } else if (newMode === 'slow60') {
      state.maxMinutes = 60;
    } else {
      state.maxMinutes = state.customMaxMinutes;
    }

    // 更新 Tab 外觀
    dom.modeTabs.forEach((tab) => {
      const isMatch = tab.dataset.mode === newMode;
      tab.classList.toggle('active', isMatch);
      tab.setAttribute('aria-selected', String(isMatch));
    });

    const maxSec = state.maxMinutes * 60;
    if (targetMinutes !== null) {
      state.totalSeconds = Math.min(targetMinutes * 60, maxSec);
      state.remainingSeconds = state.totalSeconds;
    } else if (state.remainingSeconds > maxSec || state.remainingSeconds === 0) {
      const defaultMin = newMode === 'fast12' ? 5 : newMode === 'slow60' ? 20 : Math.round(state.maxMinutes / 2);
      state.totalSeconds = defaultMin * 60;
      state.remainingSeconds = state.totalSeconds;
    }

    applyThemeColors();
    renderClockFaceDial();
    updateStartPauseButtonUI();
    updateClockVisuals();
  }

  function renderTaskChips() {
    dom.taskList.innerHTML = '';

    state.tasks.forEach((task) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `task-chip ${task.id === state.activeTaskId ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="task-emoji">${task.emoji}</span>
        <span>${task.name}</span>
        ${task.isCustom ? `<span class="delete-task" data-delete-id="${task.id}" title="刪除此任務">✕</span>` : ''}
      `;

      btn.addEventListener('click', (e) => {
        if (state.childLocked) {
          showLockedToast();
          return;
        }
        const delId = e.target.getAttribute('data-delete-id');
        if (delId) {
          e.stopPropagation();
          deleteCustomTask(delId);
          return;
        }
        selectTask(task.id);
      });

      dom.taskList.appendChild(btn);
    });

    // 新增自訂任務按鈕
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'task-chip';
    addBtn.innerHTML = `<span class="task-emoji">➕</span><span>自訂任務</span>`;
    addBtn.addEventListener('click', () => {
      if (state.childLocked) {
        showLockedToast();
        return;
      }
      openCustomTaskModal();
    });
    dom.taskList.appendChild(addBtn);
  }

  function selectTask(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    state.activeTaskId = task.id;

    dom.activeTaskEmoji.textContent = task.emoji;
    dom.activeTaskName.textContent = task.name;
    dom.clockCenterEmoji.textContent = task.emoji;

    renderTaskChips();

    // 自動根據任務預設時間切換合適的轉盤模式
    if (task.defaultMin <= 15 && state.mode !== 'custom') {
      switchClockMode('fast12', task.defaultMin);
    } else if (task.defaultMin > 15 && task.defaultMin <= 60 && state.mode !== 'custom') {
      switchClockMode('slow60', task.defaultMin);
    } else {
      state.customMaxMinutes = Math.max(task.defaultMin, state.customMaxMinutes);
      switchClockMode(state.mode, task.defaultMin);
    }
  }

  function deleteCustomTask(taskId) {
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    if (state.activeTaskId === taskId) {
      state.activeTaskId = state.tasks[0].id;
      selectTask(state.activeTaskId);
    } else {
      renderTaskChips();
    }
    saveSettings();
  }

  // ==========================================================================
  // 10. 慶祝彩帶動畫 (Canvas Confetti)
  // ==========================================================================
  let confettiFrameId = null;
  let confettiParticles = [];

  function startConfetti() {
    const canvas = dom.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const palette = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    confettiParticles = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 8 + Math.random() * 8,
      h: 10 + Math.random() * 10,
      color: palette[Math.floor(Math.random() * palette.length)],
      vy: 2.5 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      spin: -0.1 + Math.random() * 0.2
    }));

    function renderConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      confettiFrameId = requestAnimationFrame(renderConfetti);
    }

    cancelAnimationFrame(confettiFrameId);
    confettiFrameId = requestAnimationFrame(renderConfetti);
  }

  function stopConfetti() {
    cancelAnimationFrame(confettiFrameId);
    const canvas = dom.confettiCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ==========================================================================
  // 11. 設定彈窗、自訂任務彈窗與兒童防誤觸鎖
  // ==========================================================================
  function initSettingsModal() {
    // 渲染色塊顏色選項
    function renderSwatches() {
      dom.colorSwatches.innerHTML = '';
      COLOR_THEMES.forEach((theme) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `color-swatch-btn ${state.customColorId === theme.id ? 'active' : ''}`;
        btn.innerHTML = `
          <span class="swatch-circle" style="background:${theme.primary}"></span>
          <span>${theme.name}</span>
        `;
        btn.addEventListener('click', () => {
          state.customColorId = theme.id;
          renderSwatches();
        });
        dom.colorSwatches.appendChild(btn);
      });
    }

    dom.btnSettings.addEventListener('click', () => {
      if (state.childLocked) {
        showLockedToast();
        return;
      }
      dom.inputCustomMax.value = String(state.customMaxMinutes);
      dom.toggleShowDigital.checked = state.showDigital;
      dom.toggleLastMinutePulse.checked = state.lastMinutePulse;
      renderSwatches();

      // 更新預設分鐘數膠囊選中狀態
      dom.customMaxPresets.querySelectorAll('.chip-btn').forEach((chip) => {
        chip.classList.toggle('active', Number(chip.dataset.minutes) === state.customMaxMinutes);
      });

      // 更新音效按鈕選中狀態
      dom.soundOptions.querySelectorAll('.sound-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.sound.trim() === state.alarmSound);
      });

      dom.settingsModal.classList.remove('hidden');
    });

    dom.btnCloseSettings.addEventListener('click', () => {
      dom.settingsModal.classList.add('hidden');
    });

    // 預設分鐘數按鈕點擊
    dom.customMaxPresets.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-btn');
      if (!btn) return;
      const mins = Number(btn.dataset.minutes);
      dom.inputCustomMax.value = String(mins);
      dom.customMaxPresets.querySelectorAll('.chip-btn').forEach((c) => {
        c.classList.toggle('active', c === btn);
      });
    });

    // 音效選擇並即時試聽
    dom.soundOptions.addEventListener('click', (e) => {
      const btn = e.target.closest('.sound-btn');
      if (!btn) return;
      const soundType = btn.dataset.sound.trim();
      state.alarmSound = soundType;
      dom.soundOptions.querySelectorAll('.sound-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      sound.playAlarmPattern(soundType);
    });

    // 儲存設定並切換至自訂轉盤預覽
    dom.btnSaveSettings.addEventListener('click', () => {
      const inputVal = Math.max(1, Math.min(180, Number(dom.inputCustomMax.value) || 30));
      state.customMaxMinutes = inputVal;
      state.showDigital = dom.toggleShowDigital.checked;
      state.lastMinutePulse = dom.toggleLastMinutePulse.checked;

      saveSettings();
      dom.settingsModal.classList.add('hidden');

      // 若使用者剛修改了自訂轉盤，直接套用並切換至自訂模式讓使用者立即看到效果
      switchClockMode('custom', Math.min(state.customMaxMinutes, Math.ceil(state.remainingSeconds / 60) || 10));
    });
  }

  function openCustomTaskModal() {
    dom.emojiPicker.innerHTML = '';
    EMOJI_CHOICES.forEach((em) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `emoji-option ${state.selectedNewEmoji === em ? 'active' : ''}`;
      btn.textContent = em;
      btn.addEventListener('click', () => {
        state.selectedNewEmoji = em;
        dom.emojiPicker.querySelectorAll('.emoji-option').forEach((el) => {
          el.classList.toggle('active', el === btn);
        });
      });
      dom.emojiPicker.appendChild(btn);
    });
    dom.inputTaskName.value = '';
    dom.inputTaskDefaultMin.value = '10';
    dom.customTaskModal.classList.remove('hidden');
  }

  function initCustomTaskModal() {
    dom.btnCloseCustomTask.addEventListener('click', () => {
      dom.customTaskModal.classList.add('hidden');
    });

    dom.btnAddTask.addEventListener('click', () => {
      const name = dom.inputTaskName.value.trim() || '自訂任務';
      const defaultMin = Math.max(1, Math.min(120, Number(dom.inputTaskDefaultMin.value) || 10));
      const newTask = {
        id: `custom_${Date.now()}`,
        emoji: state.selectedNewEmoji,
        name,
        defaultMin,
        mode: defaultMin <= 15 ? 'fast12' : 'slow60',
        isCustom: true
      };
      state.tasks.push(newTask);
      saveSettings();
      dom.customTaskModal.classList.add('hidden');
      selectTask(newTask.id);
    });
  }

  // 兒童鎖（點擊上鎖，長按 1.5 秒解鎖）
  function initChildLock() {
    let pressTimer = null;

    function updateLockUI() {
      dom.btnLock.classList.toggle('locked', state.childLocked);
      dom.lockIcon.textContent = state.childLocked ? '🔒' : '🔓';
      dom.lockLabel.textContent = state.childLocked ? '長按解鎖' : '兒童鎖';
    }

    dom.btnLock.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!state.childLocked) {
        state.childLocked = true;
        sound.playStepClick();
        updateLockUI();
        showLockedToast();
        return;
      }

      // 已鎖定狀態：需長按 1.2 秒解鎖
      pressTimer = setTimeout(() => {
        state.childLocked = false;
        sound.playAlarmPattern('chime');
        updateLockUI();
        dom.lockToast.classList.add('hidden');
      }, 1200);
    });

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    dom.btnLock.addEventListener('pointerup', cancelPress);
    dom.btnLock.addEventListener('pointerleave', cancelPress);
    dom.btnLock.addEventListener('pointercancel', cancelPress);
  }

  // ==========================================================================
  // 12. 綁定全域控制事件與啟動初始化
  // ==========================================================================
  function bindEvents() {
    // 模式切換按鈕
    dom.modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        const defaultMin = mode === 'fast12' ? 5 : mode === 'slow60' ? 20 : Math.round(state.customMaxMinutes / 2);
        switchClockMode(mode, defaultMin);
      });
    });

    // 開始 / 暫停 / 重設
    dom.btnStartPause.addEventListener('click', () => {
      if (state.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    dom.btnReset.addEventListener('click', resetTimer);

    // 快速增減時間
    dom.btnMinus1.addEventListener('click', () => adjustSeconds(-60));
    dom.btnPlus1.addEventListener('click', () => adjustSeconds(60));
    dom.btnPlus5.addEventListener('click', () => adjustSeconds(300));

    // 點擊數位時間顯示區可切換顯示/隱藏秒數
    dom.digitalDisplay.addEventListener('click', () => {
      state.showDigital = !state.showDigital;
      saveSettings();
      updateClockVisuals();
    });

    // 滴答聲切換
    function syncTickBtnUI() {
      dom.btnTick.classList.toggle('active', state.tickSoundEnabled);
      dom.tickIcon.textContent = state.tickSoundEnabled ? '🔊' : '🔇';
    }
    syncTickBtnUI();

    dom.btnTick.addEventListener('click', () => {
      state.tickSoundEnabled = !state.tickSoundEnabled;
      if (state.tickSoundEnabled) sound.playTick();
      syncTickBtnUI();
      saveSettings();
    });

    // 全螢幕切換
    dom.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // 時間到彈窗按鈕
    dom.btnDismissAlarm.addEventListener('click', dismissAlarm);
    dom.btnAdd2Min.addEventListener('click', () => {
      dismissAlarm();
      state.totalSeconds = 120;
      state.remainingSeconds = 120;
      startTimer();
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function initApp() {
    loadSavedSettings();
    renderTaskChips();
    applyThemeColors();
    renderClockFaceDial();
    updateClockVisuals();
    initDialDragEvents();
    initSettingsModal();
    initCustomTaskModal();
    initChildLock();
    bindEvents();
    registerServiceWorker();
  }

  initApp();
})();
