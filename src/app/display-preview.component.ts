import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { appAbsoluteUrl, appRouteUrl } from './app-url.util';

@Component({
    imports: [CommonModule, FormsModule],
    template: `
    <main class="display-preview-page">
      <header>
        <a [href]="appRouteUrl('/service-settings')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <div>
          <h1>ทดลองหน้าจอ Device</h1>
          <p>{{device?.device_name || 'กำลังโหลด...'}}</p>
        </div>
        <span class="preview-badge"><i class="fa-solid fa-flask"></i> ข้อมูลจำลอง</span>
      </header>

      <section class="display-preview-layout" *ngIf="device && !error; else state">
        <aside class="display-preview-controls">
          <div class="preview-summary">
            <b>{{deviceTypeLabel}}</b>
            <span>{{rooms.length}} ห้องตรวจ</span>
          </div>

          <label>หมายเลขรับบริการจำลอง
            <input [(ngModel)]="queueNumber" maxlength="10" inputmode="numeric" placeholder="เช่น 123">
          </label>

          <div class="preview-room-list">
            <b>เลือกห้องที่ต้องการทดลองเรียก</b>
            <button *ngFor="let room of rooms" type="button" (click)="simulateCall(room)" [disabled]="!frameReady || !queueNumber.trim()">
              <span><strong>ห้อง {{room.opd_qs_room_number || room.opd_qs_room_id}}</strong><small>{{room.opd_qs_room_name}}</small></span>
              <i class="fa-solid fa-bullhorn"></i>
            </button>
          </div>

          <button class="btn preview-call-all" type="button" *ngIf="rooms.length > 1" (click)="simulateAll()" [disabled]="!frameReady || !queueNumber.trim()">
            <i class="fa-solid fa-forward"></i> ทดลองเรียกต่อเนื่องทุกห้อง
          </button>
          <small class="preview-note">การทดลองไม่บันทึกประวัติและไม่ส่งผลไปยังจอจริง</small>
        </aside>

        <section class="display-preview-frame-wrap">
          <iframe #previewFrame [src]="previewUrl" (load)="frameReady=true" title="ตัวอย่างหน้าจอ Device"></iframe>
        </section>
      </section>

      <ng-template #state>
        <section class="display-preview-state">
          <i class="fa-solid" [class.fa-spinner]="!error" [class.fa-spin]="!error" [class.fa-triangle-exclamation]="error"></i>
          <p>{{error || 'กำลังโหลด Device...'}}</p>
        </section>
      </ng-template>
    </main>
  `
})
export class DisplayPreviewComponent implements OnInit {
  @ViewChild('previewFrame') previewFrame?: ElementRef<HTMLIFrameElement>;

  appRouteUrl = appRouteUrl;
  deviceId = '';
  device: any = null;
  rooms: any[] = [];
  queueNumber = '123';
  previewUrl?: SafeResourceUrl;
  frameReady = false;
  error = '';

  constructor(private route: ActivatedRoute, private api: QueueService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.deviceId = this.route.snapshot.queryParamMap.get('device_id') || '';
    if (!this.deviceId) {
      this.error = 'ไม่พบ Device ที่ต้องการทดลอง';
      return;
    }
    this.api.previewDisplayDevice(this.deviceId).subscribe({
      next: r => {
        this.device = r.data;
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          appAbsoluteUrl(`/display-device?preview_id=${encodeURIComponent(this.deviceId)}&demo=1`),
        );
        this.api.rooms(String(this.device.location_id)).subscribe({
          next: roomResponse => {
            const allowed = new Set((this.device.room_ids || []).map(String));
            this.rooms = (roomResponse.data || []).filter((room: any) => allowed.has(String(room.opd_qs_room_id)));
          },
          error: () => this.error = 'โหลดรายการห้องตรวจไม่สำเร็จ',
        });
      },
      error: () => this.error = 'ไม่พบ Device หรือไม่มีสิทธิ์ดูตัวอย่าง',
    });
  }

  get deviceTypeLabel() {
    if (this.device?.device_type === 'single') return 'จอเดี่ยว แสดงทีละคิว';
    if (this.device?.device_type === 'room-list') return 'หลายคิวต่อห้อง';
    return 'จอรวม';
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

  simulateAll() {
    const start = this.queueNumber.trim();
    const numericStart = Number(start);
    this.rooms.forEach((room, index) => {
      const queueNo = Number.isFinite(numericStart) ? String(numericStart + index) : `${start}${index + 1}`;
      window.setTimeout(() => this.simulateCall(room, queueNo, false), index * 180);
    });
    if (Number.isFinite(numericStart)) this.queueNumber = String(numericStart + this.rooms.length);
  }
}
