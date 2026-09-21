import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { abortError, playAudioSequence } from './audio-playback.util';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';
import { displayPageVariables, queueColorVariables } from './display-color.util';

@Component({
    imports: [CommonModule],
    template: `
    <main class="device-resolve-screen" *ngIf="error || loading">
      <section>
        <i class="fa-solid" [class.fa-tv]="!error" [class.fa-triangle-exclamation]="error"></i>
        <h1>{{error ? 'ไม่สามารถเปิดหน้าจอได้' : 'กำลังเปิดหน้าจอแสดงหมายเลขรับบริการ'}}</h1>
        <p>{{message}}</p>
      </section>
    </main>

    <main class="display-screen device-single-display" *ngIf="!error && !loading && isSingleMode" [ngStyle]="displayFontStyle">
      <header>
        <div class="device-single-title">
          <span class="icon-btn light"><i class="fa-solid fa-hospital"></i></span>
          <div><small>หน้าจอแสดงหมายเลขรับบริการ</small><h2>{{singleLocationName}}</h2></div>
        </div>
        <div class="device-single-tools">
          <div class="time"><b>{{clock}}</b></div>
          <button class="icon-btn light" title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="display-center">
        <div class="room-pill"><i class="fa-solid fa-user-doctor"></i>{{singleRoomName}}</div>
        <div class="display-card active-card" [class.called]="isLastCalledRoom(singleRoom)" [class.pulse]="announcingRoomId === stringId(singleRoom?.room_id)" [ngStyle]="queueColorStyle()">
          <span>หมายเลขรับบริการปัจจุบัน</span>
          <strong>{{singleCurrentNumber}}</strong>
          <small class="legacy-queue-no" *ngIf="showLegacyQueue() && legacyNo(singleRoom?.active)">({{legacyNo(singleRoom?.active)}})</small>
          <b>{{singleCurrentNumber !== '---' ? singleDestinationText : 'รอเรียกคิว'}}</b>
        </div>

        <section class="hold-strip" *ngIf="calledList.length && showCalledList()">
          <h3><i class="fa-solid fa-user-clock"></i> เรียกแล้วไม่พบ ({{calledList.length}} หมายเลข)</h3>
          <div><span *ngFor="let q of calledList">{{displayNo(q)}}</span></div>
        </section>
      </section>

      <footer class="called-history-strip" *ngIf="calledHistory.length && showCalledHistory()">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <b>คิวที่เรียกไปแล้ว</b>
        <span>{{calledHistoryText}}</span>
      </footer>

      <button class="sound-unlock" *ngIf="voiceEnabled && !audioUnlocked" (click)="unlockAudio()">
        <i class="fa-solid fa-volume-high"></i><span>เปิดเสียงเรียกคิว</span>
      </button>
    </main>

    <main class="display-screen device-single-display device-dual-display" *ngIf="!error && !loading && isDualMode" [ngStyle]="displayFontStyle">
      <header>
        <div class="device-single-title">
          <span class="icon-btn light"><i class="fa-solid fa-hospital"></i></span>
          <div><small>หน้าจอแสดงหมายเลขรับบริการ</small><h2>{{dualLocationName}}</h2></div>
        </div>
        <div class="device-single-tools">
          <div class="time"><b>{{clock}}</b></div>
          <button class="icon-btn light" title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="display-center">
        <div class="dual-panes">
          <div class="dual-pane" *ngFor="let i of [0, 1]">
            <div class="room-pill"><i class="fa-solid fa-user-doctor"></i>{{dualRoomLabel(i)}}</div>
            <div class="display-card active-card" [class.called]="isLastCalledRoom(dualRoom(i))" [class.pulse]="announcingRoomId === stringId(dualRoom(i)?.room_id)" [ngStyle]="queueColorStyle()">
              <span>หมายเลขรับบริการปัจจุบัน</span>
              <strong>{{dualCurrentNumber(i)}}</strong>
              <small class="legacy-queue-no" *ngIf="showLegacyQueue() && legacyNo(dualRoom(i)?.active)">({{legacyNo(dualRoom(i)?.active)}})</small>
              <b *ngIf="dualCurrentNumber(i) === '---'">รอเรียกคิว</b>
            </div>
          </div>
        </div>

        <section class="hold-strip" *ngIf="calledList.length && showCalledList()">
          <h3><i class="fa-solid fa-user-clock"></i> เรียกแล้วไม่พบ ({{calledList.length}} หมายเลข)</h3>
          <div><span *ngFor="let q of calledList">{{displayNo(q)}}</span></div>
        </section>
      </section>

      <footer class="called-history-strip" *ngIf="calledHistory.length && showCalledHistory()">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <b>คิวที่เรียกไปแล้ว</b>
        <span>{{calledHistoryText}}</span>
      </footer>

      <button class="sound-unlock" *ngIf="voiceEnabled && !audioUnlocked" (click)="unlockAudio()">
        <i class="fa-solid fa-volume-high"></i><span>เปิดเสียงเรียกคิว</span>
      </button>
    </main>

    <main class="grid-display-page service-grid-display" *ngIf="!error && !loading && isRoomGridMode" [ngStyle]="displayFontStyle">
      <header class="grid-display-header">
        <div class="grid-header-left">
          <div><small>หน้าจอสถานะรับบริการ</small><h2>{{gridLocationName}}</h2><small class="grid-clock">{{gridDateText}} เวลา {{clock}} น.</small></div>
        </div>
        <div class="grid-header-right">
          <div class="grid-header-right-text">
            <i class="fa-solid fa-hospital" aria-hidden="true"></i>
          </div>
          <button class="icon-btn light" title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="grid-display-body" [style.grid-template-columns]="'repeat(' + roomsData.length + ', 1fr)'">
        <div class="grid-room-card" *ngFor="let r of roomsData; trackBy: trackByRoomId" [class.active]="isLastCalledRoom(r) || announcingRoomId === stringId(r.room_id)" [class.pulse]="announcingRoomId === stringId(r.room_id)" [ngStyle]="queueColorStyle()">
          <div class="grid-room-head">ห้องตรวจ {{r.room_number || r.room_id}}</div>
          <div class="grid-room-number"><strong>{{roomDisplayNo(r) || '---'}}</strong></div>
          <div class="grid-next-queues"><small>หมายเลขถัดไป</small><b><ng-container *ngFor="let q of (r.next_queues || []).slice(0, 3); let last = last">{{displayNo(q)}}<span *ngIf="!last"> | </span></ng-container><ng-container *ngIf="!r.next_queues?.length">---</ng-container></b></div>
        </div>
      </section>

      <footer class="grid-footer">
        <div class="grid-footer-history">
          <b>หมายเลขที่เรียกแล้วไม่พบ / รอเรียกซ้ำ</b>
          <div class="grid-footer-marquee">
            <span #gridHistoryTrack class="grid-footer-marquee-track" [class.scrolling]="gridHistoryScrolling" [style.--marquee-distance]="(-gridHistoryDistance) + 'px'" [style.animation-duration.s]="gridHistoryDuration"><span class="grid-hold-chip" *ngFor="let q of calledList">{{displayNo(q)}}</span><span *ngIf="!calledList.length">---</span></span>
          </div>
        </div>
        <div class="grid-footer-qr">
          <div><i class="fa-solid fa-angles-right" aria-hidden="true"></i><b>ติดตาม<br>สถานะที่นี่</b></div>
          <img [src]="qrSrc" alt="QR Code">
        </div>
      </footer>
      <button class="sound-unlock" *ngIf="voiceEnabled && !audioUnlocked" (click)="unlockAudio()"><i class="fa-solid fa-volume-high"></i><span>เปิดเสียงเรียกคิว</span></button>
    </main>

    <main class="multi-display-page" *ngIf="!error && !loading && !isSingleMode && !isDualMode && !isMulti2Mode && !isRoomGridMode" [ngStyle]="displayFontStyle">
      <header class="multi-display-header">
        <div class="multi-title-group">
          <a [href]="appRouteUrl('/display-device')" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
          <h1>{{title}}</h1>
        </div>
        <div class="multi-clock">เวลา&nbsp; {{clock}}</div>
        <div class="multi-tools">
          <button title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="multi-display-body" [class.many-rooms]="roomsData.length > 6" [class.no-media]="hideMedia() && !showCalledList()" [class.media-hidden]="hideMedia() && isRoomListMode">
        <section class="multi-left" *ngIf="!hideMedia() || showCalledList()">
          <div class="media-stage" *ngIf="!hideMedia()">
            <img *ngIf="currentMedia && currentMedia.type !== 'youtube'" [src]="api.mediaUrl(currentMedia.file)" [alt]="currentMedia.label || 'media'">
            <div class="youtube-frame-wrap" *ngIf="currentMedia?.type === 'youtube'">
              <iframe #youtubeFrame [src]="youtubeEmbed(currentMedia)" (load)="syncYoutubeSound()" title="YouTube media" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div *ngIf="!currentMedia" class="media-empty">ยังไม่มีสื่อแสดงผล</div>
            <span class="media-counter" *ngIf="media.length">{{mediaIndex + 1}} / {{media.length}}</span>
          </div>

          <div class="called-panel" *ngIf="showCalledList()">
            <div class="called-label">
              <i class="fa-solid fa-bullhorn"></i>
              <b>เรียกแล้วไม่พบ</b>
            </div>
            <div class="called-list">
              <div class="called-chip" *ngFor="let c of calledList" [ngStyle]="queueColorStyle()">
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
            <span>ห้อง</span><span>หมายเลขรับบริการ</span>
            <span class="portrait-extra">ห้อง</span><span class="portrait-extra">หมายเลขรับบริการ</span>
            <span class="portrait-extra portrait-third">ห้อง</span><span class="portrait-extra portrait-third">หมายเลขรับบริการ</span>
          </div>
          <div class="room-board-scroll">
            <div class="room-row" *ngFor="let r of roomsData; trackBy: trackByRoomId" [class.room-list-mode]="isRoomListMode" [ngStyle]="queueColorStyle()">
              <div class="room-number">{{r.room_number || r.room_id}}</div>
              <div class="queue-number" *ngIf="!isRoomListMode" [class.called]="isLastCalledRoom(r)" [class.active]="announcingRoomId === stringId(r.room_id)">
                {{roomDisplayNo(r) || '---'}}
                <small class="legacy-queue-no" *ngIf="showLegacyQueue() && legacyNo(r.active)">({{legacyNo(r.active)}})</small>
              </div>
              <div class="room-list-device-queues" *ngIf="isRoomListMode">
                <span *ngFor="let q of roomQueues(r)" [class.called]="isLastCalledQueue(r, q)" [class.active]="announcingRoomId === stringId(r.room_id) && displayNo(q) === roomDisplayNo(r)">
                  <b>{{displayNo(q)}}</b>
                  <small class="legacy-queue-no" *ngIf="showLegacyQueue() && legacyNo(q)">({{legacyNo(q)}})</small>
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

    <main class="multi2-display-page" *ngIf="!error && !loading && isMulti2Mode" [ngStyle]="displayFontStyle">
      <header class="multi-display-header">
        <div class="multi-title-group">
          <a [href]="appRouteUrl('/display-device')" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
          <h1>{{title}}</h1>
        </div>
        <div class="multi-clock">เวลา&nbsp; {{clock}}</div>
        <div class="multi-tools">
          <button title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="multi2-top">
        <div class="media-stage">
          <img *ngIf="currentMedia && currentMedia.type !== 'youtube'" [src]="api.mediaUrl(currentMedia.file)" [alt]="currentMedia.label || 'media'">
          <div class="youtube-frame-wrap" *ngIf="currentMedia?.type === 'youtube'">
            <iframe #youtubeFrame [src]="youtubeEmbed(currentMedia)" (load)="syncYoutubeSound()" title="YouTube media" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div *ngIf="!currentMedia" class="media-empty">ยังไม่มีสื่อแสดงผล</div>
          <span class="media-counter" *ngIf="media.length">{{mediaIndex + 1}} / {{media.length}}</span>
        </div>

        <div class="quad-board">
          <div class="quad-card" *ngFor="let r of quadRoomsData; trackBy: trackByRoomId" [ngStyle]="queueColorStyle()">
            <div class="room-number">{{r.room_number || r.room_id}}</div>
            <div class="queue-number" [class.called]="isLastCalledRoom(r)" [class.active]="announcingRoomId === stringId(r.room_id)">
              {{roomDisplayNo(r) || '---'}}
              <small class="legacy-queue-no" *ngIf="showLegacyQueue() && legacyNo(r.active)">({{legacyNo(r.active)}})</small>
            </div>
          </div>
        </div>
      </section>

      <div class="called-panel">
        <div class="called-label">
          <i class="fa-solid fa-bullhorn"></i>
          <b>เรียกแล้วไม่พบ</b>
        </div>
        <div class="called-list">
          <div class="called-chip" *ngFor="let c of calledList" [ngStyle]="queueColorStyle()">
            <strong>{{displayNo(c)}}</strong><span>#{{c.room_number || c.room_id}}</span>
          </div>
        </div>
        <div class="qr-card">
          <img [src]="qrSrc" alt="QR Code">
          <b>สแกนเช็คคิวผ่านมือถือ</b>
        </div>
      </div>

      <button class="sound-unlock" *ngIf="voiceEnabled && !audioUnlocked" (click)="unlockAudio()">
        <i class="fa-solid fa-volume-high"></i>
        <span>เปิดเสียงเรียกคิว</span>
      </button>
    </main>
  `
})
export class DisplayDeviceComponent implements OnInit {
  @ViewChild('youtubeFrame') youtubeFrame?: ElementRef<HTMLIFrameElement>;
  @ViewChild('gridHistoryTrack') gridHistoryTrack?: ElementRef<HTMLElement>;
  gridHistoryScrolling = false;
  gridHistoryDistance = 0;
  gridHistoryDuration = 10;

  token = '';
  previewId = '';
  demoMode = false;
  sandboxMode = false;
  sandboxColorOverride: any = null;
  device: any = null;
  loading = true;
  error = false;
  message = 'กำลังตรวจสอบ device token...';
  roomsData: any[] = [];
  singleData: any = null;
  trackByRoomId(_index: number, room: any) { return room?.room_id; }
  calledList: any[] = [];
  calledHistory: any[] = [];
  title = 'หน้าจอแสดงหมายเลขรับบริการรวม';
  clock = '';
  media: any[] = [];
  currentMedia: any = null;
  mediaIndex = 0;
  slideTimer?: number;
  youtubeUrlCache = new Map<string, any>();
  initialLoadDone = false;
  lastActiveByRoom = new Map<string, string>();
  displayedQueueByRoom = new Map<string, string>();
  displayedQueuesByRoom = new Map<string, any[]>();
  pendingRoomListItems = new Map<string, { roomId: string; item: any }>();
  announcingRoomId = '';
  lastCalledRoomId = '';
  lastCalledQueueNo = '';
  displaySettings: any = {};
  forceAnnounceRooms = new Set<string>();
  suppressAnnounceRooms = new Set<string>();
  audioQueue: Array<{ queueNo: string; roomNumber: string; roomId: string; slotId?: string; attempts?: number }> = [];
  audioQueueRunning = false;
  activeAudioSlotId = '';
  recentlyQueuedAudio = new Set<string>();
  playbackAbort?: AbortController;
  currentAudio?: HTMLAudioElement;
  callRepeatCount = 1;
  voiceEnabled = localStorage.getItem('display_voice_enabled') !== 'false';
  audioUnlocked = true;
  youtubeSoundEnabled = localStorage.getItem('display_youtube_sound_enabled') === 'true';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';
  qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=${encodeURIComponent(appAbsoluteUrl('/check-queue'))}`;

  constructor(
    private route: ActivatedRoute,
    public api: QueueService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  appRouteUrl = appRouteUrl;

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('sandbox') === '1') {
      this.sandboxMode = true;
      this.demoMode = true;
      const deviceType = this.route.snapshot.queryParamMap.get('device_type') || 'multi';
      const roomIds = (this.route.snapshot.queryParamMap.get('room_ids') || '').split(',').map(s => s.trim()).filter(Boolean);
      const locationId = this.route.snapshot.queryParamMap.get('location_id') || '';
      const queueLimit = Number(this.route.snapshot.queryParamMap.get('queue_limit') || 6);
      if (!roomIds.length) { this.showError('กรุณาเลือกห้องอย่างน้อย 1 ห้อง'); return; }
      const colorOverrideRaw = this.route.snapshot.queryParamMap.get('queue_colors_override');
      if (colorOverrideRaw) {
        try { this.sandboxColorOverride = JSON.parse(colorOverrideRaw); } catch { this.sandboxColorOverride = null; }
      }
      this.device = {
        device_id: 'sandbox', device_type: deviceType, room_ids: roomIds, location_id: locationId,
        settings: {
          queue_limit: queueLimit,
          show_legacy_queue: this.route.snapshot.queryParamMap.get('show_legacy_queue') === '1',
          hide_media: this.route.snapshot.queryParamMap.get('hide_media') === '1',
          show_called_list: this.route.snapshot.queryParamMap.get('show_called_list') !== '0',
          show_called_history: this.route.snapshot.queryParamMap.get('show_called_history') === '1',
        },
      };
      this.loading = false;
      this.loadBoard();
      if (locationId) this.loadMedia();
      return;
    }

    const queryToken = this.route.snapshot.queryParamMap.get('token') || '';
    this.previewId = this.route.snapshot.queryParamMap.get('preview_id') || '';
    this.demoMode = this.previewId !== '' && this.route.snapshot.queryParamMap.get('demo') === '1';
    if (queryToken) {
      localStorage.setItem('display_device_token', queryToken);
      sessionStorage.removeItem('display_device_token');
      history.replaceState({}, '', appRouteUrl('/display-device'));
    }
    const legacyToken = sessionStorage.getItem('display_device_token') || '';
    if (!queryToken && legacyToken) {
      localStorage.setItem('display_device_token', legacyToken);
      sessionStorage.removeItem('display_device_token');
    }
    this.token = queryToken || localStorage.getItem('display_device_token') || legacyToken;
    if (!this.token && !this.previewId) {
      this.showError('ไม่พบ token ใน URL');
      return;
    }

    const deviceRequest = this.previewId
      ? this.api.previewDisplayDevice(this.previewId)
      : this.api.resolveDisplayDevice(this.token);
    deviceRequest.subscribe({
      next: r => {
        this.device = r.data;
        if (!this.device?.room_ids?.length) {
          this.showError('device นี้ยังไม่ได้ตั้งค่าห้องตรวจ');
          return;
        }
        this.loading = false;
        this.loadBoard();
        this.loadMedia();
        if (!this.demoMode) {
          this.api.connect(
            this.device.room_ids.map((id: any) => `room:${id}`),
            this.previewId ? {} : { deviceToken: this.token },
          );
        }
      },
      error: err => this.showError(this.previewId
        ? (err?.status === 401 || err?.status === 403 ? 'กรุณาเข้าสู่ระบบด้วยสิทธิ์ admin เพื่อดูตัวอย่าง' : 'ไม่พบ device สำหรับดูตัวอย่าง')
        : (err?.status === 403 ? 'IP ของเครื่องนี้ไม่ได้รับอนุญาตให้ใช้ device นี้' : 'ไม่พบ device token หรือ token ถูกปิดใช้งาน')),
    });

    this.api.events$.subscribe(e => {
      if (e.type === 'ws.reconnected' && this.device?.room_ids?.length) {
        this.loadBoard();
        return;
      }
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
          if (this.lastCalledRoomId === eventRoomId) {
            this.lastCalledRoomId = '';
            this.lastCalledQueueNo = '';
          }
          this.roomsData = this.roomsData.map(room => String(room.room_id) === eventRoomId ? { ...room, active: null } : room);
          this.calledList = this.calledList.filter(item => String(item.room_id) !== eventRoomId);
          if (slotId) {
            this.pendingRoomListItems.delete(slotId);
            this.displayedQueuesByRoom.set(eventRoomId, (this.displayedQueuesByRoom.get(eventRoomId) || [])
              .filter(item => this.roomListItemKey(item) !== slotId));
          }
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
    setInterval(() => {
      if (this.device?.room_ids?.length && !this.demoMode) this.loadBoard();
    }, 30000);
  }

  loadBoard() {
    const displayRequest = this.sandboxMode
      ? this.api.sandboxDisplayData(this.device.device_type, this.device.room_ids.join(','), Number(this.device.settings?.queue_limit || 6))
      : this.previewId
        ? this.api.previewDisplayDeviceData(this.previewId)
        : this.api.displayDevice(this.token);
    displayRequest.subscribe({
      next: r => {
        if (this.demoMode && !this.sandboxMode && !this.initialLoadDone) {
          r = {
            ...r,
            rooms_data: (r.rooms_data || []).map((room: any) => ({ ...room, active: null, queues: [] })),
            called_list: [],
            called_history: [],
          };
        }
        this.singleData = this.isSingleMode ? r : null;
        this.roomsData = r.rooms_data || [];
        this.calledList = r.called_list || [];
        this.calledHistory = r.called_history || [];
        this.callRepeatCount = this.normalizeRepeatCount(r.call_repeat_count);
        this.displaySettings = r.display_settings || {};
        if (this.sandboxMode && this.sandboxColorOverride) {
          const { queue_font_weight, ...colorFields } = this.sandboxColorOverride;
          this.displaySettings = {
            ...this.displaySettings,
            queue_colors: { ...(this.displaySettings.queue_colors || {}), ...colorFields },
            ...(queue_font_weight ? { queue_font_weight } : {}),
          };
        }
        this.title = this.roomsData[0]?.location_name
          ? `หน้าจอแสดงหมายเลขรับบริการ${this.isSingleMode ? '' : 'รวม'} ${this.roomsData[0].location_name}`
          : `หน้าจอแสดงหมายเลขรับบริการ${this.isSingleMode ? '' : 'รวม'}`;
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
        if (this.isRoomListMode) {
          const limit = Math.min(12, Math.max(1, Math.round(Number(this.device?.settings?.queue_limit) || 6)));
          const freshQueues = Array.isArray(room.queues) ? room.queues : [];
          if (!this.initialLoadDone) {
            this.displayedQueuesByRoom.set(key, freshQueues.slice(0, limit));
          } else {
            const freshByKey = new Map(freshQueues.map((item: any) => [this.roomListItemKey(item), item]));
            const current = (this.displayedQueuesByRoom.get(key) || [])
              .filter(item => freshByKey.has(this.roomListItemKey(item)))
              .map(item => freshByKey.get(this.roomListItemKey(item)) || item);
            this.displayedQueuesByRoom.set(key, current);
            const shownKeys = new Set(current.map(q => this.roomListItemKey(q)));
            for (const item of freshQueues) {
              const itemKey = this.roomListItemKey(item);
              let isCurrentCall = this.activeAudioSlotId === itemKey
                || (this.lastCalledRoomId === key && this.lastCalledQueueNo === this.displayNo(item));
              if (!itemKey || this.pendingRoomListItems.has(itemKey)) continue;
              if (shownKeys.has(itemKey)) {
                if (this.activeAudioSlotId === itemKey) {
                  this.displayedQueuesByRoom.set(key, [item, ...(this.displayedQueuesByRoom.get(key) || [])
                    .filter(shown => this.roomListItemKey(shown) !== itemKey)].slice(0, limit));
                }
                continue;
              }
              if (this.voiceEnabled && !isCurrentCall && !this.hasQueuedSlot(itemKey)) {
                this.enqueueQueueAudio(this.displayNo(item), room.room_number || room.room_id, key, itemKey);
                isCurrentCall = this.activeAudioSlotId === itemKey;
              }
              if (this.voiceEnabled && !isCurrentCall) {
                this.pendingRoomListItems.set(itemKey, { roomId: key, item });
              } else {
                this.displayedQueuesByRoom.set(key, [item, ...(this.displayedQueuesByRoom.get(key) || [])].slice(0, limit));
              }
            }
          }
        }
      }
        this.initialLoadDone = true;
        if (!this.lastCalledRoomId) this.setLatestCalledFromData();
        if (this.isRoomGridMode) setTimeout(() => this.checkGridHistoryOverflow(), 0);
      },
      error: err => this.showError(err?.status === 403 ? 'IP ของเครื่องนี้ไม่ได้รับอนุญาตให้ใช้ device นี้' : 'โหลดข้อมูลหน้าจอไม่สำเร็จ'),
    });
  }

  checkGridHistoryOverflow() {
    const el = this.gridHistoryTrack?.nativeElement;
    const container = el?.parentElement;
    if (!el || !container) return;
    // Measure the text's true unconstrained width via a detached clone: the in-place
    // inline-block can end up laid out no wider than its overflow:hidden ancestor, which
    // makes its own scrollWidth useless for detecting whether it actually overflows.
    const probe = el.cloneNode(true) as HTMLElement;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.left = '-9999px';
    probe.style.width = 'auto';
    probe.style.display = 'inline-block';
    document.body.appendChild(probe);
    const naturalWidth = probe.scrollWidth;
    probe.remove();
    const overflow = naturalWidth - container.clientWidth;
    this.gridHistoryScrolling = overflow > 4;
    this.gridHistoryDistance = Math.max(0, overflow);
    this.gridHistoryDuration = Math.max(6, Math.round(this.gridHistoryDistance / 40));
  }

  @HostListener('window:message', ['$event'])
  onPreviewMessage(event: MessageEvent) {
    if (!this.demoMode || event.origin !== location.origin) return;
    const type = event.data?.type;
    if (type === 'cpaqueue.preview.call') {
      const roomId = String(event.data.roomId || '');
      const queueNo = String(event.data.queueNo || '').trim();
      const room = this.roomsData.find(item => String(item.room_id) === roomId);
      if (!room || !queueNo) return;
      const mockCall = {
        call_id: `preview-${Date.now()}-${roomId}`,
        opd_qs_slot_id: `preview-${Date.now()}-${roomId}`,
        oqueue: queueNo,
        queue_no: queueNo,
        queue_slot_number: queueNo,
        call_datetime: new Date().toISOString(),
      };
      this.roomsData = this.roomsData.map(item => String(item.room_id) === roomId
        ? { ...item, active: mockCall, is_latest: true, queues: [mockCall, ...(item.queues || [])].slice(0, Number(this.device?.settings?.queue_limit || 6)) }
        : { ...item, is_latest: false });
      this.calledHistory = [{
        queue_no: queueNo,
        oqueue: queueNo,
        room_id: roomId,
        room_number: String(event.data.roomNumber || room.room_number || roomId),
        patient_name: '',
        hn: '',
      }, ...this.calledHistory].slice(0, 20);
      this.enqueueQueueAudio(queueNo, String(event.data.roomNumber || room.room_number || roomId), roomId, mockCall.opd_qs_slot_id);
      this.cdr.detectChanges();
    } else if (type === 'cpaqueue.preview.hold') {
      const roomId = String(event.data.roomId || '');
      const queueNo = String(event.data.queueNo || '').trim();
      const room = this.roomsData.find(item => String(item.room_id) === roomId);
      if (!room || !queueNo) return;
      const mockHold = {
        queue_no: queueNo,
        oqueue: queueNo,
        room_id: roomId,
        room_number: String(event.data.roomNumber || room.room_number || roomId),
        patient_name: '',
        hn: '',
      };
      this.calledList = [mockHold, ...this.calledList].slice(0, 20);
      this.cdr.detectChanges();
    }
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

  showLegacyQueue() {
    return !!this.device?.settings?.show_legacy_queue;
  }

  hideMedia() {
    return !!this.device?.settings?.hide_media;
  }

  showCalledList() {
    return this.device?.settings?.show_called_list !== false;
  }

  showCalledHistory() {
    return !!this.device?.settings?.show_called_history;
  }

  get calledHistoryText() {
    return this.calledHistory.map(q => this.displayNo(q)).filter(Boolean).join('   •   ');
  }

  get calledListText() {
    return this.calledList.map(q => this.displayNo(q)).filter(Boolean).join('   •   ');
  }

  legacyNo(q: any) {
    if (!q) return '';
    const primary = String(this.displayNo(q) || '');
    const alt = String((this.queueType === 'oqueue' ? q.queue_slot_number : q.oqueue) || '');
    return alt && alt !== primary ? alt : '';
  }

  roomDisplayNo(room: any) {
    const key = String(room?.room_id ?? '');
    return this.displayedQueueByRoom.get(key) || (!this.initialLoadDone ? this.displayNo(room?.active) : '');
  }

  isLastCalledRoom(room: any) {
    const key = String(room?.room_id ?? '');
    return !!key && this.lastCalledRoomId === key;
  }

  isLastCalledQueue(room: any, q: any) {
    return String(room?.room_id ?? '') === this.lastCalledRoomId && this.displayNo(q) === this.lastCalledQueueNo;
  }

  queueColorStyle() {
    return queueColorVariables(this.displaySettings?.queue_colors, this.displaySettings?.queue_font_weight);
  }

  get displayFontStyle() {
    return displayPageVariables(this.displaySettings);
  }

  setLatestCalledFromData() {
    const items = this.roomsData.flatMap(room => {
      const queues = this.isRoomListMode ? this.roomQueues(room) : (room.active ? [room.active] : []);
      return queues.map((q: any) => ({ roomId: String(room.room_id), queueNo: this.displayNo(q), at: new Date(q.call_datetime || q.logged_at || 0).getTime() }));
    }).filter(item => item.queueNo);
    const latest = items.sort((a, b) => b.at - a.at)[0];
    this.lastCalledRoomId = latest?.roomId || '';
    this.lastCalledQueueNo = latest?.queueNo || '';
  }

  get isRoomListMode() {
    return this.device?.device_type === 'room-list';
  }

  get isSingleMode() {
    return this.device?.device_type === 'single';
  }

  get isMulti2Mode() {
    return this.device?.device_type === 'multi2';
  }

  get isRoomGridMode() {
    return this.device?.device_type === 'room-grid';
  }

  get gridLocationName() {
    return this.roomsData[0]?.location_name || this.device?.device_name || 'จุดบริการ';
  }

  get gridDateText() {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const now = new Date();
    return `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  }

  // Up to 4 fixed slots. With 4 or fewer assigned rooms, each keeps its own slot (in room-number
  // order). With more than 4, the rooms currently being called take priority so a room in the
  // middle of a call is never bumped off screen, and the rest share the remaining slots.
  get quadRoomsData() {
    const ids: string[] = (this.device?.room_ids || []).map(String);
    const pool = ids.map(id => this.roomsData.find(room => String(room.room_id) === id)).filter(Boolean) as any[];
    if (pool.length <= 4) return pool;
    const active = pool
      .filter(room => room.active)
      .sort((a, b) => new Date(b.active?.call_datetime || 0).getTime() - new Date(a.active?.call_datetime || 0).getTime());
    const rest = pool.filter(room => !room.active);
    return [...active, ...rest].slice(0, 4);
  }

  get singleRoom() {
    const activeRoomId = this.announcingRoomId || this.lastCalledRoomId;
    if (activeRoomId) {
      const activeRoom = this.roomsData.find(room => String(room.room_id) === String(activeRoomId));
      if (activeRoom) return activeRoom;
    }
    return this.roomsData
      .filter(room => room.active)
      .sort((a, b) => new Date(b.active?.call_datetime || 0).getTime() - new Date(a.active?.call_datetime || 0).getTime())[0]
      || this.roomsData[0]
      || null;
  }

  get singleCurrentNumber() {
    return this.roomDisplayNo(this.singleRoom) || '---';
  }

  get singleRoomName() {
    return this.singleRoom?.room_name || `ห้อง ${this.singleRoom?.room_number || ''}`.trim();
  }

  get singleDestinationText() {
    const label = String(this.displaySettings?.destination_label || 'ห้องตรวจ').trim();
    const roomNumber = String(this.singleRoom?.room_number || this.singleRoom?.room_id || '').trim();
    return `${label.startsWith('ที่') ? '' : 'ที่ '}${label}${roomNumber ? ` ${roomNumber}` : ''}`.trim();
  }

  get singleLocationName() {
    return this.singleRoom?.location_name || this.device?.device_name || 'จุดบริการ';
  }

  get isDualMode() {
    return this.device?.device_type === 'dual';
  }

  get dualLocationName() {
    return this.roomsData[0]?.location_name || this.device?.device_name || 'จุดบริการ';
  }

  dualRoom(index: number) {
    const roomId = this.device?.room_ids?.[index];
    if (!roomId) return null;
    return this.roomsData.find(room => String(room.room_id) === String(roomId)) || null;
  }

  dualCurrentNumber(index: number) {
    return this.roomDisplayNo(this.dualRoom(index)) || '---';
  }

  dualRoomLabel(index: number) {
    const label = String(this.displaySettings?.destination_label || 'ห้องตรวจ').trim();
    const room = this.dualRoom(index);
    const roomNumber = String(room?.room_number || room?.room_id || '').trim();
    return `${label}${roomNumber ? ` ${roomNumber}` : ''}`.trim();
  }

  roomQueues(room: any) {
    return this.displayedQueuesByRoom.get(String(room?.room_id)) || [];
  }

  roomListItemKey(item: any) {
    return String(item?.slot_id ?? item?.opd_qs_slot_id ?? item?.call_id ?? '');
  }

  revealRoomListItem(key: string) {
    const pending = this.pendingRoomListItems.get(key);
    if (!pending) return;
    this.pendingRoomListItems.delete(key);
    const { roomId, item } = pending;
    const limit = Math.min(12, Math.max(1, Math.round(Number(this.device?.settings?.queue_limit) || 6)));
    const current = this.displayedQueuesByRoom.get(roomId) || [];
    if (current.some(q => this.roomListItemKey(q) === key)) return;
    this.displayedQueuesByRoom.set(roomId, [item, ...current].slice(0, limit));
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

  hasQueuedSlot(slotId: string) {
    return !!slotId && (this.activeAudioSlotId === slotId
      || this.audioQueue.some(item => String(item.slotId || '') === slotId));
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
          const played = await this.speakQueue(item.queueNo, item.roomNumber, item.roomId, item.slotId);
          if (!played) {
            if (!this.audioUnlocked) {
              this.audioQueue.unshift(item);
              this.audioQueueRunning = false;
              return;
            }
            item.attempts = (item.attempts || 0) + 1;
            if (item.attempts < 3) this.audioQueue.push(item);
            break;
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

  async speakQueue(queueNo: string, roomNumber: string, roomId: string, slotId?: string) {
    if (!this.voiceEnabled) return true;
    this.activeAudioSlotId = String(slotId || '');
    this.displayedQueueByRoom.set(String(roomId), queueNo);
    if (slotId) this.revealRoomListItem(slotId);
    this.announcingRoomId = roomId;
    this.cdr.detectChanges();
    this.duckYoutubeAudio(true);
    this.playbackAbort = new AbortController();
    const roomDigits = String(roomNumber).replace(/\D/g, '');
    try {
      await this.playCallAudio(queueNo, roomDigits || String(roomNumber), this.playbackAbort.signal);
      this.lastCalledRoomId = String(roomId);
      this.lastCalledQueueNo = queueNo;
      return true;
    } catch (err) {
      console.warn('TTS playback failed', err);
      if (this.isAutoplayBlocked(err)) this.audioUnlocked = false;
      return false;
    } finally {
      if (this.activeAudioSlotId === String(slotId || '')) this.activeAudioSlotId = '';
      this.duckYoutubeAudio(false);
      if (this.announcingRoomId === roomId) this.announcingRoomId = '';
      this.cdr.detectChanges();
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
    for (const key of [...this.pendingRoomListItems.keys()]) this.revealRoomListItem(key);
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
  }

  showError(message: string) {
    this.error = true;
    this.loading = false;
    this.message = message;
  }
}
