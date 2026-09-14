import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { playAudioSequence } from './audio-playback.util';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';
import { displayFontFamily } from './display-color.util';

@Component({
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
              <div class="device-actions">
                <a class="btn muted" [href]="appRouteUrl('/default-colors')"><i class="fa-solid fa-sliders"></i> ตั้งค่าสีเริ่มต้นของระบบ</a>
                <button class="btn muted" type="button" (click)="resetQueueColors()">คืนค่าเริ่มต้น</button>
              </div>
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
            <div class="bg-color-field">
              <span>ความหนาขอบตัวหนังสือ</span>
              <div class="bg-color-row">
                <input type="range" min="0" max="4" step="0.5" [(ngModel)]="selected.queue_colors.text_stroke_width">
                <span class="bg-alpha-value">{{selected.queue_colors.text_stroke_width}}px</span>
              </div>
            </div>
            <div class="bg-color-field page-bg-field">
              <b>สีพื้นหลังทั้งหน้าจอ</b>
              <div class="bg-color-row">
                <input type="color" title="เลือกสีพื้นหลังหน้าจอ" [ngModel]="backgroundHex('page_bg')" (ngModelChange)="setBackgroundHex('page_bg', $event)">
                <input type="range" min="0" max="100" step="1" [ngModel]="backgroundAlpha('page_bg')" (ngModelChange)="setBackgroundAlpha('page_bg', $event)">
                <span class="bg-alpha-value">{{backgroundAlpha('page_bg')}}%</span>
                <span class="bg-preview"><span [style.background]="backgroundPreview('page_bg')"></span></span>
              </div>
              <small>ค่าเริ่มต้นคือ gradient ที่หน้าจอใช้อยู่ปัจจุบัน ปรับแล้วมีผลกับพื้นหลังทั้งหน้าของทุกหน้าจอแสดงผลของจุดบริการนี้</small>
            </div>
            <div class="room-color-grid">
              <div>
                <b>คิวที่กำลังเรียก</b>
                <span class="queue-color-preview preview-pulse" [style.font-weight]="selected.queue_font_weight" [style.color]="selected.queue_colors.active_text" [style.border-color]="selected.queue_colors.active_border" [style.-webkit-text-stroke]="textStrokeStyle(selected.queue_colors.active_text_stroke)" [ngStyle]="{'--queue-active-pulse1': backgroundPreview('active_pulse1'), '--queue-active-pulse2': backgroundPreview('active_pulse2')}">123</span>
                <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="selected.queue_colors.active_text"></label>
                <label class="color-field"><span>สีขอบตัวหนังสือ</span><input type="color" title="เลือกสีขอบตัวหนังสือ" [ngModel]="strokeSwatch(selected.queue_colors.active_text_stroke)" (ngModelChange)="selected.queue_colors.active_text_stroke = $event"></label>
                <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="selected.queue_colors.active_border"></label>
                <div class="bg-color-field">
                  <span>สีพื้นหลังตอนกระพริบ 1</span>
                  <div class="bg-color-row">
                    <input type="color" title="เลือกสีกระพริบที่ 1" [ngModel]="backgroundHex('active_pulse1')" (ngModelChange)="setBackgroundHex('active_pulse1', $event)">
                    <input type="range" min="0" max="100" step="1" [ngModel]="backgroundAlpha('active_pulse1')" (ngModelChange)="setBackgroundAlpha('active_pulse1', $event)">
                    <span class="bg-alpha-value">{{backgroundAlpha('active_pulse1')}}%</span>
                  </div>
                </div>
                <div class="bg-color-field">
                  <span>สีพื้นหลังตอนกระพริบ 2</span>
                  <div class="bg-color-row">
                    <input type="color" title="เลือกสีกระพริบที่ 2" [ngModel]="backgroundHex('active_pulse2')" (ngModelChange)="setBackgroundHex('active_pulse2', $event)">
                    <input type="range" min="0" max="100" step="1" [ngModel]="backgroundAlpha('active_pulse2')" (ngModelChange)="setBackgroundAlpha('active_pulse2', $event)">
                    <span class="bg-alpha-value">{{backgroundAlpha('active_pulse2')}}%</span>
                  </div>
                </div>
                <small>กล่องนี้จะสลับพื้นหลังระหว่าง 2 สีนี้ตอนกระพริบ</small>
              </div>
              <div>
                <b>คิวก่อนหน้า</b>
                <span class="queue-color-preview" [style.font-weight]="selected.queue_font_weight" [style.color]="selected.queue_colors.previous_text" [style.border-color]="selected.queue_colors.previous_border" [style.background]="backgroundPreview('previous_bg')" [style.-webkit-text-stroke]="textStrokeStyle(selected.queue_colors.previous_text_stroke)">123</span>
                <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="selected.queue_colors.previous_text"></label>
                <label class="color-field"><span>สีขอบตัวหนังสือ</span><input type="color" title="เลือกสีขอบตัวหนังสือ" [ngModel]="strokeSwatch(selected.queue_colors.previous_text_stroke)" (ngModelChange)="selected.queue_colors.previous_text_stroke = $event"></label>
                <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="selected.queue_colors.previous_border"></label>
                <div class="bg-color-field">
                  <span>สีพื้นหลังกล่อง</span>
                  <div class="bg-color-row">
                    <input type="color" title="เลือกสีพื้นหลัง" [ngModel]="backgroundHex('previous_bg')" (ngModelChange)="setBackgroundHex('previous_bg', $event)">
                    <input type="range" min="0" max="100" step="1" [ngModel]="backgroundAlpha('previous_bg')" (ngModelChange)="setBackgroundAlpha('previous_bg', $event)">
                    <span class="bg-alpha-value">{{backgroundAlpha('previous_bg')}}%</span>
                  </div>
                </div>
              </div>
              <div>
                <b>คิวที่เรียกไปแล้ว</b>
                <span class="queue-color-preview" [style.font-weight]="selected.queue_font_weight" [style.color]="selected.queue_colors.called_text" [style.border-color]="selected.queue_colors.called_border" [style.background]="backgroundPreview('called_bg')" [style.-webkit-text-stroke]="textStrokeStyle(selected.queue_colors.called_text_stroke)">123</span>
                <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="selected.queue_colors.called_text"></label>
                <label class="color-field"><span>สีขอบตัวหนังสือ</span><input type="color" title="เลือกสีขอบตัวหนังสือ" [ngModel]="strokeSwatch(selected.queue_colors.called_text_stroke)" (ngModelChange)="selected.queue_colors.called_text_stroke = $event"></label>
                <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="selected.queue_colors.called_border"></label>
                <div class="bg-color-field">
                  <span>สีพื้นหลังกล่อง</span>
                  <div class="bg-color-row">
                    <input type="color" title="เลือกสีพื้นหลัง" [ngModel]="backgroundHex('called_bg')" (ngModelChange)="setBackgroundHex('called_bg', $event)">
                    <input type="range" min="0" max="100" step="1" [ngModel]="backgroundAlpha('called_bg')" (ngModelChange)="setBackgroundAlpha('called_bg', $event)">
                    <span class="bg-alpha-value">{{backgroundAlpha('called_bg')}}%</span>
                  </div>
                </div>
              </div>
            </div>
            <small>สีพื้นหลังกล่องและสีกระพริบเริ่มต้นคือสีที่หน้าจอใช้อยู่ในปัจจุบัน ปรับแถบด้านบนเพื่อเปลี่ยนความโปร่งใส หรือเลือกสีใหม่ได้เลย (สีกระพริบมีผลเฉพาะคิวที่กำลังเรียก)</small>
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
              <label class="inline-check">
                <input type="checkbox" [(ngModel)]="draftDevice.settings.show_legacy_queue">
                แสดงคิวแบบเก่าด้วย (ตัวเล็กใต้คิวหลัก)
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
              <label class="inline-check">
                <input type="checkbox" [(ngModel)]="d.settings.show_legacy_queue">
                แสดงคิวแบบเก่าด้วย (ตัวเล็กใต้คิวหลัก)
              </label>
              <label>ห้องของ device นี้
                <select multiple [(ngModel)]="d.room_ids">
                  <option *ngFor="let r of rooms" [value]="stringId(r.opd_qs_room_id)">#{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}</option>
                </select>
                <small *ngIf="d.device_type === 'single'">เลือกได้หลายห้อง จอจะแสดงทีละคิวตามลำดับการเรียก</small>
              </label>
              <div class="device-actions">
                <button class="btn" (click)="saveDevice(d)">บันทึก device</button>
                <a class="btn preview" [href]="previewDeviceUrl(d.device_id)" target="_blank"><i class="fa-solid fa-eye"></i> ดูตัวอย่าง</a>
                <button class="btn muted" (click)="rotateToken(d)">Rotate token</button>
                <button class="btn danger" (click)="deleteDevice(d)">ลบ</button>
              </div>
              <div class="token-box" *ngIf="d.setup_token; else unavailableToken">
                <b>Device token</b>
                <div class="token-value"><code>{{d.setup_token}}</code><button class="btn muted" type="button" (click)="copyText(d.setup_token, 'คัดลอก token แล้ว')"><i class="fa-solid fa-copy"></i> คัดลอก</button></div>
                <div class="token-value"><code>{{displayDeviceUrl(d.setup_token)}}</code><button class="btn muted" type="button" (click)="copyText(displayDeviceUrl(d.setup_token), 'คัดลอก URL แล้ว')"><i class="fa-solid fa-link"></i> คัดลอก URL</button></div>
              </div>
              <ng-template #unavailableToken><small class="token-unavailable">Token เดิมไม่สามารถแสดงย้อนหลังได้ กรุณา Rotate token หนึ่งครั้ง</small></ng-template>
              <small>last seen: {{d.last_seen_at || '-'}}</small>
            </article>
          </div>
        </section>
      </section>
    </main>
  `
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
  systemDefaultColors: any = null;

  constructor(private api: QueueService) {}

  ngOnInit() {
    this.api.queueColorDefaults().subscribe({
      next: r => {
        this.systemDefaultColors = r.data?.queue_colors || null;
        this.loadLocations();
      },
      error: err => {
        console.warn('Load system default colors failed', err);
        this.loadLocations();
      },
    });
    this.loadAudioFiles();
  }

  loadLocations() {
    this.api.locationConfigs().subscribe(r => {
      this.locations = (r.data || []).map((item: any) => this.normalizeLocation(item));
      const savedLocationId = localStorage.getItem('service_settings_location_id') || '';
      const savedLocation = this.locations.find(location => String(location.location_id) === savedLocationId);
      if (savedLocation || this.locations[0]) this.selectLocation(savedLocation || this.locations[0]);
    });
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
    localStorage.setItem('service_settings_location_id', String(location.location_id));
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
    const destinationAudio = this.audioFiles.find(item => item.key === this.selected.recorded_room_type);
    const payload = { ...this.selected, recorded_room_label: destinationAudio?.label || this.selected.recorded_room_label || '' };
    this.api.updateLocationConfig(this.selected.location_id, payload).subscribe({
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
      settings: { queue_limit: 6, show_legacy_queue: false },
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
    const confirmed = window.confirm('ยืนยันการ Rotate token? เครื่องที่ใช้ token เดิมอยู่จะหยุดทำงานทันที และต้องเปิดด้วย URL ใหม่อีกครั้ง');
    if (!confirmed) return;
    this.api.rotateDisplayDeviceToken(String(device.device_id)).subscribe({
      next: r => {
        Object.assign(device, this.normalizeDevice(r.data));
        this.showToast('สร้าง token ใหม่แล้ว กรุณานำ URL ใหม่ไปเปิดที่เครื่องแสดงผล');
      },
      error: err => {
        console.warn('Rotate device token failed', err);
        this.showToast('Rotate token ไม่สำเร็จ');
      },
    });
  }

  async copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.showToast(successMessage);
    } catch {
      this.showToast('คัดลอกไม่สำเร็จ');
    }
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

  previewDeviceUrl(deviceId: string | number) {
    return appAbsoluteUrl(`/display-preview?device_id=${encodeURIComponent(String(deviceId))}`);
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
      recorded_room_label: item.recorded_room_label || item.settings?.recorded_room_label || '',
      recorded_room_type: item.recorded_room_type || 'doctor_room',
      recorded_number_mode: item.recorded_number_mode === 'number' ? 'number' : 'digits',
      queue_colors: { ...this.defaultQueueColors(), ...(this.systemDefaultColors || {}), ...(item.queue_colors || item.settings?.queue_colors || {}) },
      queue_font_weight: ['400', '700', '900'].includes(String(item.queue_font_weight || item.settings?.queue_font_weight)) ? String(item.queue_font_weight || item.settings?.queue_font_weight) : '900',
      display_font_family: item.display_font_family || item.settings?.display_font_family || 'kanit',
      voice_rate: Number(item.voice_rate || 1),
      call_repeat_count: Math.min(5, Math.max(1, Number(item.call_repeat_count || 1))),
      pooled_call_enabled: !!item.pooled_call_enabled,
      devices: (item.devices || []).map((d: any) => this.normalizeDevice(d)),
    };
  }

  normalizeDevice(device: any) {
    return { ...device, settings: { queue_limit: 6, show_legacy_queue: false, ...(device.settings || {}) }, allowed_ips_text: (device.allowed_ips || []).join(',') };
  }

  stringId(id: unknown) {
    return String(id);
  }

  sortAudio(items: any[]) {
    return [...items].sort((a, b) => String(a.label || a.key).localeCompare(String(b.label || b.key), 'en', { sensitivity: 'base' }));
  }

  resetQueueColors() {
    if (!this.selected) return;
    this.selected.queue_colors = { ...this.defaultQueueColors(), ...(this.systemDefaultColors || {}) };
  }

  selectedDisplayFontFamily() {
    return displayFontFamily(this.selected?.display_font_family);
  }

  defaultQueueColors() {
    return {
      active_text: '#7c2d12',
      active_border: '#f59e0b',
      active_text_stroke: '',
      active_pulse1: '',
      active_pulse2: '',
      previous_text: '#7c2d12',
      previous_border: '#f59e0b',
      previous_text_stroke: '',
      previous_bg: '',
      called_text: '#64748b',
      called_border: '#cbd5e1',
      called_text_stroke: '',
      called_bg: '',
      page_bg: '',
      text_stroke_width: 1,
    };
  }

  // Empty color means no outline — matches the "transparent" fallback used on the actual display.
  textStrokeStyle(color: string) {
    return color ? `${this.selected?.queue_colors?.text_stroke_width ?? 1}px ${color}` : '';
  }

  // <input type=color> can't represent "unset" — an empty value renders as black, which looks
  // like a color is actively chosen even though no outline is applied. Show a neutral gray
  // placeholder instead so the swatch doesn't contradict the (stroke-less) preview.
  strokeSwatch(color: string) {
    return color || '#e5e7eb';
  }

  // Each field is stored as an rgba() string once the admin picks one; an empty value means
  // "not customized yet" — the box (or pulse glow, or page background) keeps its current
  // default, and the picker below just previews that current color so the admin has a
  // sensible starting point.
  private readonly backgroundFieldDefaults: Record<QueueColorKey, { hex: string; alpha: number }> = {
    previous_bg: { hex: '#f1f5f9', alpha: 100 },
    called_bg: { hex: '#f1f5f9', alpha: 100 },
    active_pulse1: { hex: '#fef3c7', alpha: 100 },
    active_pulse2: { hex: '#fde68a', alpha: 100 },
    page_bg: { hex: '#0b5427', alpha: 100 },
  };

  parseRgba(value: string, fallback: { hex: string; alpha: number }): { hex: string; alpha: number } {
    const str = String(value || '').trim();
    const m = str.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (!m) return fallback;
    const toHex = (n: string) => Math.min(255, Math.max(0, Number(n))).toString(16).padStart(2, '0');
    const hex = `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    const alpha = m[4] !== undefined ? Math.round(Number(m[4]) * 100) : 100;
    return { hex, alpha: Number.isFinite(alpha) ? Math.min(100, Math.max(0, alpha)) : 100 };
  }

  backgroundHex(key: QueueColorKey) {
    return this.parseRgba(this.selected?.queue_colors?.[key], this.backgroundFieldDefaults[key]).hex;
  }

  backgroundAlpha(key: QueueColorKey) {
    return this.parseRgba(this.selected?.queue_colors?.[key], this.backgroundFieldDefaults[key]).alpha;
  }

  backgroundPreview(key: QueueColorKey) {
    if (this.selected?.queue_colors?.[key]) return this.selected.queue_colors[key];
    const { hex, alpha } = this.backgroundFieldDefaults[key];
    return this.rgbaFromHexAlpha(hex, alpha);
  }

  setBackgroundHex(key: QueueColorKey, hex: string) {
    this.setBackgroundRgba(key, hex, this.backgroundAlpha(key));
  }

  setBackgroundAlpha(key: QueueColorKey, alpha: number) {
    this.setBackgroundRgba(key, this.backgroundHex(key), alpha);
  }

  setBackgroundRgba(key: QueueColorKey, hex: string, alphaPct: number) {
    if (!this.selected) return;
    const fallbackHex = this.backgroundFieldDefaults[key].hex;
    const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallbackHex;
    this.selected.queue_colors[key] = this.rgbaFromHexAlpha(clean, alphaPct);
  }

  rgbaFromHexAlpha(hex: string, alphaPct: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = Math.min(100, Math.max(0, Number(alphaPct))) / 100;
    return `rgba(${r},${g},${b},${a})`;
  }
}

type QueueColorKey = 'previous_bg' | 'called_bg' | 'active_pulse1' | 'active_pulse2' | 'page_bg';
