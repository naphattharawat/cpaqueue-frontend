import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { abortError, playAudioSequence } from './audio-playback.util';
import { appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="display-screen" *ngIf="roomId; else setup">
      <header>
        <a [href]="appRouteUrl('/')" class="icon-btn light"><i class="fa-solid fa-arrow-left"></i></a>
        <div><small>โรงพยาบาลเจ้าพระยาอภัยภูเบศร</small><h2>{{doctorName || locationName}}</h2></div>
        <div class="time"><b>{{clock}}</b><span>{{dateText}}</span></div>
      </header>

      <section class="display-center">
        <div class="room-pill"><i class="fa-solid fa-user-doctor"></i>{{roomName || 'ห้องตรวจ'}}</div>
        <div class="display-card active-card" [class.pulse]="announcing">
          <span>หมายเลขรับบริการปัจจุบัน</span>
          <strong>{{currentNumber}}</strong>
          <em>{{currentSub}}</em>
          <b>{{active ? 'เรียกหมายเลข' : 'รอเรียกคิว'}}</b>
        </div>

        <section class="hold-strip" *ngIf="holdQueues.length">
          <h3><i class="fa-solid fa-user-clock"></i> หมายเลขที่เรียกผ่านไปแล้ว ({{holdQueues.length}} หมายเลข)</h3>
          <div><span *ngFor="let q of holdQueues">{{displayNo(q)}}<small>{{subNo(q)}}</small></span></div>
        </section>
      </section>

      <footer><span> </span><span> </span><span>กลุ่มภารกิจสุขภาพดิจิทัล</span></footer>
      <button class="sound-unlock" *ngIf="!audioUnlocked" (click)="unlockAudio()">
        <i class="fa-solid fa-volume-high"></i>
        <span>เปิดเสียงเรียกคิว</span>
      </button>
    </main>

    <ng-template #setup>
      <main class="display-screen display-setup-screen">
        <header>
          <a [href]="appRouteUrl('/')" class="icon-btn light"><i class="fa-solid fa-arrow-left"></i></a>
          <div><small>Queue Display</small><h2>เลือกจุดบริการสำหรับหน้าจอแสดงคิว</h2></div>
          <div class="time"><b>{{clock}}</b><span>{{dateText}}</span></div>
        </header>

        <section class="display-setup-card">
          <label>จุดบริการ
            <select [(ngModel)]="locationId" (change)="locationChanged()">
              <option value="">-- เลือกจุดบริการ --</option>
              <option *ngFor="let l of locations" [value]="l.opd_qs_location_id">{{l.opd_qs_location_name}}</option>
            </select>
          </label>

          <div class="room-pick single">
            <label *ngFor="let r of rooms" [class.active]="selectedRoomId === stringId(r.opd_qs_room_id)">
              <input type="radio" name="display_room" [value]="r.opd_qs_room_id" [(ngModel)]="selectedRoomId">
              ห้อง #{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}
            </label>
          </div>

          <div class="empty-row" *ngIf="locationId && !rooms.length">ไม่พบห้องตรวจของจุดบริการนี้</div>
          <button class="btn display-start" [disabled]="!selectedRoomId" (click)="startDisplay()">
            <i class="fa-solid fa-tv"></i> เปิดหน้าจอแสดงคิว
          </button>
        </section>
      </main>
    </ng-template>
  `,
})
export class DisplayComponent implements OnInit {
  locationId = localStorage.getItem('display_location_id') || '';
  selectedRoomId = '';
  locations: any[] = [];
  rooms: any[] = [];
  roomId = '';
  doctorCode = '';
  active: any = null;
  holdQueues: any[] = [];
  roomName = '';
  doctorName = '';
  locationName = '';
  clock = '';
  dateText = '';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';
  announcing = false;
  audioUnlocked = true;
  audioQueue: Array<{ queueNo: string; roomNumber: string; roomId: string; slotId?: string }> = [];
  audioQueueRunning = false;
  recentlyQueuedAudio = new Set<string>();
  playbackAbort?: AbortController;
  currentAudio?: HTMLAudioElement;
  callRepeatCount = 1;
  initialLoadDone = false;
  processed = new Map<string, string>();
  forceAnnounceRoomId = '';
  suppressAnnounceRoomId = '';
  displayedCurrentNumber = '';
  canceledSlotIds = new Set<string>();

  constructor(private route: ActivatedRoute, private api: QueueService) {}

  appRouteUrl = appRouteUrl;

  ngOnInit() {
    this.api.locations().subscribe(r => {
      this.locations = r.data || [];
      if (this.locationId && !this.roomId) this.loadRooms();
    });

    this.route.queryParamMap.subscribe(p => {
      this.locationId = p.get('location_id') || this.locationId || '';
      this.roomId = p.get('room_id') || '';
      this.selectedRoomId = this.roomId;
      this.doctorCode = p.get('doctor_code') || '';
      this.initialLoadDone = false;
      this.processed.clear();
      if (this.roomId) {
        localStorage.setItem('display_location_id', this.locationId);
        this.load();
        this.api.connect([`location:${this.locationId}`, `room:${this.roomId}`]);
      } else if (this.locationId) {
        this.loadRooms();
      }
    });

    setInterval(() => this.tick(), 1000);
    this.tick();
    this.api.events$.subscribe(e => {
      if (e.type === 'queue.changed' && this.roomId) {
        const eventRoomId = String(e.payload?.roomId ?? '');
        const slotId = String(e.payload?.slotId ?? '');
        if (e.payload?.action === 'cancel' && (!eventRoomId || eventRoomId === String(this.roomId))) {
          this.suppressAnnounceRoomId = eventRoomId || String(this.roomId);
          if (slotId) this.canceledSlotIds.add(slotId);
          this.audioQueue = this.audioQueue.filter(item => !slotId || String(item.slotId || '') !== slotId);
          this.stopAudioPlayback();
          this.active = null;
          this.holdQueues = [];
          this.displayedCurrentNumber = this.active ? this.displayNo(this.active) : '';
          this.announcing = false;
        } else if (e.payload?.action === 'call' && (!eventRoomId || eventRoomId === String(this.roomId))) {
          this.forceAnnounceRoomId = this.initialLoadDone ? (eventRoomId || String(this.roomId)) : '';
        }
        this.load();
      }
    });
  }

  stringId(id: unknown) {
    return String(id);
  }

  locationChanged() {
    this.selectedRoomId = '';
    localStorage.setItem('display_location_id', this.locationId);
    this.loadRooms();
  }

  loadRooms() {
    if (!this.locationId) {
      this.rooms = [];
      return;
    }
    this.api.rooms(this.locationId).subscribe(r => this.rooms = r.data || []);
  }

  startDisplay() {
    if (!this.locationId || !this.selectedRoomId) return;
    this.roomId = this.selectedRoomId;
    localStorage.setItem('display_location_id', this.locationId);
    history.replaceState(null, '', appRouteUrl(`/display?location_id=${this.locationId}&room_id=${this.roomId}`));
    this.load();
    this.api.connect([`location:${this.locationId}`, `room:${this.roomId}`]);
  }

  load() {
    if (!this.roomId) return;
    this.api.display({ location_id: this.locationId, room_id: this.roomId, doctor_code: this.doctorCode }).subscribe(r => this.render(r));
  }

  render(r: any) {
    this.holdQueues = r.hold_queues || [];
    this.active = r.active;
    this.callRepeatCount = this.normalizeRepeatCount(r.call_repeat_count);
    this.roomName = r.room_info?.display_location_name || r.room_info?.opd_qs_room_name || '';
    this.doctorName = r.room_info?.doctor_name || '';
    this.locationName = r.room_info?.opd_qs_location_name || '';
    const suppressRoom = this.suppressAnnounceRoomId && this.suppressAnnounceRoomId === String(this.roomId);
    if (!this.initialLoadDone && this.active) this.displayedCurrentNumber = this.displayNo(this.active);
    if (suppressRoom) this.displayedCurrentNumber = this.active ? this.displayNo(this.active) : '';

    for (const q of r.active_list || []) {
      const key = String(q.opd_qs_slot_id);
      const signature = this.callSignature(q);
      const lastSignature = this.processed.get(key);
      const shouldForceAnnounce = this.forceAnnounceRoomId && this.forceAnnounceRoomId === String(this.roomId) && q === this.active;
      if (!suppressRoom && this.initialLoadDone && ((!lastSignature || lastSignature !== signature) || shouldForceAnnounce) && !this.canceledSlotIds.has(String(q.opd_qs_slot_id))) {
        this.enqueueQueueAudio(String(this.displayNo(q)), this.roomNumberFromName(), String(this.roomId), String(q.opd_qs_slot_id));
      }
      this.processed.set(key, signature);
    }
    this.forceAnnounceRoomId = '';
    this.suppressAnnounceRoomId = '';
    this.initialLoadDone = true;
  }

  get currentNumber() {
    return this.displayedCurrentNumber || (this.active ? this.displayNo(this.active) : '---');
  }

  get currentSub() {
    return this.active ? this.subNo(this.active) : '';
  }

  displayNo(q: any) {
    return this.queueType === 'oqueue' && q.oqueue ? q.oqueue : q.queue_slot_number;
  }

  subNo(q: any) {
    return this.queueType === 'oqueue' ? `(Z: ${q.queue_slot_number})` : q.oqueue ? `(O: ${q.oqueue})` : '(ไม่มี O)';
  }

  enqueueQueueAudio(queueNo: string, roomNumber: string, roomId: string, slotId?: string) {
    const signature = `${queueNo}:${roomNumber}:${roomId}:${slotId || ''}`;
    if (this.recentlyQueuedAudio.has(signature)) return;
    if (this.audioQueue.some(item => `${item.queueNo}:${item.roomNumber}:${item.roomId}:${item.slotId || ''}` === signature)) return;
    this.recentlyQueuedAudio.add(signature);
    window.setTimeout(() => this.recentlyQueuedAudio.delete(signature), 10000);
    this.audioQueue.push({ queueNo, roomNumber, roomId, slotId });
    this.processAudioQueue();
  }

  async processAudioQueue() {
    if (!this.audioUnlocked) return;
    if (this.audioQueueRunning) return;
    this.audioQueueRunning = true;
    while (this.audioQueue.length) {
      const item = this.audioQueue.shift();
      if (item) {
        for (let i = 0; i < this.callRepeatCount; i += 1) {
          const played = await this.speakQueue(item.queueNo, item.roomNumber);
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

  async speakQueue(queueNo: string, roomNumber: string) {
    if (!this.audioUnlocked) return false;
    this.displayedCurrentNumber = queueNo;
    this.announcing = true;
    this.stopAudioPlayback();
    this.playbackAbort = new AbortController();
    try {
      await this.playCallAudio(queueNo, roomNumber, this.playbackAbort.signal);
      return true;
    } catch (err) {
      console.warn('TTS playback failed', err);
      if (this.isAutoplayBlocked(err)) this.audioUnlocked = false;
      return false;
    } finally {
      setTimeout(() => this.announcing = false, 3000);
    }
  }

  async speak(q: any) {
    if (!this.audioUnlocked) return;
    this.announcing = true;
    const msg = `ขอเชิญหมายเลข ${String(this.displayNo(q)).split('').join(' ')} ที่ ${this.roomName} ค่ะ`;
    try {
      await this.playCallAudio(String(this.displayNo(q)), this.roomNumberFromName());
    } catch (err) {
      console.warn('TTS playback failed', err);
      if (this.isAutoplayBlocked(err)) this.audioUnlocked = false;
    }
    setTimeout(() => this.announcing = false, 3000);
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
      if (this.active && !this.audioQueue.length) this.enqueueQueueAudio(String(this.displayNo(this.active)), this.roomNumberFromName(), String(this.roomId));
      this.processAudioQueue();
    } catch (err) {
      console.warn('Audio unlock failed', err);
    }
  }

  isAutoplayBlocked(err: unknown) {
    const text = `${(err as any)?.name || ''} ${(err as any)?.message || err || ''}`.toLowerCase();
    return text.includes('notallowed') || text.includes('user gesture') || text.includes('not allowed to start') || text.includes('play() failed');
  }

  async playCallAudio(queueNo: string, roomNo: string, signal?: AbortSignal) {
    const url = this.api.ttsUrl(`/call?queue=${encodeURIComponent(queueNo)}&location_id=${encodeURIComponent(this.locationId)}&room=${encodeURIComponent(roomNo)}`);
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      await this.playAudioFiles((data.files || []).map((file: string) => this.api.audioAssetUrl(file)), Number(data.voice_rate || 1), signal);
      return;
    }
    const blob = await response.blob();
    await this.playAudioUrl(URL.createObjectURL(blob), Number(response.headers.get('x-voice-rate') || 1), signal);
  }

  async playAudioFiles(files: string[], rate = 1, signal?: AbortSignal) {
    await playAudioSequence(files, rate, signal);
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

  roomNumberFromName() {
    return String(this.roomName || '').replace(/\D/g, '') || String(this.roomId);
  }

  callSignature(q: any) {
    return String(q.call_id || q.call_datetime || '');
  }

  normalizeRepeatCount(value: any) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
  }

  tick() {
    const n = new Date();
    this.clock = n.toTimeString().slice(0, 8);
    this.dateText = n.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
