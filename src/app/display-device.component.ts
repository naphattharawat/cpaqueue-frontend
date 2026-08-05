import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { playAudioSequence } from './audio-playback.util';

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
          <a href="/display-device?token={{token}}" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
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
    </main>
  `,
})
export class DisplayDeviceComponent implements OnInit {
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
  initialLoadDone = false;
  lastActiveByRoom = new Map<string, string>();
  announcingRoomId = '';
  forceAnnounceRooms = new Set<string>();
  voiceEnabled = localStorage.getItem('display_voice_enabled') !== 'false';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';
  qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${location.origin}/check-queue`)}`;

  constructor(private route: ActivatedRoute, private api: QueueService) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
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
        this.api.connect(this.device.room_ids.map((id: any) => `room:${id}`));
      },
      error: err => this.showError(err?.status === 403 ? 'IP ของเครื่องนี้ไม่ได้รับอนุญาตให้ใช้ device นี้' : 'ไม่พบ device token หรือ token ถูกปิดใช้งาน'),
    });

    this.api.events$.subscribe(e => {
      if (e.type === 'queue.changed' && this.device?.room_ids?.length) {
        const eventRoomId = String(e.payload?.roomId ?? '');
        if (e.payload?.action === 'call' && eventRoomId) this.forceAnnounceRooms.add(eventRoomId);
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

  activeSignature(q: any) {
    if (!q) return '';
    return `${this.displayNo(q)}:${q.call_id || q.call_datetime || ''}`;
  }

  async speakQueue(queueNo: string, roomNumber: string, roomId: string) {
    if (!this.voiceEnabled) return;
    this.announcingRoomId = roomId;
    const roomDigits = String(roomNumber).replace(/\D/g, '');
    try {
      await this.playCallAudio(queueNo, roomDigits || String(roomNumber));
    } catch (err) {
      console.warn('TTS playback failed', err);
    }
    setTimeout(() => this.announcingRoomId = '', 3000);
  }

  async playCallAudio(queueNo: string, roomNo: string) {
    const url = `/tts/call?queue=${encodeURIComponent(queueNo)}&location_id=${encodeURIComponent(String(this.device?.location_id || ''))}&room=${encodeURIComponent(roomNo)}`;
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      await playAudioSequence(data.files || [], Number(data.voice_rate || 1));
      return;
    }
    const blob = await response.blob();
    await this.playAudioUrl(URL.createObjectURL(blob), Number(response.headers.get('x-voice-rate') || 1));
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
