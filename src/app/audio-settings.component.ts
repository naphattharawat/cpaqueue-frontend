import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
    imports: [CommonModule, FormsModule],
    template: `
    <main class="audio-settings">
      <header>
        <a [href]="appRouteUrl('/')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>ตั้งค่าไฟล์เสียง</h1>
        <div class="save-actions">
          <span [class.ok]="saveState === 'saved'">{{saveMessage}}</span>
          <button class="btn" [disabled]="saveState === 'saving'" (click)="save()">{{saveState === 'saving' ? 'กำลังบันทึก...' : 'บันทึกชื่อเสียง'}}</button>
        </div>
      </header>

      <nav class="audio-tabs" aria-label="ประเภทไฟล์เสียง">
        <button [class.active]="activeTab === 'system'" (click)="activeTab='system'">
          <i class="fa-solid fa-gears"></i>
          ไฟล์เสียงระบบ <span>{{systemCount}}</span>
        </button>
        <button [class.active]="activeTab === 'service'" (click)="activeTab='service'">
          <i class="fa-solid fa-hospital"></i>
          เสียงจุดบริการ <span>{{serviceCount}}</span>
        </button>
      </nav>

      <section class="upload-card audio-upload-row" *ngIf="activeTab === 'service'">
        <b><i class="fa-solid fa-file-audio"></i> เพิ่มเสียงจุดบริการ</b>
        <input type="file" accept="audio/*" (change)="file=$any($event.target).files?.[0]">
        <input [(ngModel)]="label" placeholder="ชื่อเสียง">
        <button class="btn" (click)="upload()">อัปโหลด</button>
      </section>

      <section class="audio-list" [class.system-tab]="activeTab === 'system'">
        <div class="audio-list-head">
          <span>ไฟล์เสียง</span>
          <span>ชื่อเสียง</span>
          <span>จัดการ</span>
        </div>
        <article *ngFor="let item of filteredItems">
          <div class="audio-file-cell">
            <div class="audio-icon"><i class="fa-solid fa-volume-high"></i></div>
            <div class="audio-meta">
              <strong>{{item.label}}</strong>
              <span>{{item.file}}</span>
              <em [class.system]="item.is_system">{{item.is_system ? 'ไฟล์เสียงระบบ' : 'เสียงจุดบริการ'}}</em>
            </div>
          </div>
          <input [(ngModel)]="item.label" placeholder="ชื่อเสียง">
          <div class="audio-actions">
            <button class="btn" (click)="play(item.url)"><i class="fa-solid fa-play"></i> ทดสอบ</button>
            <ng-container *ngIf="item.is_system; else deleteAudio">
              <input #replacementFile class="audio-replacement-input" type="file" accept="audio/*" (change)="replace(item, $any($event.target))">
              <button class="btn replace" (click)="replacementFile.click()"><i class="fa-solid fa-upload"></i> อัปโหลดทับ</button>
            </ng-container>
            <ng-template #deleteAudio>
              <button class="btn danger" (click)="remove(item)"><i class="fa-solid fa-trash"></i> ลบ</button>
            </ng-template>
          </div>
        </article>
      </section>

      <p class="empty-row" *ngIf="!filteredItems.length">ยังไม่มีไฟล์เสียงในหมวดนี้</p>
    </main>
  `
})
export class AudioSettingsComponent implements OnInit {
  appRouteUrl = appRouteUrl;
  items: any[] = [];
  file?: File;
  label = '';
  activeTab: 'system' | 'service' = 'system';
  saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  saveMessage = '';

  constructor(private api: QueueService) {}

  get filteredItems() {
    return this.items.filter(item => this.activeTab === 'system' ? item.is_system : !item.is_system);
  }

  get systemCount() {
    return this.items.filter(item => item.is_system).length;
  }

  get serviceCount() {
    return this.items.filter(item => !item.is_system).length;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.audioFiles().subscribe(r => this.items = this.sortAudio(r.data || []));
  }

  upload() {
    if (!this.file) return;
    const fd = new FormData();
    fd.append('audio_file', this.file);
    fd.append('label', this.label);
    fd.append('is_destination', 'true');
    this.api.uploadAudio(fd).subscribe(r => {
      this.items = this.sortAudio(r.data || []);
      this.file = undefined;
      this.label = '';
    });
  }

  replace(item: any, input: HTMLInputElement) {
    const replacement = input.files?.[0];
    if (!replacement) return;
    const fd = new FormData();
    fd.append('audio_file', replacement);
    fd.append('key', item.key);
    fd.append('label', item.label);
    fd.append('is_destination', 'false');
    fd.append('replace_system', 'true');
    this.api.uploadAudio(fd).subscribe({
      next: r => {
        this.items = this.sortAudio(r.data || []);
        input.value = '';
        this.saveState = 'saved';
        this.saveMessage = 'อัปโหลดไฟล์เสียงทับแล้ว';
        setTimeout(() => {
          if (this.saveMessage === 'อัปโหลดไฟล์เสียงทับแล้ว') {
            this.saveState = 'idle';
            this.saveMessage = '';
          }
        }, 2500);
      },
      error: err => {
        console.warn('Replace system audio failed', err);
        input.value = '';
        this.saveState = 'error';
        this.saveMessage = err?.error?.message || 'อัปโหลดไฟล์เสียงทับไม่สำเร็จ';
      },
    });
  }

  save() {
    this.saveState = 'saving';
    this.saveMessage = 'กำลังบันทึก...';
    this.api.updateAudioFiles(this.items).subscribe({
      next: r => {
        this.items = this.sortAudio(r.data || []);
        this.saveState = 'saved';
        this.saveMessage = 'บันทึกแล้ว';
        setTimeout(() => {
          if (this.saveState === 'saved') {
            this.saveState = 'idle';
            this.saveMessage = '';
          }
        }, 2500);
      },
      error: () => {
        this.saveState = 'error';
        this.saveMessage = 'บันทึกไม่สำเร็จ';
      },
    });
  }

  remove(item: any) {
    this.api.deleteAudioFile(item.file).subscribe(r => this.items = this.sortAudio(r.data || []));
  }

  sortAudio(items: any[]) {
    return [...items].sort((a, b) => String(a.label || a.key).localeCompare(String(b.label || b.key), 'en', { sensitivity: 'base' }));
  }

  async play(url: string) {
    try {
      await new Audio(url).play();
    } catch (err) {
      console.warn('Audio test failed', err);
    }
  }
}
