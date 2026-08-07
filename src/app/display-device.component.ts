import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { abortError, playAudioSequence } from './audio-playback.util';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="device-resolve-screen" *ngIf="error || loading">
      <section>
        <i class="fa-solid" [class.fa-tv]="!error" [class.fa-triangle-exclamation]="error"></i>
        <h1>{{error ? 'ไม่สามารถเปิดหน้าจอได้' : 'กำลังเปิดหน้าจอแสดงคิว'}}</h1>
        <p>{{message}}</p>
      </section>
    </main>

    <main class="multi-display-page" *ngIf="!error && !loading">
      <header class="multi-display-header">
        <div class="multi-title-group">
          <a [href]="appRouteUrl('/display-device')" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
          <h1>{{title}}</h1>
        </div>
        <div class="multi-clock">เวลา&nbsp; {{clock}} <span>{{dateText}}</span></div>
        <div class="multi-tools">
          <button title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="multi-display-body" [class.many-rooms]="roomsData.length > 6">
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
            <div class="room-row" *ngFor="let r of roomsData" [class.room-list-mode]="isRoomListMode">
              <div class="room-number">{{r.room_number || r.room_id}}</div>
              <div class="queue-number" *ngIf="!isRoomListMode" [class.active]="announcingRoomId === stringId(r.room_id)">
                {{roomDisplayNo(r) || '---'}}
              </div>
              <div class="room-list-device-queues" *ngIf="isRoomListMode">
                <span *ngFor="let q of roomQueues(r)" [class.active]="announcingRoomId === stringId(r.room_id) && displayNo(q) === roomDisplayNo(r)">
                  <b>{{displayNo(q)}}</b>
                  <small>{{timeText(q.call_datetime)}}</small>
                </span>
                <span class="empty" *ngIf="!roomQueues(r).length">---</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <footer class="multi-display-footer">
        <span> </span>
        <span></span>
        <span>กลุ่มภารกิจสุขภาพดิจิทัล โรงพยาบาลเจ้าพระยาอภัยภูเบศร</span>
      </footer>
      <button class="sound-unlock" *ngIf="voiceEnabled && !audioUnlocked" (click)="unlockAudio()">
        <i class="fa-solid fa-volume-high"></i>
        <span>เปิดเสียงเรียกคิว</span>
      </button>
    </main>
  `,
})
export class DisplayDeviceComponent implements OnInit {
  @ViewChild('youtubeFrame') youtubeFrame?: ElementRef<HTMLIFrameElement>;

  token = '';
  device: any = null;
  loading = true;
  error = false;
  message = 'กำลังตรวจสอบ device token...';
  roomsData: any[] = [];
  calledList: any[] = [];
  title = 'หน้าจอคิวรวม';
  clock = '';
  dateText = '';
  media: any[] = [];
  currentMedia: any = null;
  mediaIndex = 0;
  slideTimer?: number;
  youtubeUrlCache = new Map<string, any>();
  initialLoadDone = false;
  lastActiveByRoom = new Map<string, string>();
  displayedQueueByRoom = new Map<string, string>();
  announcingRoomId = '';
  forceAnnounceRooms = new Set<string>();
  suppressAnnounceRooms = new Set<string>();
  audioQueue: Array<{ queueNo: string; roomNumber: string; roomId: string; slotId?: string }> = [];
  audioQueueRunning = false;
  recentlyQueuedAudio = new Set<string>();
  playbackAbort?: AbortController;
  currentAudio?: HTMLAudioElement;
  callRepeatCount = 1;
  voiceEnabled = localStorage.getItem('display_voice_enabled') !== 'false';
  audioUnlocked = true;
  youtubeSoundEnabled = localStorage.getItem('display_youtube_sound_enabled') === 'true';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';
  qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appAbsoluteUrl('/check-queue'))}`;

  constructor(private route: ActivatedRoute, public api: QueueService, private sanitizer: DomSanitizer) {}

  appRouteUrl = appRouteUrl;

  ngOnInit() {
    const queryToken = this.route.snapshot.queryParamMap.get('token') || '';
    if (queryToken) {
      sessionStorage.setItem('display_device_token', queryToken);
      history.replaceState({}, '', appRouteUrl('/display-device'));
    }
    this.token = queryToken || sessionStorage.getItem('display_device_token') || '';
    if (!this.token) {
      this.showError('ไม่พบ token ใน URL');
      return;
    }

    this.api.resolveDisplayDevice(this.token).subscribe({
      next: r => {
        this.device = r.data;
        if (!this.device?.room_ids?.length) {
          this.showError('device นี้ยังไม่ได้ตั้งค่าห้องตรวจ');
          return;
        }
        this.loading = false;
        this.loadBoard();
        this.loadMedia();
        this.api.connect(this.device.room_ids.map((id: any) => `room:${id}`), { deviceToken: this.token });
      },
      error: err => this.showError(err?.status === 403 ? 'IP ของเครื่องนี้ไม่ได้รับอนุญาตให้ใช้ device นี้' : 'ไม่พบ device token หรือ token ถูกปิดใช้งาน'),
    });

    this.api.events$.subscribe(e => {
      if (e.type === 'queue.changed' && this.device?.room_ids?.length) {
        const eventRoomId = String(e.payload?.roomId ?? '');
        const eventQueueNo = this.eventDisplayNo(e.payload);
        const slotId = String(e.payload?.slotId ?? '');
        if (e.payload?.action === 'cancel' && eventRoomId) {
          this.suppressAnnounceRooms.add(eventRoomId);
          if (slotId) this.audioQueue = this.audioQueue.filter(item => String(item.slotId || '') !== slotId);
          this.stopAudioPlayback();
          this.displayedQueueByRoom.delete(eventRoomId);
          this.announcingRoomId = '';
          this.roomsData = this.roomsData.map(room => String(room.room_id) === eventRoomId ? { ...room, active: null } : room);
          this.calledList = this.calledList.filter(item => String(item.room_id) !== eventRoomId);
        } else if (e.payload?.action === 'call' && eventRoomId && eventQueueNo) {
          this.enqueueQueueAudio(eventQueueNo, e.payload?.roomNumber || eventRoomId, eventRoomId, slotId);
        } else if (e.payload?.action === 'call' && eventRoomId) {
          this.forceAnnounceRooms.add(eventRoomId);
        }
        this.loadBoard();
      }
    });
    setInterval(() => this.tick(), 1000);
    this.tick();
    setInterval(() => this.loadMedia(), 30000);
  }

  loadBoard() {
    this.api.displayDevice(this.token).subscribe({
      next: r => {
        this.roomsData = r.rooms_data || [];
        this.calledList = r.called_list || [];
        this.callRepeatCount = this.normalizeRepeatCount(r.call_repeat_count);
        this.title = this.roomsData[0]?.location_name ? `หน้าจอคิวรวม ${this.roomsData[0].location_name}` : 'หน้าจอคิวรวม';
        for (const room of this.roomsData) {
          const activeNo = this.displayNo(room.active);
        const activeSignature = this.activeSignature(room.active);
        const key = String(room.room_id);
        const previous = this.lastActiveByRoom.get(key) || '';
        const suppressRoom = this.suppressAnnounceRooms.has(key);
        if (!this.initialLoadDone && activeNo) this.displayedQueueByRoom.set(key, activeNo);
        if (suppressRoom) {
          this.displayedQueueByRoom.set(key, activeNo || '');
        } else if (this.initialLoadDone && activeNo && !this.hasQueuedRoom(key) && previous !== activeSignature) this.displayedQueueByRoom.set(key, previous ? (this.displayedQueueByRoom.get(key) || '') : activeNo);
        if (!suppressRoom && this.initialLoadDone && activeNo && (previous !== activeSignature || this.forceAnnounceRooms.has(key))) {
          this.enqueueQueueAudio(activeNo, room.room_number || room.room_id, key, String(room.active?.opd_qs_slot_id || ''));
          this.forceAnnounceRooms.delete(key);
        }
        this.lastActiveByRoom.set(key, activeSignature);
        this.suppressAnnounceRooms.delete(key);
      }
        this.initialLoadDone = true;
      },
      error: err => this.showError(err?.status === 403 ? 'IP ของเครื่องนี้ไม่ได้รับอนุญาตให้ใช้ device นี้' : 'โหลดข้อมูลหน้าจอไม่สำเร็จ'),
    });
  }

  loadMedia() {
    if (!this.device?.location_id) return;
    this.api.media(String(this.device.location_id)).subscribe(r => {
      const next = (r.data || []).filter((m: any) => m.enabled);
      const sameList = next.map((m: any) => m.file).join(',') === this.media.map(m => m.file).join(',');
      this.media = next;
      if (!sameList) this.mediaIndex = 0;
      this.currentMedia = this.media[this.mediaIndex] || this.media[0] || null;
      this.scheduleSlide();
    });
  }

  displayNo(q: any) {
    if (!q) return '';
    if (this.queueType === 'oqueue') return q.oqueue || q.queue_no || q.queue_slot_number || '';
    return q.queue_slot_number || q.queue_no || q.oqueue || '';
  }

  roomDisplayNo(room: any) {
    const key = String(room?.room_id ?? '');
    return this.displayedQueueByRoom.get(key) || this.displayNo(room?.active);
  }

  get isRoomListMode() {
    return this.device?.device_type === 'room-list';
  }

  roomQueues(room: any) {
    return Array.isArray(room?.queues) ? room.queues : [];
  }

  timeText(value: any) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
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

  enqueueQueueAudio(queueNo: string, roomNumber: string, roomId: string, slotId?: string) {
    if (!this.voiceEnabled) return;
    const signature = `${queueNo}:${roomNumber}:${roomId}:${slotId || ''}`;
    if (this.recentlyQueuedAudio.has(signature)) return;
    if (this.audioQueue.some(item => `${item.queueNo}:${item.roomNumber}:${item.roomId}:${item.slotId || ''}` === signature)) return;
    this.recentlyQueuedAudio.add(signature);
    window.setTimeout(() => this.recentlyQueuedAudio.delete(signature), 10000);
    this.audioQueue.push({ queueNo, roomNumber, roomId, slotId });
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
    if (!this.voiceEnabled) return true;
    this.displayedQueueByRoom.set(String(roomId), queueNo);
    this.announcingRoomId = roomId;
    this.duckYoutubeAudio(true);
    this.playbackAbort = new AbortController();
    const roomDigits = String(roomNumber).replace(/\D/g, '');
    try {
      await this.playCallAudio(queueNo, roomDigits || String(roomNumber), this.playbackAbort.signal);
      return true;
    } catch (err) {
      console.warn('TTS playback failed', err);
      if (this.isAutoplayBlocked(err)) this.audioUnlocked = false;
      return false;
    } finally {
      this.duckYoutubeAudio(false);
      if (this.announcingRoomId === roomId) this.announcingRoomId = '';
    }
  }

  isAutoplayBlocked(err: unknown) {
    const text = `${(err as any)?.name || ''} ${(err as any)?.message || err || ''}`.toLowerCase();
    return text.includes('notallowed') || text.includes('user gesture') || text.includes('not allowed to start') || text.includes('play() failed');
  }

  async playCallAudio(queueNo: string, roomNo: string, signal?: AbortSignal) {
    const url = this.api.ttsUrl(`/call?queue=${encodeURIComponent(queueNo)}&location_id=${encodeURIComponent(String(this.device?.location_id || ''))}&room=${encodeURIComponent(roomNo)}`);
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      await playAudioSequence((data.files || []).map((file: string) => this.api.audioAssetUrl(file)), Number(data.voice_rate || 1), signal);
      return;
    }
    const blob = await response.blob();
    await this.playAudioUrl(URL.createObjectURL(blob), Number(response.headers.get('x-voice-rate') || 1), signal);
  }

  playAudioUrl(url: string, rate = 1, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.playbackRate = rate;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Cannot play audio: ${url}`));
      signal?.addEventListener('abort', () => {
        try { audio.pause(); } catch { /* ignore */ }
        audio.src = '';
        reject(abortError());
      }, { once: true });
      audio.play().catch(reject);
    });
  }

  stopAudioPlayback() {
    this.playbackAbort?.abort();
    this.playbackAbort = undefined;
    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch { /* ignore */ }
      this.currentAudio.src = '';
      this.currentAudio = undefined;
    }
    this.audioQueue = [];
    this.audioQueueRunning = false;
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

  hasQueuedRoom(roomId: string) {
    const key = String(roomId);
    return this.audioQueueRunning && this.announcingRoomId === key || this.audioQueue.some(item => String(item.roomId) === key);
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
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  stringId(id: unknown) {
    return String(id);
  }

  tick() {
    const n = new Date();
    this.clock = n.toTimeString().slice(0, 8);
    this.dateText = n.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  showError(message: string) {
    this.error = true;
    this.loading = false;
    this.message = message;
  }
}
