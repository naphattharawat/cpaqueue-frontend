import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
  imports: [CommonModule, FormsModule],
  template: `
    <main class="remote-settings-page">
      <div class="quick-toast" *ngIf="toastMessage">{{toastMessage}}</div>
      <header>
        <a [href]="appRouteUrl('/')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <div><h1>ตั้งค่าระยะไกล</h1><small>ตั้งค่า Electron และตัวติดตั้งของหน้าจอแสดงผล</small></div>
        <button class="btn remote-add-button" type="button" (click)="showAdd = !showAdd"><i class="fa-solid fa-plus"></i> เพิ่มเครื่อง</button>
      </header>

      <section class="remote-pair-panel" *ngIf="showAdd">
        <div><h2>ผูกเครื่องใหม่</h2><small>เลือกหน้าจอที่ต้องการเชื่อมกับ Electron ระบบจะเปิดการควบคุมระยะไกลและออกรหัสติดตั้ง 4 หลัก</small></div>
        <select [(ngModel)]="selectedDeviceId">
          <option value="">-- เลือกจุดบริการและหน้าจอ --</option>
          <option *ngFor="let item of availableDevices" [value]="item.device.device_id">{{item.locationName}} · {{item.device.device_name}} · {{deviceTypeLabel(item.device.device_type)}}</option>
        </select>
        <button class="btn" type="button" [disabled]="!selectedDeviceId || pairing" (click)="pairDevice()"><i class="fa-solid fa-link"></i> {{pairing ? 'กำลังสร้างรหัส...' : 'ผูกและสร้างรหัส'}}</button>
      </section>

      <section class="remote-installer-panel">
        <div class="section-head">
          <div><h2><i class="fa-solid fa-box-open"></i> คลังตัวติดตั้ง</h2><small>อัปโหลดไฟล์ .exe ครั้งเดียว แล้วเลือกใช้กับแต่ละ device ด้านล่าง</small></div>
          <span class="installer-count">{{installers.length}} ไฟล์</span>
        </div>
        <div class="installer-upload">
          <label>เวอร์ชัน <input [(ngModel)]="uploadVersion" placeholder="เช่น 0.2.0"></label>
          <label>ไฟล์ตัวติดตั้ง <input type="file" accept=".exe,application/vnd.microsoft.portable-executable" (change)="selectInstaller($event)"></label>
          <button class="btn" type="button" [disabled]="uploading" (click)="uploadInstaller()"><i class="fa-solid fa-upload"></i> {{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}}</button>
        </div>
        <div class="installer-list" *ngIf="installers.length">
          <div *ngFor="let item of installers">
            <i class="fa-brands fa-windows"></i>
            <span><b>เวอร์ชัน {{item.version || '-'}}</b><small>{{item.filename}} · {{formatBytes(item.size)}} · {{formatDate(item.uploaded_at)}}</small></span>
          </div>
        </div>
        <p class="empty-row" *ngIf="!installers.length && !loading">ยังไม่มีไฟล์ตัวติดตั้ง</p>
      </section>

      <section class="remote-toolbar">
        <input [(ngModel)]="search" placeholder="ค้นหาชื่อจอหรือจุดบริการ...">
        <span>{{filteredDevices.length}} devices</span>
      </section>

      <section class="remote-device-list">
        <p class="remote-empty" *ngIf="!filteredDevices.length && !loading">ยังไม่มีเครื่องที่ผูกการควบคุมระยะไกล กด “เพิ่มเครื่อง” เพื่อเริ่มต้น</p>
        <article class="remote-device-card" *ngFor="let item of filteredDevices">
          <div class="remote-device-head">
            <div><h2>{{item.device.device_name}}</h2><small>{{item.locationName}} · {{deviceTypeLabel(item.device.device_type)}}</small></div>
            <span class="device-online" [class.online]="item.device.last_seen_at">{{item.device.last_seen_at ? 'เคยเชื่อมต่อ' : 'ยังไม่เชื่อมต่อ'}}</span>
          </div>
          <div class="remote-form">
            <label class="inline-check"><input type="checkbox" [(ngModel)]="item.device.settings.remote_settings.enabled"> เปิดใช้การควบคุมระยะไกล</label>
            <label class="inline-check"><input type="checkbox" [(ngModel)]="item.device.settings.remote_settings.fullscreen"> เปิดเต็มจอ</label>
            <label class="inline-check"><input type="checkbox" [(ngModel)]="item.device.settings.remote_settings.start_on_login"> เปิดพร้อม Windows</label>
            <label>หมายเลขจอ
              <select [(ngModel)]="item.device.settings.remote_settings.screen_index">
                <option [ngValue]="0">ใช้ค่าจาก Electron</option>
                <option *ngFor="let screen of screenOptions" [ngValue]="screen">จอ {{screen}}</option>
              </select>
              <small>ถ้าเลือกหมายเลขจอ ค่าจากส่วนกลางจะแทนค่าที่ตั้งไว้ใน Electron</small>
            </label>
            <label>ตัวติดตั้งที่ต้องการใช้
              <select [ngModel]="selectedInstallerUrl(item.device)" (ngModelChange)="chooseInstaller(item.device, $event)">
                <option value="">-- ไม่อัปเดต / ไม่เลือกไฟล์ --</option>
                <option *ngFor="let installer of installers" [value]="installer.download_url">เวอร์ชัน {{installer.version || '-'}} · {{installer.filename}}</option>
              </select>
            </label>
            <label>เวลาอัปเดต
              <select [(ngModel)]="item.device.settings.remote_settings.update_mode">
                <option value="immediate">ทันทีที่พบเวอร์ชันใหม่</option>
                <option value="on_start">เมื่อเปิดโปรแกรม</option>
                <option value="scheduled">ตามเวลาที่กำหนด</option>
              </select>
            </label>
            <label *ngIf="item.device.settings.remote_settings.update_mode === 'scheduled'">เวลาอัปเดตประจำวัน<input type="time" [(ngModel)]="item.device.settings.remote_settings.update_time"></label>
            <label class="inline-check" *ngIf="item.device.settings.remote_settings.update_mode === 'scheduled'"><input type="checkbox" [(ngModel)]="item.device.settings.remote_settings.update_once"> ทำงานครั้งเดียวสำหรับ version นี้</label>
          </div>
          <div class="remote-device-status" *ngIf="item.device.settings.runtime_status as status">
            รุ่นปัจจุบัน {{status.current_version || '-'}} · ตรวจล่าสุด {{formatDate(item.device.last_seen_at)}}
          </div>
          <div class="remote-pair-code" *ngIf="item.device.setup_code">
            <span><b>รหัสติดตั้งชั่วคราว</b><strong>{{item.device.setup_code}}</strong><small>ใช้ได้ถึง {{formatDate(item.device.setup_code_expires_at)}}</small></span>
            <button class="btn muted" type="button" (click)="copyText(item.device.setup_code)"><i class="fa-solid fa-copy"></i> คัดลอก</button>
          </div>
          <div class="remote-device-token" *ngIf="item.device.setup_token"><b>Device token</b><code>{{item.device.setup_token}}</code><button class="btn muted" type="button" (click)="copyText(item.device.setup_token)"><i class="fa-solid fa-copy"></i></button></div>
          <div class="remote-actions">
            <button class="btn danger" type="button" [disabled]="savingId === item.device.device_id" (click)="unlinkDevice(item.device)"><i class="fa-solid fa-trash"></i> ลบออก</button>
            <button class="btn muted" type="button" (click)="generateSetupCode(item.device)"><i class="fa-solid fa-key"></i> สร้างรหัสชั่วคราว</button>
            <button class="btn" [disabled]="savingId === item.device.device_id" (click)="saveDevice(item.device)"><i class="fa-solid fa-floppy-disk"></i> {{savingId === item.device.device_id ? 'กำลังบันทึก...' : 'บันทึก'}}</button>
          </div>
        </article>
      </section>
    </main>
  `,
})
export class RemoteSettingsComponent implements OnInit {
  appRouteUrl = appRouteUrl;
  locations: any[] = [];
  devices: Array<{ locationName: string; device: any }> = [];
  installers: any[] = [];
  screenOptions = [1, 2, 3];
  search = '';
  uploadVersion = '';
  uploadFile: File | null = null;
  uploading = false;
  loading = true;
  savingId: string | number | null = null;
  showAdd = false;
  selectedDeviceId = '';
  pairing = false;
  toastMessage = '';
  private toastTimer?: number;

  constructor(private api: QueueService) {}

  ngOnInit() {
    this.loadData();
  }

  get filteredDevices() {
    const term = this.search.trim().toLowerCase();
    const linked = this.devices.filter(item => item.device.settings.remote_settings.enabled);
    return !term ? linked : linked.filter(item => `${item.device.device_name} ${item.locationName}`.toLowerCase().includes(term));
  }

  get availableDevices() {
    return this.devices.filter(item => !item.device.settings.remote_settings.enabled);
  }

  loadData() {
    this.loading = true;
    this.api.locationConfigs().subscribe({
      next: r => {
        this.locations = r.data || [];
        this.devices = this.locations.flatMap(location => (location.devices || []).map((device: any) => ({
          locationName: location.display_name || location.location_name,
          device: this.normalizeDevice(device),
        })));
        this.loading = false;
      },
      error: () => { this.loading = false; this.showToast('โหลดรายการ device ไม่สำเร็จ'); },
    });
    this.loadInstallers();
  }

  loadInstallers() {
    this.api.displayUpdates().subscribe({
      next: r => this.installers = r.data || [],
      error: () => this.showToast('โหลดคลังตัวติดตั้งไม่สำเร็จ'),
    });
  }

  selectInstaller(event: Event) {
    this.uploadFile = (event.target as HTMLInputElement).files?.[0] || null;
  }

  uploadInstaller() {
    if (!this.uploadFile) return this.showToast('กรุณาเลือกไฟล์ installer .exe');
    if (!/^\d+\.\d+\.\d+/.test(this.uploadVersion.trim())) return this.showToast('กรุณาใส่ version เช่น 0.2.0');
    const body = new FormData();
    body.append('installer', this.uploadFile);
    body.append('version', this.uploadVersion.trim());
    this.uploading = true;
    this.api.uploadDisplayUpdate(body).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadFile = null;
        this.uploadVersion = '';
        this.loadInstallers();
        this.showToast('อัปโหลดตัวติดตั้งสำเร็จ');
      },
      error: err => { this.uploading = false; this.showToast(err?.error?.message || 'อัปโหลดตัวติดตั้งไม่สำเร็จ'); },
    });
  }

  chooseInstaller(device: any, url: string) {
    const selected = this.installers.find(item => item.download_url === url);
    device.settings.remote_settings.update_url = url || '';
    device.settings.remote_settings.update_version = selected?.version || '';
  }

  selectedInstallerUrl(device: any) {
    return String(device.settings?.remote_settings?.update_url || '');
  }

  pairDevice() {
    const item = this.devices.find(entry => String(entry.device.device_id) === String(this.selectedDeviceId));
    if (!item) return this.showToast('กรุณาเลือกหน้าจอ');
    item.device.settings.remote_settings.enabled = true;
    this.pairing = true;
    this.api.updateDisplayDevice(String(item.device.device_id), this.devicePayload(item.device)).subscribe({
      next: r => {
        Object.assign(item.device, this.normalizeDevice(r.data));
        this.api.createDisplaySetupCode(String(item.device.device_id)).subscribe({
          next: codeResult => {
            item.device.setup_code = codeResult.data?.code || '';
            item.device.setup_code_expires_at = codeResult.data?.expires_at || '';
            this.pairing = false;
            this.selectedDeviceId = '';
            this.showAdd = false;
            this.showToast('ผูกเครื่องและสร้างรหัสติดตั้งแล้ว');
          },
          error: () => { this.pairing = false; this.showToast('เปิด remote แล้ว แต่สร้างรหัสไม่สำเร็จ'); },
        });
      },
      error: () => { this.pairing = false; this.showToast('ผูกเครื่องไม่สำเร็จ'); },
    });
  }

  generateSetupCode(device: any) {
    this.api.createDisplaySetupCode(String(device.device_id)).subscribe({
      next: r => {
        device.setup_code = r.data?.code || '';
        device.setup_code_expires_at = r.data?.expires_at || '';
        this.showToast('สร้างรหัสติดตั้งชั่วคราวแล้ว');
      },
      error: () => this.showToast('สร้างรหัสติดตั้งไม่สำเร็จ'),
    });
  }

  unlinkDevice(device: any) {
    if (!window.confirm(`ยืนยันลบ ${device.device_name} ออกจากการตั้งค่าระยะไกล?\nหน้าจอแสดงคิวยังใช้งานได้ตามปกติ`)) return;
    device.settings.remote_settings.enabled = false;
    this.savingId = device.device_id;
    this.api.updateDisplayDevice(String(device.device_id), this.devicePayload(device)).subscribe({
      next: r => {
        Object.assign(device, this.normalizeDevice(r.data));
        this.savingId = null;
        this.showToast('ลบเครื่องออกจากการตั้งค่าระยะไกลแล้ว');
      },
      error: () => {
        device.settings.remote_settings.enabled = true;
        this.savingId = null;
        this.showToast('ลบเครื่องไม่สำเร็จ');
      },
    });
  }

  copyText(value: string) {
    navigator.clipboard.writeText(String(value || '')).then(() => this.showToast('คัดลอกแล้ว')).catch(() => this.showToast('คัดลอกไม่สำเร็จ'));
  }

  saveDevice(device: any) {
    this.savingId = device.device_id;
    this.api.updateDisplayDevice(String(device.device_id), this.devicePayload(device)).subscribe({
      next: r => {
        Object.assign(device, this.normalizeDevice(r.data));
        this.savingId = null;
        this.showToast('บันทึกการตั้งค่าระยะไกลสำเร็จ');
      },
      error: () => { this.savingId = null; this.showToast('บันทึกไม่สำเร็จ'); },
    });
  }

  devicePayload(device: any) {
    return {
      device_name: device.device_name,
      device_type: device.device_type,
      room_ids: device.room_ids || [],
      allowed_ips: device.allowed_ips || [],
      active: device.active !== false,
      settings: device.settings,
    };
  }

  normalizeDevice(device: any) {
    return {
      ...device,
      settings: {
        ...(device.settings || {}),
        remote_settings: {
          enabled: false,
          fullscreen: true,
          start_on_login: true,
          screen_index: 0,
          update_version: '',
          update_url: '',
          update_mode: 'immediate',
          update_time: '03:00',
          update_once: true,
          ...(device.settings?.remote_settings || {}),
        },
      },
    };
  }

  deviceTypeLabel(type: string) {
    return ({ single: 'จอเดี่ยว', dual: 'จอคู่', multi: 'จอรวม', multi2: 'จอรวม 2', 'room-list': 'หลายรายการ', 'room-grid': 'จอ 1-4 ห้อง' } as Record<string, string>)[type] || type;
  }

  formatBytes(value: number) {
    const size = Number(value || 0);
    return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;
  }

  formatDate(value: any) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('th-TH');
  }

  showToast(message: string) {
    this.toastMessage = message;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastMessage = '', 2500);
  }
}
