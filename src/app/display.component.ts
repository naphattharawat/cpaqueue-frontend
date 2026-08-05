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
    <main class="display-screen" *ngIf="roomId; else setup">
      <header>
        <a href="/" class="icon-btn light"><i class="fa-solid fa-arrow-left"></i></a>
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

      <footer><span>Design by JPSK</span><span>WebSocket live</span><span>กลุ่มภารกิจสุขภาพดิจิทัล</span></footer>
    </main>

    <ng-template #setup>
      <main class="display-screen display-setup-screen">
        <header>
          <a href="/" class="icon-btn light"><i class="fa-solid fa-arrow-left"></i></a>
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
  initialLoadDone = false;
  processed = new Map<string, string>();
  forceAnnounceRoomId = '';

  constructor(private route: ActivatedRoute, private api: QueueService) {}

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
        if (e.payload?.action === 'call' && (!eventRoomId || eventRoomId === String(this.roomId))) {
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
    history.replaceState(null, '', `/display?location_id=${this.locationId}&room_id=${this.roomId}`);
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
    this.roomName = r.room_info?.display_location_name || r.room_info?.opd_qs_room_name || '';
    this.doctorName = r.room_info?.doctor_name || '';
    this.locationName = r.room_info?.opd_qs_location_name || '';

    for (const q of r.active_list || []) {
      const key = String(q.opd_qs_slot_id);
      const signature = this.callSignature(q);
      const lastSignature = this.processed.get(key);
      const shouldForceAnnounce = this.forceAnnounceRoomId && this.forceAnnounceRoomId === String(this.roomId) && q === this.active;
      if (this.initialLoadDone && ((!lastSignature || lastSignature !== signature) || shouldForceAnnounce)) {
        this.speak(q);
      }
      this.processed.set(key, signature);
    }
    this.forceAnnounceRoomId = '';
    this.initialLoadDone = true;
  }

  get currentNumber() {
    return this.active ? this.displayNo(this.active) : '---';
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

  async speak(q: any) {
    this.announcing = true;
    const msg = `ขอเชิญหมายเลข ${String(this.displayNo(q)).split('').join(' ')} ที่ ${this.roomName} ค่ะ`;
    try {
      await this.playCallAudio(String(this.displayNo(q)), this.roomNumberFromName());
    } catch (err) {
      console.warn('TTS playback failed', err);
    }
    setTimeout(() => this.announcing = false, 3000);
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

  roomNumberFromName() {
    return String(this.roomName || '').replace(/\D/g, '') || String(this.roomId);
  }

  callSignature(q: any) {
    return String(q.call_id || q.call_datetime || '');
  }

  tick() {
    const n = new Date();
    this.clock = n.toTimeString().slice(0, 8);
    this.dateText = n.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
