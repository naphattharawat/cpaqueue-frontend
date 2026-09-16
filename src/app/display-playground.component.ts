import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { QueueService } from './queue.service';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';

@Component({
    imports: [CommonModule, FormsModule],
    template: `
    <main class="display-preview-page">
      <header>
        <a [href]="appRouteUrl('/service-settings')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <div>
          <h1>ทดลองหน้าจอแบบอิสระ</h1>
          <p>ไม่ผูกกับ device จริง เลือกประเภทจอ + ห้องเองได้เลย</p>
        </div>
        <span class="preview-badge"><i class="fa-solid fa-flask"></i> ข้อมูลจำลอง</span>
      </header>

      <section class="display-preview-layout">
        <aside class="display-preview-controls">
          <div class="playground-type-picker">
            <b>ประเภทจอ</b>
            <div class="playground-type-grid">
              <button type="button" *ngFor="let t of deviceTypes" [class.active]="deviceType === t.key" (click)="selectType(t.key)">{{t.label}}</button>
            </div>
          </div>

          <label>จุดบริการ
            <select [(ngModel)]="locationId" (ngModelChange)="onLocationChange()">
              <option value="">-- เลือกจุดบริการ --</option>
              <option *ngFor="let l of locations" [value]="l.opd_qs_location_id">{{l.opd_qs_location_name}}</option>
            </select>
          </label>

          <div class="playground-room-picker" *ngIf="rooms.length">
            <b>เลือกห้อง{{roomHint}} ({{selectedRoomIds.length}} เลือกแล้ว)</b>
            <div class="playground-room-grid">
              <button type="button" *ngFor="let room of rooms" class="playground-room-chip" [class.active]="isRoomSelected(room)" [disabled]="!isRoomSelected(room) && roomLimitReached" (click)="toggleRoom(room)">
                <span class="room-chip-number">ห้อง {{room.opd_qs_room_number || room.opd_qs_room_id}}</span>
                <span class="room-chip-name">{{room.opd_qs_room_name}}</span>
              </button>
            </div>
          </div>

          <label *ngIf="deviceType === 'room-list'">จำนวนคิวต่อห้อง
            <input type="number" min="1" max="12" step="1" [(ngModel)]="queueLimit" (ngModelChange)="updatePreviewUrl()">
          </label>

          <div class="playground-settings">
            <b>ตั้งค่าเหมือนหน้า device จริง</b>
            <label class="inline-check">
              <input type="checkbox" [(ngModel)]="settings.show_legacy_queue" (ngModelChange)="updatePreviewUrl()">
              แสดงคิวแบบเก่าด้วย (ตัวเล็กใต้คิวหลัก)
            </label>
            <label class="inline-check" *ngIf="deviceType === 'multi' || deviceType === 'room-list'">
              <input type="checkbox" [(ngModel)]="settings.hide_media" (ngModelChange)="updatePreviewUrl()">
              ซ่อนสื่อ/โฆษณา (ขยายตารางคิวเต็มจอ)
            </label>
            <label class="inline-check" *ngIf="deviceType !== 'multi2'">
              <input type="checkbox" [(ngModel)]="settings.show_called_list" (ngModelChange)="updatePreviewUrl()">
              แสดงรายการ "เรียกแล้วไม่พบ"
            </label>
            <label class="inline-check" *ngIf="deviceType === 'single' || deviceType === 'dual'">
              <input type="checkbox" [(ngModel)]="settings.show_called_history" (ngModelChange)="updatePreviewUrl()">
              แสดงรายการ "คิวที่เรียกไปแล้ว" (แถบล่างสุด)
            </label>
          </div>

          <div class="playground-colors">
            <label class="inline-check">
              <input type="checkbox" [(ngModel)]="useCustomColors" (ngModelChange)="updatePreviewUrl()">
              ทดลองตั้งค่าสีเอง (ไม่กระทบสีจริงของจุดบริการ)
            </label>
            <div class="playground-color-grid" *ngIf="useCustomColors">
              <label class="color-field">กำลังเรียก - ตัวหนังสือ
                <input type="color" [(ngModel)]="colors.active_text" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">กำลังเรียก - ขอบ
                <input type="color" [(ngModel)]="colors.active_border" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">กำลังเรียก - กระพริบสี 1
                <input type="color" [(ngModel)]="colors.active_pulse1" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">กำลังเรียก - กระพริบสี 2
                <input type="color" [(ngModel)]="colors.active_pulse2" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">เพิ่งเรียกไป - ตัวหนังสือ
                <input type="color" [(ngModel)]="colors.previous_text" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">เพิ่งเรียกไป - ขอบ
                <input type="color" [(ngModel)]="colors.previous_border" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">รอ/เรียกแล้ว - ตัวหนังสือ
                <input type="color" [(ngModel)]="colors.called_text" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">รอ/เรียกแล้ว - ขอบ
                <input type="color" [(ngModel)]="colors.called_border" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">ความหนาขอบตัวหนังสือ (px)
                <input type="number" min="0" max="4" step="0.5" [(ngModel)]="colors.text_stroke_width" (ngModelChange)="updatePreviewUrl()">
              </label>
              <label class="color-field">น้ำหนักตัวอักษร
                <select [(ngModel)]="colors.queue_font_weight" (ngModelChange)="updatePreviewUrl()">
                  <option value="400">ปกติ (400)</option>
                  <option value="700">หนา (700)</option>
                  <option value="900">หนามาก (900)</option>
                </select>
              </label>
            </div>
          </div>

          <label>หมายเลขรับบริการจำลอง
            <input [(ngModel)]="queueNumber" maxlength="10" inputmode="numeric" placeholder="เช่น 123">
          </label>

          <div class="preview-room-list" *ngIf="selectedRooms.length">
            <b>ทดลองเรียก</b>
            <div class="preview-room-row" *ngFor="let room of selectedRooms">
              <button type="button" (click)="simulateCall(room)" [disabled]="!frameReady || !queueNumber.trim()">
                <span><strong>ห้อง {{room.opd_qs_room_number || room.opd_qs_room_id}}</strong><small>{{room.opd_qs_room_name}}</small></span>
                <i class="fa-solid fa-bullhorn"></i>
              </button>
              <button type="button" class="preview-hold-btn" title="ทดลองเรียกไม่พบ" (click)="simulateHold(room)" [disabled]="!frameReady || !queueNumber.trim()">
                <i class="fa-solid fa-user-slash"></i>
              </button>
            </div>
          </div>

          <button class="btn preview-call-all" type="button" *ngIf="selectedRooms.length > 1" (click)="simulateAll()" [disabled]="!frameReady || !queueNumber.trim()">
            <i class="fa-solid fa-forward"></i> ทดลองเรียกต่อเนื่องทุกห้อง
          </button>
          <small class="preview-note">การทดลองไม่บันทึกประวัติและไม่ส่งผลไปยังจอจริง</small>
        </aside>

        <section class="display-preview-frame-wrap">
          <iframe #previewFrame *ngIf="previewUrl" [src]="previewUrl" (load)="frameReady=true" title="ตัวอย่างหน้าจอ"></iframe>
          <div class="display-preview-state" *ngIf="!previewUrl">
            <i class="fa-solid fa-tv"></i>
            <p>{{setupHint}}</p>
          </div>
        </section>
      </section>
    </main>
  `
})
export class DisplayPlaygroundComponent implements OnInit {
  @ViewChild('previewFrame') previewFrame?: ElementRef<HTMLIFrameElement>;

  appRouteUrl = appRouteUrl;
  deviceTypes = [
    { key: 'single', label: 'จอเดี่ยว' },
    { key: 'dual', label: 'จอคู่' },
    { key: 'multi', label: 'จอรวม' },
    { key: 'multi2', label: 'จอรวม 2' },
    { key: 'room-list', label: 'Room-list' },
    { key: 'room-grid', label: 'จอ 1-4 ห้อง' },
  ];
  deviceType = 'multi';
  locations: any[] = [];
  locationId = '';
  rooms: any[] = [];
  selectedRoomIds: string[] = [];
  queueLimit = 6;
  settings = { show_legacy_queue: false, hide_media: false, show_called_list: true, show_called_history: false };
  useCustomColors = false;
  colors: any = {
    active_text: '#7c2d12', active_border: '#f59e0b', active_pulse1: '#fef3c7', active_pulse2: '#fde68a',
    previous_text: '#7c2d12', previous_border: '#f59e0b', called_text: '#64748b', called_border: '#cbd5e1',
    text_stroke_width: 1, queue_font_weight: '900',
  };
  queueNumber = '123';
  previewUrl?: SafeResourceUrl;
  frameReady = false;

  private readonly storageKey = 'display_playground_state';

  constructor(private api: QueueService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.restoreState();
    this.api.locations().subscribe({ next: r => { this.locations = r.data || []; } });
    if (this.locationId) {
      this.api.rooms(this.locationId).subscribe({
        next: r => {
          this.rooms = r.data || [];
          const validIds = new Set(this.rooms.map(room => String(room.opd_qs_room_id)));
          this.selectedRoomIds = this.selectedRoomIds.filter(id => validIds.has(id));
          this.updatePreviewUrl();
        },
      });
    }
  }

  private restoreState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.deviceType = saved.deviceType || this.deviceType;
      this.locationId = saved.locationId || '';
      this.selectedRoomIds = Array.isArray(saved.selectedRoomIds) ? saved.selectedRoomIds.map(String) : [];
      this.queueLimit = Number(saved.queueLimit) || 6;
      this.settings = { ...this.settings, ...(saved.settings || {}) };
      this.useCustomColors = !!saved.useCustomColors;
      this.colors = { ...this.colors, ...(saved.colors || {}) };
    } catch { /* ignore invalid/blocked storage */ }
  }

  private saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        deviceType: this.deviceType,
        locationId: this.locationId,
        selectedRoomIds: this.selectedRoomIds,
        queueLimit: this.queueLimit,
        settings: this.settings,
        useCustomColors: this.useCustomColors,
        colors: this.colors,
      }));
    } catch { /* ignore invalid/blocked storage */ }
  }

  get roomHint() {
    if (this.deviceType === 'dual') return ' (เลือกให้ครบ 2 ห้อง)';
    if (this.deviceType === 'multi2' || this.deviceType === 'room-grid') return ' (สูงสุด 4 ห้อง)';
    return '';
  }

  get roomLimitReached() {
    if (this.deviceType === 'dual') return this.selectedRoomIds.length >= 2;
    if (this.deviceType === 'multi2' || this.deviceType === 'room-grid') return this.selectedRoomIds.length >= 4;
    return false;
  }

  get selectedRooms() {
    const order = new Map(this.selectedRoomIds.map((id, i) => [id, i]));
    return this.rooms.filter(r => order.has(String(r.opd_qs_room_id))).sort((a, b) => order.get(String(a.opd_qs_room_id))! - order.get(String(b.opd_qs_room_id))!);
  }

  get setupHint() {
    if (!this.locationId) return 'เลือกจุดบริการก่อน';
    if (!this.rooms.length) return 'จุดนี้ยังไม่มีห้องตรวจ';
    if (this.deviceType === 'dual' && this.selectedRoomIds.length !== 2) return 'จอคู่ต้องเลือกห้องให้ครบ 2 ห้อง';
    return 'เลือกห้องอย่างน้อย 1 ห้องเพื่อดูตัวอย่าง';
  }

  selectType(key: string) {
    this.deviceType = key;
    if (key === 'dual') this.selectedRoomIds = this.selectedRoomIds.slice(0, 2);
    if (key === 'multi2' || key === 'room-grid') this.selectedRoomIds = this.selectedRoomIds.slice(0, 4);
    this.updatePreviewUrl();
  }

  onLocationChange() {
    this.selectedRoomIds = [];
    this.rooms = [];
    this.previewUrl = undefined;
    this.saveState();
    if (!this.locationId) return;
    this.api.rooms(this.locationId).subscribe({ next: r => { this.rooms = r.data || []; } });
  }

  isRoomSelected(room: any) {
    return this.selectedRoomIds.includes(String(room.opd_qs_room_id));
  }

  toggleRoom(room: any) {
    const id = String(room.opd_qs_room_id);
    if (this.isRoomSelected(room)) {
      this.selectedRoomIds = this.selectedRoomIds.filter(r => r !== id);
    } else {
      if (this.roomLimitReached) return;
      this.selectedRoomIds = this.deviceType === 'dual' && this.selectedRoomIds.length >= 2
        ? [...this.selectedRoomIds.slice(1), id]
        : [...this.selectedRoomIds, id];
    }
    this.updatePreviewUrl();
  }

  updatePreviewUrl() {
    this.frameReady = false;
    this.saveState();
    if (!this.selectedRoomIds.length || (this.deviceType === 'dual' && this.selectedRoomIds.length !== 2)) {
      this.previewUrl = undefined;
      return;
    }
    const params = new URLSearchParams({
      sandbox: '1',
      device_type: this.deviceType,
      room_ids: this.selectedRoomIds.join(','),
      location_id: this.locationId,
      queue_limit: String(this.queueLimit || 6),
      show_legacy_queue: this.settings.show_legacy_queue ? '1' : '0',
      hide_media: this.settings.hide_media ? '1' : '0',
      show_called_list: this.settings.show_called_list ? '1' : '0',
      show_called_history: this.settings.show_called_history ? '1' : '0',
    });
    if (this.useCustomColors) params.set('queue_colors_override', JSON.stringify(this.colors));
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(appAbsoluteUrl(`/display-device?${params.toString()}`));
  }

  simulateCall(room: any, queueNumber = this.queueNumber.trim(), advance = true) {
    if (!queueNumber || !this.previewFrame?.nativeElement.contentWindow) return;
    this.previewFrame.nativeElement.contentWindow.postMessage({
      type: 'cpaqueue.preview.call',
      queueNo: queueNumber,
      roomId: String(room.opd_qs_room_id),
      roomNumber: String(room.opd_qs_room_number || room.opd_qs_room_id),
    }, location.origin);
    const numeric = Number(queueNumber);
    if (advance && Number.isFinite(numeric)) this.queueNumber = String(numeric + 1);
  }

  simulateHold(room: any) {
    const queueNumber = this.queueNumber.trim();
    if (!queueNumber || !this.previewFrame?.nativeElement.contentWindow) return;
    this.previewFrame.nativeElement.contentWindow.postMessage({
      type: 'cpaqueue.preview.hold',
      queueNo: queueNumber,
      roomId: String(room.opd_qs_room_id),
      roomNumber: String(room.opd_qs_room_number || room.opd_qs_room_id),
    }, location.origin);
  }

  simulateAll() {
    const start = this.queueNumber.trim();
    const numericStart = Number(start);
    this.selectedRooms.forEach((room, index) => {
      const queueNo = Number.isFinite(numericStart) ? String(numericStart + index) : `${start}${index + 1}`;
      window.setTimeout(() => this.simulateCall(room, queueNo, false), index * 180);
    });
    if (Number.isFinite(numericStart)) this.queueNumber = String(numericStart + this.selectedRooms.length);
  }
}
