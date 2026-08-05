import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { playAudioSequence } from './audio-playback.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="multi-display-page">
      <header class="multi-display-header">
        <div class="multi-title-group">
          <a href="/" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
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
            <img *ngIf="currentMedia" [src]="'/uploads/'+currentMedia.file" [alt]="currentMedia.label || 'media'">
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
  initialLoadDone = false;
  lastActiveByRoom = new Map<string, string>();
  announcingRoomId = '';
  forceAnnounceRooms = new Set<string>();
  settingsOpen = false;
  voiceEnabled = localStorage.getItem('display_voice_enabled') !== 'false';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';
  themeName = localStorage.getItem('display_theme') || 'green';
  qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${location.origin}/check-queue`)}`;

  constructor(private route: ActivatedRoute, private api: QueueService) {}

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
        if (e.payload?.action === 'call' && eventRoomId) {
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
    history.replaceState(null, '', `/display-multi?location_id=${this.locationId}&room_ids=${this.roomIds}`);
    this.loadBoard();
    this.loadMedia();
    this.api.connect(this.roomIds.split(',').map(id => `room:${id}`));
  }

  loadBoard() {
    this.api.displayMulti(this.roomIds).subscribe(r => {
      this.roomsData = r.rooms_data || [];
      this.calledList = r.called_list || [];
      this.title = this.roomsData[0]?.location_name ? `หน้าจอคิวรวม ${this.roomsData[0].location_name}` : 'หน้าจอคิวรวม';
      for (const room of this.roomsData) {
        const activeNo = this.displayNo(room.active);
        const activeSignature = this.activeSignature(room.active);
        const key = String(room.room_id);
        const previous = this.lastActiveByRoom.get(key) || '';
        if (this.initialLoadDone && activeNo && (previous !== activeSignature || this.forceAnnounceRooms.has(key))) {
          this.speakQueue(activeNo, room.room_number || room.room_id, key);
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

  activeSignature(q: any) {
    if (!q) return '';
    return `${this.displayNo(q)}:${q.call_id || q.call_datetime || ''}`;
  }

  async speakQueue(queueNo: string, roomNumber: string, roomId: string) {
    if (!this.voiceEnabled) return;
    this.announcingRoomId = roomId;
    const qSpelled = String(queueNo).split('').join(' ');
    const roomDigits = String(roomNumber).replace(/\D/g, '');
    const roomText = roomDigits ? `ห้องตรวจเบอร์ ${roomDigits}` : `ห้อง ${roomNumber}`;
    const msg = `ขอเชิญหมายเลข ${qSpelled} ที่ ${roomText} ค่ะ`;
    try {
      await this.playCallAudio(queueNo, roomDigits || String(roomNumber));
    } catch (err) {
      console.warn('TTS playback failed', err);
    }
    setTimeout(() => this.announcingRoomId = '', 3000);
  }

  async playCallAudio(queueNo: string, roomNo: string) {
    const url = `/tts/call?queue=${encodeURIComponent(queueNo)}&location_id=${encodeURIComponent(this.locationId)}&room=${encodeURIComponent(roomNo)}`;
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      await this.playAudioFiles(data.files || [], Number(data.voice_rate || 1));
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

  testVoice() {
    const previous = this.voiceEnabled;
    this.voiceEnabled = true;
    this.speakQueue('123', '1', '');
    this.voiceEnabled = previous;
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
