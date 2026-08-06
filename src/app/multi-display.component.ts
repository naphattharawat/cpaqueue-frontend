import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { playAudioSequence } from './audio-playback.util';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="multi-display-page">
      <header class="multi-display-header">
        <div class="multi-title-group">
          <a [href]="appRouteUrl('/')" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
          <h1>{{title}}</h1>
        </div>
        <div class="multi-clock">เวลา&nbsp; {{clock}} <span>{{dateText}}</span></div>
        <div class="multi-tools">
          <button title="ตั้งค่า" (click)="openSettings()"><i class="fa-solid fa-gear"></i></button>
          <button title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="multi-setup legacy" *ngIf="!roomIds">
        <label>จุดบริการ
          <select [(ngModel)]="locationId" (change)="loadRooms()">
            <option value="">-- เลือกจุดบริการ --</option>
            <option *ngFor="let l of locations" [value]="l.opd_qs_location_id">{{l.opd_qs_location_name}}</option>
          </select>
        </label>
        <div class="room-pick">
          <label *ngFor="let r of rooms">
            <input type="checkbox" [value]="r.opd_qs_room_id" (change)="toggleRoom(r.opd_qs_room_id, $any($event.target).checked)">
            ห้อง #{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}
          </label>
        </div>
        <button class="btn" (click)="startBoard()">เปิดหน้าจอแสดงคิวรวม</button>
      </section>

      <section class="multi-display-body" [class.many-rooms]="roomsData.length > 6" *ngIf="roomIds">
        <section class="multi-left">
          <div class="media-stage">
            <img *ngIf="currentMedia && currentMedia.type !== 'youtube'" [src]="api.mediaUrl(currentMedia.file)" [alt]="currentMedia.label || 'media'">
            <div class="youtube-frame-wrap" *ngIf="currentMedia?.type === 'youtube'">
              <iframe #youtubeFrame [src]="youtubeEmbed(currentMedia)" (load)="syncYoutubeSound()" title="YouTube media" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div *ngIf="!currentMedia" class="media-empty">ยังไม่มีสื่อแสดงผล</div>
            <span class="media-counter" *ngIf="media.length">{{mediaIndex + 1}} / {{media.length}}</span>
          </div>

          <div class="called-panel">
            <div class="called-label">
              <i class="fa-solid fa-bullhorn"></i>
              <b>เรียกแล้ว<br>ไม่พบ</b>
            </div>
            <div class="called-list">
              <div class="called-chip" *ngFor="let c of calledList">
                <strong>{{displayNo(c)}}</strong><span>#{{c.room_number || c.room_id}}</span>
              </div>
            </div>
            <div class="qr-card">
              <img [src]="qrSrc" alt="QR Code">
              <b>สแกนเช็คคิวผ่านมือถือ</b>
            </div>
          </div>
        </section>

        <aside class="room-board">
          <div class="room-board-head">
            <span>ห้อง</span><span>คิวรับบริการ</span>
            <span class="portrait-extra">ห้อง</span><span class="portrait-extra">คิวรับบริการ</span>
            <span class="portrait-extra portrait-third">ห้อง</span><span class="portrait-extra portrait-third">คิวรับบริการ</span>
          </div>
          <div class="room-board-scroll">
            <div class="room-row" *ngFor="let r of roomsData">
              <div class="room-number">{{r.room_number || r.room_id}}</div>
              <div class="queue-number" [class.active]="announcingRoomId === stringId(r.room_id) || (r.is_latest && r.active)">
                {{displayNo(r.active) || '---'}}
              </div>
            </div>
          </div>
        </aside>
      </section>

      <footer class="multi-display-footer">
        <span>Design by JPSK</span>
        <span></span>
        <span>กลุ่มภารกิจสุขภาพดิจิทัล โรงพยาบาลเจ้าพระยาอภัยภูเบศร</span>
      </footer>
      <button class="sound-unlock" *ngIf="voiceEnabled && !audioUnlocked" (click)="unlockAudio()">
        <i class="fa-solid fa-volume-high"></i>
        <span>เปิดเสียงเรียกคิว</span>
      </button>

      <div class="settings-backdrop" *ngIf="settingsOpen" (click)="closeSettings()">
        <section class="settings-card" (click)="$event.stopPropagation()">
          <button class="settings-close" (click)="closeSettings()"><i class="fa-solid fa-xmark"></i></button>
          <h2><i class="fa-solid fa-gear"></i> ตั้งค่าการแสดงผล</h2>

          <div class="settings-row">
            <span>ประเภทคิวตรวจ</span>
            <div class="queue-type-control">
              <small>คิวตรวจ (Z)</small>
              <label class="switch">
                <input type="checkbox" [checked]="queueType === 'oqueue'" (change)="setQueueType($any($event.target).checked ? 'oqueue' : 'z001')">
                <i></i>
              </label>
              <small>คิวรวม (O)</small>
            </div>
          </div>

          <div class="settings-row">
            <span>ธีมหน้าจอ</span>
            <label class="theme-select">
              <i class="fa-solid fa-palette"></i>
              <select [(ngModel)]="themeName" (change)="applyTheme(themeName)">
                <option value="green">เขียว</option>
                <option value="orange">ส้ม</option>
                <option value="redorange">แดงส้ม</option>
                <option value="navy">กรมท่า</option>
              </select>
            </label>
          </div>

          <div class="settings-row">
            <span>เปิด/ปิด เสียงเรียก</span>
            <button class="voice-toggle" (click)="toggleVoice()">
              <i class="fa-solid" [class.fa-volume-high]="voiceEnabled" [class.fa-volume-xmark]="!voiceEnabled"></i>
              {{voiceEnabled ? 'เปิดเสียงอยู่' : 'ปิดเสียงอยู่'}}
            </button>
          </div>

          <div class="settings-row">
            <span>เสียง YouTube</span>
            <button class="voice-toggle" (click)="toggleYoutubeSound()">
              <i class="fa-solid" [class.fa-volume-high]="youtubeSoundEnabled" [class.fa-volume-xmark]="!youtubeSoundEnabled"></i>
              {{youtubeSoundEnabled ? 'เปิดเสียง YouTube' : 'ปิดเสียง YouTube'}}
            </button>
          </div>

          <div class="settings-row last">
            <span>ทดสอบเสียงเรียก</span>
            <button class="test-voice" (click)="testVoice()"><i class="fa-solid fa-volume-low"></i> ทดสอบเรียก</button>
          </div>
        </section>
      </div>
    </main>
  `,
})
export class MultiDisplayComponent implements OnInit {
  @ViewChild('youtubeFrame') youtubeFrame?: ElementRef<HTMLIFrameElement>;

  locationId = '';
  locations: any[] = [];
  rooms: any[] = [];
  picked = new Set<string>();
  roomIds = '';
  roomsData: any[] = [];
  calledList: any[] = [];
  clock = '';
  dateText = '';
  title = 'หน้าจอคิวรวม';
  media: any[] = [];
  currentMedia: any = null;
  mediaIndex = 0;
  slideTimer?: number;
  youtubeUrlCache = new Map<string, any>();
  initialLoadDone = false;
  lastActiveByRoom = new Map<string, string>();
  announcingRoomId = '';
  forceAnnounceRooms = new Set<string>();
  audioQueue: Array<{ queueNo: string; roomNumber: string; roomId: string }> = [];
  audioQueueRunning = false;
  recentlyQueuedAudio = new Set<string>();
  callRepeatCount = 1;
  settingsOpen = false;
  voiceEnabled = localStorage.getItem('display_voice_enabled') !== 'false';
  audioUnlocked = true;
  youtubeSoundEnabled = localStorage.getItem('display_youtube_sound_enabled') === 'true';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';
  themeName = localStorage.getItem('display_theme') || 'green';
  qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appAbsoluteUrl('/check-queue'))}`;

  constructor(private route: ActivatedRoute, public api: QueueService, private sanitizer: DomSanitizer) {}

  appRouteUrl = appRouteUrl;

  ngOnInit() {
    this.route.queryParamMap.subscribe(p => {
      this.locationId = p.get('location_id') || '';
      this.roomIds = this.uniqueRoomIds(p.get('room_ids') || '');
      this.initialLoadDone = false;
      this.lastActiveByRoom.clear();
      if (this.roomIds) {
        this.loadBoard();
        this.loadMedia();
        this.api.connect(this.roomIds.split(',').map(id => `room:${id}`));
      }
    });
    this.api.locations().subscribe(r => this.locations = r.data);
    this.api.events$.subscribe(e => {
      if (e.type === 'queue.changed' && this.roomIds) {
        const eventRoomId = String(e.payload?.roomId ?? '');
        const eventQueueNo = this.eventDisplayNo(e.payload);
        if (e.payload?.action === 'call' && eventRoomId && eventQueueNo) {
          this.enqueueQueueAudio(eventQueueNo, e.payload?.roomNumber || eventRoomId, eventRoomId);
        } else if (e.payload?.action === 'call' && eventRoomId) {
          this.forceAnnounceRooms.add(eventRoomId);
        }
        this.loadBoard();
      }
    });
    this.applyTheme(this.themeName);
    setInterval(() => this.tick(), 1000);
    this.tick();
    this.loadMedia();
    setInterval(() => this.loadMedia(), 30000);
  }

  uniqueRoomIds(ids: string) {
    return [...new Set(ids.split(',').map(id => id.trim()).filter(Boolean))].join(',');
  }

  stringId(id: unknown) {
    return String(id);
  }

  loadRooms() {
    if (!this.locationId) return;
    this.api.rooms(this.locationId).subscribe(r => this.rooms = r.data);
  }

  toggleRoom(id: string, checked: boolean) {
    checked ? this.picked.add(String(id)) : this.picked.delete(String(id));
  }

  startBoard() {
    this.roomIds = this.uniqueRoomIds([...this.picked].join(','));
    if (!this.roomIds) return;
    history.replaceState(null, '', appRouteUrl(`/display-multi?location_id=${this.locationId}&room_ids=${this.roomIds}`));
    this.loadBoard();
    this.loadMedia();
    this.api.connect(this.roomIds.split(',').map(id => `room:${id}`));
  }

  loadBoard() {
    this.api.displayMulti(this.roomIds).subscribe(r => {
      this.roomsData = r.rooms_data || [];
      this.calledList = r.called_list || [];
      this.callRepeatCount = this.normalizeRepeatCount(r.call_repeat_count);
      this.title = this.roomsData[0]?.location_name ? `หน้าจอคิวรวม ${this.roomsData[0].location_name}` : 'หน้าจอคิวรวม';
      for (const room of this.roomsData) {
        const activeNo = this.displayNo(room.active);
        const activeSignature = this.activeSignature(room.active);
        const key = String(room.room_id);
        const previous = this.lastActiveByRoom.get(key) || '';
        if (this.initialLoadDone && activeNo && (previous !== activeSignature || this.forceAnnounceRooms.has(key))) {
          this.enqueueQueueAudio(activeNo, room.room_number || room.room_id, key);
          this.forceAnnounceRooms.delete(key);
        }
        this.lastActiveByRoom.set(key, activeSignature);
      }
      this.initialLoadDone = true;
    });
  }

  displayNo(q: any) {
    if (!q) return '';
    if (this.queueType === 'oqueue') return q.oqueue || q.queue_no || q.queue_slot_number || '';
    return q.queue_slot_number || q.queue_no || q.oqueue || '';
  }

  youtubeEmbed(item: any) {
    const url = this.youtubeEmbedUrl(item);
    if (!this.youtubeUrlCache.has(url)) this.youtubeUrlCache.set(url, this.sanitizer.bypassSecurityTrustResourceUrl(url));
    return this.youtubeUrlCache.get(url);
  }

  youtubeEmbedUrl(item: any) {
    const raw = item?.embed_url || '';
    if (!raw) return '';
    try {
      const url = new URL(raw);
      url.searchParams.set('enablejsapi', '1');
      url.searchParams.set('mute', this.youtubeSoundEnabled ? '0' : '1');
      url.searchParams.set('origin', location.origin);
      url.searchParams.set('controls', '0');
      url.searchParams.set('modestbranding', '1');
      url.searchParams.set('rel', '0');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('cc_load_policy', '0');
      url.searchParams.set('iv_load_policy', '3');
      return url.toString();
    } catch {
      return raw;
    }
  }

  activeSignature(q: any) {
    if (!q) return '';
    return `${this.displayNo(q)}:${q.call_id || q.call_datetime || ''}`;
  }

  enqueueQueueAudio(queueNo: string, roomNumber: string, roomId: string, force = false) {
    if (!this.voiceEnabled && !force) return;
    const signature = `${queueNo}:${roomNumber}:${roomId}`;
    if (this.recentlyQueuedAudio.has(signature)) return;
    if (this.audioQueue.some(item => `${item.queueNo}:${item.roomNumber}:${item.roomId}` === signature)) return;
    this.recentlyQueuedAudio.add(signature);
    window.setTimeout(() => this.recentlyQueuedAudio.delete(signature), 10000);
    this.audioQueue.push({ queueNo, roomNumber, roomId });
    this.processAudioQueue();
  }

  eventDisplayNo(payload: any) {
    if (!payload) return '';
    return this.queueType === 'oqueue' ? payload.oqueue || payload.queueNo || '' : payload.queueNo || payload.oqueue || '';
  }

  async processAudioQueue() {
    if (!this.audioUnlocked) return;
    if (this.audioQueueRunning) return;
    this.audioQueueRunning = true;
    while (this.audioQueue.length) {
      const item = this.audioQueue.shift();
      if (item) {
        for (let i = 0; i < this.callRepeatCount; i += 1) {
          const played = await this.speakQueue(item.queueNo, item.roomNumber, item.roomId);
          if (!played) {
            this.audioQueue.unshift(item);
            this.audioQueueRunning = false;
            return;
          }
          if (i < this.callRepeatCount - 1) await new Promise(resolve => setTimeout(resolve, 700));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    this.audioQueueRunning = false;
  }

  async unlockAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        await context.resume();
        await context.close();
      }
      const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
      audio.volume = 0;
      await audio.play();
      audio.pause();
      this.audioUnlocked = true;
      this.processAudioQueue();
    } catch (err) {
      console.warn('Audio unlock failed', err);
    }
  }

  async speakQueue(queueNo: string, roomNumber: string, roomId: string) {
    if (!this.voiceEnabled && !this.audioQueueRunning) return true;
    this.announcingRoomId = roomId;
    this.duckYoutubeAudio(true);
    const qSpelled = String(queueNo).split('').join(' ');
    const roomDigits = String(roomNumber).replace(/\D/g, '');
    const roomText = roomDigits ? `ห้องตรวจเบอร์ ${roomDigits}` : `ห้อง ${roomNumber}`;
    const msg = `ขอเชิญหมายเลข ${qSpelled} ที่ ${roomText} ค่ะ`;
    try {
      await this.playCallAudio(queueNo, roomDigits || String(roomNumber));
      return true;
    } catch (err) {
      console.warn('TTS playback failed', err);
      if (this.isAutoplayBlocked(err)) this.audioUnlocked = false;
      return false;
    } finally {
      this.duckYoutubeAudio(false);
      setTimeout(() => this.announcingRoomId = '', 3000);
    }
  }

  isAutoplayBlocked(err: unknown) {
    const text = `${(err as any)?.name || ''} ${(err as any)?.message || err || ''}`.toLowerCase();
    return text.includes('notallowed') || text.includes('user gesture') || text.includes('not allowed to start') || text.includes('play() failed');
  }

  async playCallAudio(queueNo: string, roomNo: string) {
    const url = this.api.ttsUrl(`/call?queue=${encodeURIComponent(queueNo)}&location_id=${encodeURIComponent(this.locationId)}&room=${encodeURIComponent(roomNo)}`);
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      await this.playAudioFiles((data.files || []).map((file: string) => this.api.audioAssetUrl(file)), Number(data.voice_rate || 1));
      return;
    }
    const blob = await response.blob();
    await this.playAudioUrl(URL.createObjectURL(blob), Number(response.headers.get('x-voice-rate') || 1));
  }

  async playAudioFiles(files: string[], rate = 1) {
    await playAudioSequence(files, rate);
  }

  playAudioUrl(url: string, rate = 1) {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.playbackRate = rate;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Cannot play audio: ${url}`));
      audio.play().catch(reject);
    });
  }

  openSettings() {
    this.settingsOpen = true;
  }

  closeSettings() {
    this.settingsOpen = false;
  }

  setQueueType(type: 'oqueue' | 'z001') {
    this.queueType = type;
    localStorage.setItem('display_queue_type', type);
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    localStorage.setItem('display_voice_enabled', String(this.voiceEnabled));
  }

  toggleYoutubeSound() {
    this.youtubeSoundEnabled = !this.youtubeSoundEnabled;
    localStorage.setItem('display_youtube_sound_enabled', String(this.youtubeSoundEnabled));
    this.youtubeUrlCache.clear();
    setTimeout(() => this.setYoutubeAudio(this.youtubeSoundEnabled ? 100 : 0), 300);
  }

  duckYoutubeAudio(active: boolean) {
    if (!this.currentMedia || this.currentMedia.type !== 'youtube') return;
    this.setYoutubeAudio(active ? 10 : 100);
  }

  setYoutubeAudio(volume: number) {
    if (!this.youtubeSoundEnabled || volume <= 0) {
      this.youtubeCommand('mute');
      return;
    }
    this.youtubeCommand('unMute');
    this.youtubeCommand('setVolume', [volume]);
  }

  youtubeCommand(func: string, args: unknown[] = []) {
    const win = this.youtubeFrame?.nativeElement.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube.com');
  }

  disableYoutubeCaptions() {
    this.youtubeCommand('setOption', ['captions', 'track', {}]);
    this.youtubeCommand('setOption', ['captions', 'fontSize', -1]);
    this.youtubeCommand('unloadModule', ['captions']);
  }

  syncYoutubeSound() {
    [300, 900, 1800].forEach(delay => setTimeout(() => {
      this.disableYoutubeCaptions();
      this.setYoutubeAudio(this.youtubeSoundEnabled ? 100 : 0);
    }, delay));
  }

  normalizeRepeatCount(value: any) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
  }

  testVoice() {
    this.enqueueQueueAudio('123', '1', '', true);
  }

  applyTheme(themeName: string) {
    this.themeName = themeName;
    localStorage.setItem('display_theme', themeName);
    const themes: Record<string, Record<string, string>> = {
      green: {
        '--multi-bg': 'radial-gradient(circle at 80% 25%, #269145, #0b5427 72%)',
        '--multi-header': 'rgba(10,77,32,.72)',
        '--multi-footer': 'rgba(8,69,30,.72)',
        '--multi-accent': '#70e000',
        '--multi-room-bg': '#dcfce7',
        '--multi-room-border': '#24934d',
        '--multi-room-text': '#164834',
      },
      orange: {
        '--multi-bg': 'radial-gradient(circle at 80% 25%, #f97316, #9a3412 72%)',
        '--multi-header': 'rgba(154,52,18,.74)',
        '--multi-footer': 'rgba(124,45,18,.78)',
        '--multi-accent': '#ffedd5',
        '--multi-room-bg': '#ffedd5',
        '--multi-room-border': '#f97316',
        '--multi-room-text': '#9a3412',
      },
      redorange: {
        '--multi-bg': 'radial-gradient(circle at 80% 25%, #ff4822, #991b1b 72%)',
        '--multi-header': 'rgba(127,29,29,.76)',
        '--multi-footer': 'rgba(127,29,29,.8)',
        '--multi-accent': '#ffedd5',
        '--multi-room-bg': '#fee2e2',
        '--multi-room-border': '#ff4822',
        '--multi-room-text': '#991b1b',
      },
      navy: {
        '--multi-bg': 'radial-gradient(circle at 80% 25%, #1e3a8a, #0f172a 72%)',
        '--multi-header': 'rgba(15,23,42,.78)',
        '--multi-footer': 'rgba(15,23,42,.82)',
        '--multi-accent': '#60a5fa',
        '--multi-room-bg': '#dbeafe',
        '--multi-room-border': '#3b82f6',
        '--multi-room-text': '#1e3a8a',
      },
    };
    const theme = themes[themeName] || themes.green;
    Object.entries(theme).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
  }

  loadMedia() {
    this.api.media(this.locationId).subscribe(r => {
      const next = (r.data || []).filter((m: any) => m.enabled);
      const sameList = next.map((m: any) => m.file).join(',') === this.media.map(m => m.file).join(',');
      this.media = next;
      if (!sameList) this.mediaIndex = 0;
      this.currentMedia = this.media[this.mediaIndex] || this.media[0] || null;
      this.scheduleSlide();
    });
  }

  scheduleSlide() {
    if (this.slideTimer) window.clearTimeout(this.slideTimer);
    if (this.media.length <= 1) return;
    if (Number(this.currentMedia?.duration) === 0) return;
    const delay = Math.max(3, Number(this.currentMedia?.duration || 10)) * 1000;
    this.slideTimer = window.setTimeout(() => {
      this.mediaIndex = (this.mediaIndex + 1) % this.media.length;
      this.currentMedia = this.media[this.mediaIndex];
      this.scheduleSlide();
    }, delay);
  }

  toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => undefined);
    else document.exitFullscreen().catch(() => undefined);
  }

  tick() {
    const n = new Date();
    this.clock = n.toTimeString().slice(0, 8);
    this.dateText = n.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
