import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="media-manager">
      <div class="quick-toast" *ngIf="toastMessage">{{toastMessage}}</div>
      <header>
        <a [href]="appRouteUrl('/')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>จัดการภาพสไลด์</h1>
        <button class="btn" (click)="saveMediaInfo()">บันทึกข้อมูลรูป</button>
      </header>

      <section class="upload-card">
        <b><i class="fa-solid fa-cloud-arrow-up"></i> อัปโหลดรูปเข้าคลังกลาง</b>
        <input type="file" accept="image/*" (change)="file=$any($event.target).files?.[0]">
        <input [(ngModel)]="label" placeholder="ชื่อรูป">
        <input type="number" [(ngModel)]="duration" min="3" placeholder="วินาที" title="วินาทีต่อสไลด์">
        <button class="btn" (click)="upload()">อัปโหลด</button>
      </section>

      <section class="upload-card">
        <b><i class="fa-brands fa-youtube"></i> เพิ่ม YouTube Video / Live</b>
        <input [(ngModel)]="youtubeUrl" placeholder="วางลิงก์ YouTube หรือ Live">
        <input [(ngModel)]="youtubeLabel" placeholder="ชื่อสื่อ">
        <input type="number" [(ngModel)]="youtubeDuration" min="0" placeholder="วินาที" title="ใส่ 0 เพื่อแสดงไม่จำกัดเวลา">
        <button class="btn" (click)="addYoutube()">เพิ่มลิงก์</button>
      </section>

      <section class="media-summary">
        <div>
          <b>{{items.length}}</b>
          <span>รูปในคลังกลาง</span>
        </div>
        <div>
          <b>{{locations.length}}</b>
          <span>จุดบริการทั้งหมด</span>
        </div>
        <div>
          <b>{{assignedImageCount}}</b>
          <span>รูปที่ถูกเลือกใช้งาน</span>
        </div>
      </section>

      <section class="media-grid">
        <article *ngFor="let m of items" [class.selected]="m.location_count">
          <img *ngIf="m.type !== 'youtube'" [src]="api.mediaUrl(m.file)">
          <div class="youtube-preview" *ngIf="m.type === 'youtube'">
            <img *ngIf="m.video_id" [src]="youtubeThumbnail(m)">
            <i *ngIf="!m.video_id" class="fa-brands fa-youtube"></i>
            <span>{{m.source_url?.includes('/live') ? 'LIVE' : 'YouTube'}}</span>
          </div>
          <div class="media-card-head">
            <strong [title]="m.label || m.file">{{m.label || m.file}}</strong>
            <span>{{m.location_count || 0}} จุดบริการ</span>
          </div>
          <input [(ngModel)]="m.label" placeholder="ชื่อรูป">
          <input type="number" [(ngModel)]="m.duration" min="0" placeholder="วินาที" title="ใส่ 0 เพื่อแสดงไม่จำกัดเวลา">
          <button class="assign" (click)="openAssignment(m)">
            <i class="fa-solid fa-list-check"></i> จัดจุดบริการ
          </button>
          <button (click)="toggleEnabled(m)">{{m.enabled ? 'ปิดใช้งานรูปนี้' : 'เปิดใช้งานรูปนี้'}}</button>
          <button class="danger" (click)="remove(m)">ลบจากคลัง</button>
        </article>
      </section>

      <p class="empty-row" *ngIf="!items.length">ยังไม่มีรูปในคลังกลาง ให้อัปโหลดรูปก่อน</p>

      <div class="settings-backdrop" *ngIf="editing" (click)="closeAssignment()">
        <section class="settings-card media-assignment" (click)="$event.stopPropagation()">
          <button class="settings-close" (click)="closeAssignment()"><i class="fa-solid fa-xmark"></i></button>
          <h2><i class="fa-solid fa-image"></i> เลือกจุดบริการที่จะแสดงรูปนี้</h2>

          <div class="assignment-preview">
            <img *ngIf="editing.type !== 'youtube'" [src]="api.mediaUrl(editing.file)">
            <div class="youtube-preview mini" *ngIf="editing.type === 'youtube'">
              <img *ngIf="editing.video_id" [src]="youtubeThumbnail(editing)">
              <i *ngIf="!editing.video_id" class="fa-brands fa-youtube"></i>
            </div>
            <div>
              <strong>{{editing.label || editing.file}}</strong>
              <span>เลือก {{pickedLocations.size}} / {{locations.length}} จุดบริการ</span>
            </div>
          </div>

          <div class="assignment-toolbar">
            <input [(ngModel)]="locationSearch" placeholder="ค้นหาจุดบริการ...">
            <button class="btn" (click)="selectAllLocations()">เลือกทั้งหมด</button>
            <button class="btn muted" (click)="clearLocations()">ล้างทั้งหมด</button>
          </div>

          <div class="assignment-list">
            <label *ngFor="let l of filteredLocations">
              <input type="checkbox" [checked]="pickedLocations.has(stringId(l.opd_qs_location_id))" (change)="toggleLocation(l.opd_qs_location_id, $any($event.target).checked)">
              <span>{{l.opd_qs_location_name}}</span>
            </label>
          </div>

          <button class="btn assignment-save" (click)="saveAssignment()">บันทึกจุดบริการของรูปนี้</button>
        </section>
      </div>
    </main>
  `,
})
export class MediaManagerComponent implements OnInit {
  appRouteUrl = appRouteUrl;
  locations: any[] = [];
  items: any[] = [];
  file?: File;
  label = '';
  duration = 10;
  youtubeUrl = '';
  youtubeLabel = '';
  youtubeDuration = 30;
  editing: any = null;
  pickedLocations = new Set<string>();
  locationSearch = '';
  toastMessage = '';
  private toastTimer?: number;

  constructor(public api: QueueService) {}

  ngOnInit() {
    this.api.locations().subscribe(r => this.locations = r.data || []);
    this.load();
  }

  get assignedImageCount() {
    return this.items.filter(item => Number(item.location_count || 0) > 0).length;
  }

  get filteredLocations() {
    const q = this.locationSearch.trim().toLowerCase();
    if (!q) return this.locations;
    return this.locations.filter(l => String(l.opd_qs_location_name || '').toLowerCase().includes(q));
  }

  stringId(id: unknown) {
    return String(id);
  }

  load() {
    this.api.media('', true).subscribe(r => this.items = r.data || []);
  }

  upload() {
    if (!this.file) return;
    const fd = new FormData();
    fd.append('media_file', this.file);
    fd.append('label', this.label);
    fd.append('duration', String(this.duration));
    fd.append('enabled', 'true');
    this.api.uploadMedia(fd).subscribe(() => {
      this.file = undefined;
      this.label = '';
      this.load();
    });
  }

  addYoutube() {
    if (!this.youtubeUrl.trim()) return;
    this.api.addYoutubeMedia({
      url: this.youtubeUrl.trim(),
      label: this.youtubeLabel.trim(),
      duration: this.youtubeDuration,
      enabled: true,
    }).subscribe(() => {
      this.youtubeUrl = '';
      this.youtubeLabel = '';
      this.youtubeDuration = 30;
      this.load();
    });
  }

  youtubeThumbnail(item: any) {
    return `https://img.youtube.com/vi/${encodeURIComponent(item.video_id)}/hqdefault.jpg`;
  }

  saveMediaInfo() {
    this.api.updateMedia(this.items).subscribe(() => {
      this.showToast('บันทึกข้อมูลสไลด์แล้ว');
      this.load();
    });
  }

  openAssignment(item: any) {
    this.editing = item;
    this.locationSearch = '';
    this.pickedLocations = new Set((item.location_ids || []).map(String));
  }

  closeAssignment() {
    this.editing = null;
  }

  selectAllLocations() {
    this.pickedLocations = new Set(this.locations.map(l => String(l.opd_qs_location_id)));
  }

  clearLocations() {
    this.pickedLocations.clear();
  }

  toggleLocation(id: unknown, checked: boolean) {
    checked ? this.pickedLocations.add(String(id)) : this.pickedLocations.delete(String(id));
  }

  saveAssignment() {
    if (!this.editing) return;
    this.api.saveMediaLocations(this.editing.file, [...this.pickedLocations]).subscribe(r => {
      this.items = r.data || [];
      this.editing = null;
    });
  }

  toggleEnabled(m: any) {
    this.api.toggleMedia(m.file).subscribe(() => this.load());
  }

  remove(m: any) {
    this.api.deleteMedia(m.file).subscribe(() => this.load());
  }

  showToast(message: string) {
    window.clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastTimer = window.setTimeout(() => this.toastMessage = '', 1800);
  }
}
