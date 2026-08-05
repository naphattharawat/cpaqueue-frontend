import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { playAudioSequence } from './audio-playback.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="service-settings">
      <div class="quick-toast" *ngIf="toastMessage">{{toastMessage}}</div>
      <header>
        <a href="/" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>ตั้งค่าจุดบริการ</h1>
        <div class="save-action">
          <button class="btn" [disabled]="!selected || locationSaving" (click)="saveLocation()">
            {{locationSaving ? 'กำลังบันทึก...' : 'บันทึกจุดบริการ'}}
          </button>
          <span *ngIf="locationSaveStatus" [class.error]="locationSaveStatus === 'บันทึกไม่สำเร็จ'">{{locationSaveStatus}}</span>
        </div>
      </header>

      <section class="settings-layout">
        <aside class="settings-list">
          <input [(ngModel)]="search" placeholder="ค้นหาจุดบริการ...">
          <button *ngFor="let l of filteredLocations" [class.active]="selected?.location_id === l.location_id" (click)="selectLocation(l)">
            <strong>{{l.display_name || l.location_name}}</strong>
            <span>{{l.tts_provider === 'recorded' ? 'ไฟล์เสียง' : 'Google'}} · {{l.devices.length}} devices</span>
          </button>
        </aside>

        <section class="settings-detail" *ngIf="selected">
          <div class="settings-section">
            <h2><i class="fa-solid fa-hospital"></i> ข้อมูลจุดบริการ</h2>
            <label>ชื่อในระบบ <input [value]="selected.location_name" disabled></label>
            <label>ชื่อแสดงผล <input [(ngModel)]="selected.display_name" placeholder="ชื่อที่ต้องการให้แสดง"></label>
          </div>

          <div class="settings-section">
            <h2><i class="fa-solid fa-volume-high"></i> ตั้งค่าเสียง</h2>
            <div class="segmented">
              <button [class.active]="selected.tts_provider === 'google'" (click)="selected.tts_provider='google'">Google</button>
              <button [class.active]="selected.tts_provider === 'recorded'" (click)="selected.tts_provider='recorded'">ไฟล์เสียง</button>
            </div>

            <label>ความเร็วเสียง
              <select [(ngModel)]="selected.voice_rate">
                <option [ngValue]="0.9">ช้า 0.9x</option>
                <option [ngValue]="1">ปกติ 1.0x</option>
                <option [ngValue]="1.15">เร็ว 1.15x</option>
                <option [ngValue]="1.25">เร็วมาก 1.25x</option>
                <option [ngValue]="1.35">เร็วมาก 1.35x</option>
              </select>
            </label>

            <label>จำนวนครั้งที่เรียกซ้ำ
              <select [(ngModel)]="selected.call_repeat_count">
                <option [ngValue]="1">1 ครั้ง</option>
                <option [ngValue]="2">2 ครั้ง</option>
                <option [ngValue]="3">3 ครั้ง</option>
                <option [ngValue]="4">4 ครั้ง</option>
                <option [ngValue]="5">5 ครั้ง</option>
              </select>
            </label>

            <label>ห้องสำหรับทดสอบเสียง
              <select [(ngModel)]="testRoomId">
                <option value="">ใช้ห้องแรกของจุดบริการ</option>
                <option *ngFor="let r of rooms" [value]="stringId(r.opd_qs_room_id)">#{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}</option>
              </select>
            </label>

            <label *ngIf="selected.tts_provider === 'google'">ข้อความปลายทางสำหรับ Google
              <input [(ngModel)]="selected.google_room_label" placeholder="เช่น ห้องตรวจ, ช่องบริการ, จุดซักประวัติ">
            </label>

            <label *ngIf="selected.tts_provider === 'recorded'">ไฟล์เสียงปลายทาง
              <select [(ngModel)]="selected.recorded_room_type">
                <option *ngFor="let item of audioFiles" [value]="item.key">{{item.label}}</option>
              </select>
            </label>

            <button class="btn test-voice-button" (click)="testVoice()">
              <i class="fa-solid fa-volume-high"></i> ทดสอบเสียง
            </button>
            <small *ngIf="selected.tts_provider === 'google'">ทดสอบด้วยประโยค: เชิญหมายเลข 123 {{selected.google_room_label || 'ห้องตรวจ'}} {{previewRoomNumber()}}</small>
            <small *ngIf="selected.tts_provider === 'recorded'">ทดสอบด้วยไฟล์เสียงที่เลือกและหมายเลขตัวอย่าง 123</small>
          </div>

          <div class="settings-section">
            <div class="section-head">
              <h2><i class="fa-solid fa-key"></i> Device token</h2>
              <button class="btn" (click)="newDevice()">เพิ่ม device</button>
            </div>

            <article class="device-card new-device" *ngIf="draftDevice">
              <input [(ngModel)]="draftDevice.device_name" placeholder="ชื่อ device เช่น จอรวมทันตกรรม">
              <select [(ngModel)]="draftDevice.device_type">
                <option value="multi">จอรวม</option>
                <option value="single">จอเดี่ยว</option>
              </select>
              <label>ห้องของ device นี้
                <select multiple [(ngModel)]="draftDevice.room_ids">
                  <option *ngFor="let r of rooms" [value]="stringId(r.opd_qs_room_id)">#{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}</option>
                </select>
              </label>
              <button class="btn" (click)="createDevice()">สร้าง token</button>
            </article>

            <article class="device-card" *ngFor="let d of selected.devices">
              <div class="device-row">
                <input [(ngModel)]="d.device_name">
                <select [(ngModel)]="d.device_type">
                  <option value="multi">จอรวม</option>
                  <option value="single">จอเดี่ยว</option>
                </select>
                <label class="inline-check"><input type="checkbox" [(ngModel)]="d.active"> active</label>
              </div>
              <label>ห้องของ device นี้
                <select multiple [(ngModel)]="d.room_ids">
                  <option *ngFor="let r of rooms" [value]="stringId(r.opd_qs_room_id)">#{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}</option>
                </select>
              </label>
              <div class="device-actions">
                <button class="btn" (click)="saveDevice(d)">บันทึก device</button>
                <button class="btn muted" (click)="rotateToken(d)">Rotate token</button>
                <button class="btn danger" (click)="deleteDevice(d)">ลบ</button>
              </div>
              <div class="token-box" *ngIf="d.setup_token">
                <b>Token แสดงครั้งเดียว</b>
                <code>{{d.setup_token}}</code>
                <code>{{displayDeviceUrl(d.setup_token)}}</code>
              </div>
              <small>last seen: {{d.last_seen_at || '-'}}</small>
            </article>
          </div>
        </section>
      </section>
    </main>
  `,
})
export class ServiceSettingsComponent implements OnInit {
  locations: any[] = [];
  rooms: any[] = [];
  audioFiles: any[] = [];
  selected: any = null;
  search = '';
  draftDevice: any = null;
  testRoomId = '';
  locationSaving = false;
  locationSaveStatus = '';
  private locationSaveTimer?: number;
  toastMessage = '';
  private toastTimer?: number;

  constructor(private api: QueueService) {}

  ngOnInit() {
    this.api.locationConfigs().subscribe(r => {
      this.locations = (r.data || []).map((item: any) => this.normalizeLocation(item));
      if (this.locations[0]) this.selectLocation(this.locations[0]);
    });
    this.api.audioFiles().subscribe(r => this.audioFiles = this.sortAudio(r.data || []));
  }

  get filteredLocations() {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.locations;
    return this.locations.filter(l => `${l.location_name} ${l.display_name}`.toLowerCase().includes(q));
  }

  selectLocation(location: any) {
    this.selected = location;
    this.draftDevice = null;
    this.testRoomId = '';
    this.locationSaveStatus = '';
    this.api.rooms(location.location_id).subscribe(r => {
      this.rooms = r.data || [];
      this.testRoomId = this.stringId(this.rooms[0]?.opd_qs_room_id || '');
    });
  }

  saveLocation() {
    if (!this.selected || this.locationSaving) return;
    window.clearTimeout(this.locationSaveTimer);
    this.locationSaving = true;
    this.locationSaveStatus = 'กำลังบันทึก...';
    this.api.updateLocationConfig(this.selected.location_id, this.selected).subscribe({
      next: r => {
        const next = this.normalizeLocation(r.data);
        this.locations = this.locations.map(l => l.location_id === next.location_id ? next : l);
        this.selected = next;
        this.locationSaving = false;
        this.locationSaveStatus = 'บันทึกแล้ว';
        this.showToast('บันทึกจุดบริการสำเร็จ');
        this.locationSaveTimer = window.setTimeout(() => this.locationSaveStatus = '', 2500);
      },
      error: err => {
        console.warn('Save location failed', err);
        this.locationSaving = false;
        this.locationSaveStatus = 'บันทึกไม่สำเร็จ';
      },
    });
  }

  newDevice() {
    this.draftDevice = {
      device_name: '',
      device_type: 'multi',
      room_ids: [],
      allowed_ips_text: '',
      active: true,
    };
  }

  createDevice() {
    if (!this.draftDevice?.room_ids?.length) {
      this.showToast('กรุณาเลือกห้องของ device');
      return;
    }
    this.api.createDisplayDevice(this.selected.location_id, this.devicePayload(this.draftDevice)).subscribe(r => {
      this.selected.devices = [this.normalizeDevice(r.data), ...this.selected.devices];
      this.draftDevice = null;
    });
  }

  saveDevice(device: any) {
    this.api.updateDisplayDevice(String(device.device_id), this.devicePayload(device)).subscribe({
      next: r => {
        Object.assign(device, this.normalizeDevice(r.data));
        this.showToast('บันทึก device สำเร็จ');
      },
      error: err => {
        console.warn('Save device failed', err);
        this.showToast('บันทึก device ไม่สำเร็จ');
      },
    });
  }

  rotateToken(device: any) {
    this.api.rotateDisplayDeviceToken(String(device.device_id)).subscribe(r => Object.assign(device, this.normalizeDevice(r.data)));
  }

  deleteDevice(device: any) {
    this.api.deleteDisplayDevice(String(device.device_id)).subscribe(() => {
      this.selected.devices = this.selected.devices.filter((d: any) => d.device_id !== device.device_id);
    });
  }

  async testVoice() {
    if (!this.selected) return;
    try {
      const params = new URLSearchParams({
        queue: '123',
        location_id: this.selected.location_id,
        room: this.previewRoomNumber(),
        provider: this.selected.tts_provider,
        voice_rate: String(this.selected.voice_rate || 1),
      });
      if (this.selected.tts_provider === 'google') params.set('room_label', this.selected.google_room_label || 'ห้องตรวจ');
      if (this.selected.tts_provider === 'recorded') params.set('room_type', this.selected.recorded_room_type || 'doctor_room');
      const response = await fetch(this.api.ttsUrl(`/call?${params.toString()}`));
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        await playAudioSequence(data.files || [], Number(data.voice_rate || this.selected.voice_rate || 1));
        return;
      }
      const blob = await response.blob();
      await this.playAudioUrl(URL.createObjectURL(blob), Number(response.headers.get('x-voice-rate') || this.selected.voice_rate || 1));
    } catch (err) {
      console.warn('Voice test failed', err);
    }
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

  previewRoomNumber() {
    const room = this.rooms.find(r => String(r.opd_qs_room_id) === String(this.testRoomId)) || this.rooms[0];
    return String(room?.opd_qs_room_number || '1').replace(/\D/g, '') || '1';
  }

  devicePayload(device: any) {
    return {
      ...device,
      allowed_ips: String(device.allowed_ips_text || '').split(',').map(ip => ip.trim()).filter(Boolean),
    };
  }

  displayDeviceUrl(token: string) {
    return `${location.origin}/display-device?token=${encodeURIComponent(token)}`;
  }

  showToast(message: string) {
    window.clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastTimer = window.setTimeout(() => this.toastMessage = '', 1600);
  }

  normalizeLocation(item: any) {
    return {
      ...item,
      google_room_label: item.google_room_label || item.settings?.google_room_label || 'ห้องตรวจ',
      recorded_room_type: item.recorded_room_type || 'doctor_room',
      voice_rate: Number(item.voice_rate || 1),
      call_repeat_count: Math.min(5, Math.max(1, Number(item.call_repeat_count || 1))),
      devices: (item.devices || []).map((d: any) => this.normalizeDevice(d)),
    };
  }

  normalizeDevice(device: any) {
    return { ...device, allowed_ips_text: (device.allowed_ips || []).join(',') };
  }

  stringId(id: unknown) {
    return String(id);
  }

  sortAudio(items: any[]) {
    return [...items].sort((a, b) => String(a.label || a.key).localeCompare(String(b.label || b.key), 'en', { sensitivity: 'base' }));
  }
}
