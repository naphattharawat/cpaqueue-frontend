import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { playAudioSequence } from './audio-playback.util';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';
import { displayFontFamily } from './display-color.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="service-settings">
      <div class="quick-toast" *ngIf="toastMessage">{{toastMessage}}</div>
      <header>
        <a [href]="appRouteUrl('/')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
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
            <label class="inline-check">
              <input type="checkbox" [(ngModel)]="selected.pooled_call_enabled">
              เรียกคิวแบบคิวรวม
            </label>
            <small>ถ้าเปิดใช้งาน หน้าเรียกคิวจะแสดงคิวทั้งหมดของจุดบริการ และเลือกแพทย์เป็นปลายทางตอนเรียก</small>
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
                <option value="" disabled>-- เลือกไฟล์เสียงปลายทาง --</option>
                <option *ngFor="let item of audioFiles" [value]="item.key">{{item.label}}</option>
              </select>
              <small *ngIf="audioFilesLoading">กำลังโหลดรายการไฟล์เสียง...</small>
              <small class="field-error" *ngIf="!audioFilesLoading && audioFilesError">{{audioFilesError}}</small>
            </label>

            <label *ngIf="selected.tts_provider === 'recorded'">รูปแบบการอ่านหมายเลข
              <select [(ngModel)]="selected.recorded_number_mode">
                <option value="digits">อ่านทีละหลัก เช่น 100 เป็น หนึ่ง ศูนย์ ศูนย์</option>
                <option value="number">อ่านเป็นตัวเลข เช่น 100 เป็น หนึ่งร้อย</option>
              </select>
            </label>

            <button class="btn test-voice-button" (click)="testVoice()">
              <i class="fa-solid fa-volume-high"></i> ทดสอบเสียง
            </button>
            <small *ngIf="selected.tts_provider === 'google'">ทดสอบด้วยประโยค: เชิญหมายเลข 123 {{selected.google_room_label || 'ห้องตรวจ'}} {{previewRoomNumber()}}</small>
            <small *ngIf="selected.tts_provider === 'recorded'">ทดสอบด้วยไฟล์เสียงที่เลือกและหมายเลขตัวอย่าง 123</small>
          </div>

          <div class="settings-section queue-color-settings">
            <div class="section-head">
              <h2><i class="fa-solid fa-palette"></i> สีหมายเลขรับบริการ</h2>
              <button class="btn muted" type="button" (click)="resetQueueColors()">คืนค่าเริ่มต้น</button>
            </div>
            <small>ใช้กับทุกห้องและทุกหน้าจอแสดงผลของจุดบริการนี้ คิวที่กำลังเรียกจะกระพริบด้วยสีที่ตั้งไว้</small>
            <label>ฟอนต์หน้าจอแสดงผล
              <select [(ngModel)]="selected.display_font_family">
                <option value="kanit">Kanit</option>
                <option value="anuphan">Anuphan</option>
                <option value="ibm-plex-sans-thai">IBM Plex Sans Thai</option>
                <option value="noto-sans-thai">Noto Sans Thai</option>
                <option value="prompt">Prompt</option>
                <option value="sarabun">Sarabun</option>
              </select>
            </label>
            <div class="display-font-preview" [style.font-family]="selectedDisplayFontFamily()">
              <b>หน้าจอแสดงหมายเลขรับบริการ</b>
              <span>ห้องตรวจ 12 หมายเลข 1234</span>
            </div>
            <label>ความหนาของตัวเลขคิว
              <select [(ngModel)]="selected.queue_font_weight">
                <option value="400">บาง</option>
                <option value="700">ปกติ</option>
                <option value="900">หนา</option>
              </select>
            </label>
            <div class="room-color-grid">
              <div>
                <b>คิวที่กำลังเรียก</b>
                <span class="queue-color-preview preview-pulse" [style.font-weight]="selected.queue_font_weight" [style.color]="selected.queue_colors.active_text" [style.border-color]="selected.queue_colors.active_border">123</span>
                <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="selected.queue_colors.active_text"></label>
                <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="selected.queue_colors.active_border"></label>
              </div>
              <div>
                <b>คิวก่อนหน้า</b>
                <span class="queue-color-preview" [style.font-weight]="selected.queue_font_weight" [style.color]="selected.queue_colors.previous_text" [style.border-color]="selected.queue_colors.previous_border">123</span>
                <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="selected.queue_colors.previous_text"></label>
                <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="selected.queue_colors.previous_border"></label>
              </div>
              <div>
                <b>คิวที่เรียกไปแล้ว</b>
                <span class="queue-color-preview" [style.font-weight]="selected.queue_font_weight" [style.color]="selected.queue_colors.called_text" [style.border-color]="selected.queue_colors.called_border">123</span>
                <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="selected.queue_colors.called_text"></label>
                <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="selected.queue_colors.called_border"></label>
              </div>
            </div>
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
                <option value="single">จอเดี่ยว (แสดงทีละคิว)</option>
                <option value="room-list">แสดงคิวต่อห้องหลายรายการ</option>
              </select>
              <label *ngIf="draftDevice.device_type === 'room-list'">จำนวนคิวต่อห้อง
                <input type="number" min="1" max="12" step="1" [(ngModel)]="draftDevice.settings.queue_limit" placeholder="จำนวนคิว">
              </label>
              <label>ห้องของ device นี้
                <select multiple [(ngModel)]="draftDevice.room_ids">
                  <option *ngFor="let r of rooms" [value]="stringId(r.opd_qs_room_id)">#{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}</option>
                </select>
                <small *ngIf="draftDevice.device_type === 'single'">เลือกได้หลายห้อง จอจะแสดงทีละคิวตามลำดับการเรียก</small>
              </label>
              <button class="btn" (click)="createDevice()">สร้าง token</button>
            </article>

            <article class="device-card" *ngFor="let d of selected.devices">
              <div class="device-row">
                <input [(ngModel)]="d.device_name">
                <select [(ngModel)]="d.device_type">
                  <option value="multi">จอรวม</option>
                  <option value="single">จอเดี่ยว (แสดงทีละคิว)</option>
                  <option value="room-list">แสดงคิวต่อห้องหลายรายการ</option>
                </select>
                <label class="inline-check"><input type="checkbox" [(ngModel)]="d.active"> active</label>
              </div>
              <label *ngIf="d.device_type === 'room-list'">จำนวนคิวต่อห้อง
                <input type="number" min="1" max="12" step="1" [(ngModel)]="d.settings.queue_limit" placeholder="จำนวนคิว">
              </label>
              <label>ห้องของ device นี้
                <select multiple [(ngModel)]="d.room_ids">
                  <option *ngFor="let r of rooms" [value]="stringId(r.opd_qs_room_id)">#{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}</option>
                </select>
                <small *ngIf="d.device_type === 'single'">เลือกได้หลายห้อง จอจะแสดงทีละคิวตามลำดับการเรียก</small>
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
  appRouteUrl = appRouteUrl;
  locations: any[] = [];
  rooms: any[] = [];
  audioFiles: any[] = [];
  audioFilesLoading = false;
  audioFilesError = '';
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
    this.loadAudioFiles();
  }

  loadAudioFiles() {
    this.audioFilesLoading = true;
    this.audioFilesError = '';
    this.api.audioFiles(true).subscribe({
      next: r => {
        this.audioFiles = this.normalizeAudioFiles(r.data || []);
        this.audioFilesLoading = false;
        if (!this.audioFiles.length) this.loadDefaultVoiceTypes();
      },
      error: err => {
        console.warn('Load audio files failed', err);
        this.audioFilesLoading = false;
        this.loadDefaultVoiceTypes();
      },
    });
  }

  loadDefaultVoiceTypes() {
    this.api.voiceTypes().subscribe({
      next: r => {
        this.audioFiles = this.normalizeAudioFiles((r.data || []).map((key: string) => ({ key, label: key })));
        this.audioFilesError = this.audioFiles.length ? '' : 'ไม่พบไฟล์เสียงสำหรับเลือก';
      },
      error: err => {
        console.warn('Load voice types failed', err);
        this.audioFilesError = 'โหลดรายการไฟล์เสียงไม่สำเร็จ';
      },
    });
  }

  normalizeAudioFiles(items: any[]) {
    const unique = new Map<string, any>();
    for (const item of items) {
      const file = String(item?.file || '');
      const key = String(item?.key || file.replace(/\.[^.]+$/, '')).trim();
      if (key) unique.set(key, { ...item, key, label: String(item?.label || key) });
    }
    return this.sortAudio([...unique.values()]);
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
      settings: { queue_limit: 6 },
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
        number_mode: this.selected.recorded_number_mode || 'digits',
      });
      if (this.selected.tts_provider === 'google') params.set('room_label', this.selected.google_room_label || 'ห้องตรวจ');
      if (this.selected.tts_provider === 'recorded') params.set('room_type', this.selected.recorded_room_type || 'doctor_room');
      const response = await fetch(this.api.ttsUrl(`/call?${params.toString()}`));
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        await playAudioSequence((data.files || []).map((file: string) => this.api.audioAssetUrl(file)), Number(data.voice_rate || this.selected.voice_rate || 1));
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
    const roomIds = Array.isArray(device.room_ids) ? device.room_ids : [];
    return {
      ...device,
      room_ids: roomIds,
      settings: { ...(device.settings || {}), queue_limit: Math.min(12, Math.max(1, Number(device.settings?.queue_limit || 6))) },
      allowed_ips: String(device.allowed_ips_text || '').split(',').map(ip => ip.trim()).filter(Boolean),
    };
  }

  displayDeviceUrl(token: string) {
    return appAbsoluteUrl(`/display-device?token=${encodeURIComponent(token)}`);
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
      recorded_number_mode: item.recorded_number_mode === 'number' ? 'number' : 'digits',
      queue_colors: { ...this.defaultQueueColors(), ...(item.queue_colors || item.settings?.queue_colors || {}) },
      queue_font_weight: ['400', '700', '900'].includes(String(item.queue_font_weight || item.settings?.queue_font_weight)) ? String(item.queue_font_weight || item.settings?.queue_font_weight) : '900',
      display_font_family: item.display_font_family || item.settings?.display_font_family || 'kanit',
      voice_rate: Number(item.voice_rate || 1),
      call_repeat_count: Math.min(5, Math.max(1, Number(item.call_repeat_count || 1))),
      pooled_call_enabled: !!item.pooled_call_enabled,
      devices: (item.devices || []).map((d: any) => this.normalizeDevice(d)),
    };
  }

  normalizeDevice(device: any) {
    return { ...device, settings: { queue_limit: 6, ...(device.settings || {}) }, allowed_ips_text: (device.allowed_ips || []).join(',') };
  }

  stringId(id: unknown) {
    return String(id);
  }

  sortAudio(items: any[]) {
    return [...items].sort((a, b) => String(a.label || a.key).localeCompare(String(b.label || b.key), 'en', { sensitivity: 'base' }));
  }

  resetQueueColors() {
    if (!this.selected) return;
    this.selected.queue_colors = this.defaultQueueColors();
  }

  selectedDisplayFontFamily() {
    return displayFontFamily(this.selected?.display_font_family);
  }

  defaultQueueColors() {
    return {
      active_text: '#7c2d12',
      active_border: '#f59e0b',
      previous_text: '#7c2d12',
      previous_border: '#f59e0b',
      called_text: '#64748b',
      called_border: '#cbd5e1',
    };
  }
}
