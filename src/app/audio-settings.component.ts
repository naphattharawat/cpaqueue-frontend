import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
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

      <section class="upload-card">
        <b><i class="fa-solid fa-file-audio"></i> อัปโหลดไฟล์เสียง</b>
        <input type="file" accept="audio/*" (change)="file=$any($event.target).files?.[0]">
        <input [(ngModel)]="label" placeholder="ชื่อเสียง">
        <button class="btn" (click)="upload()">อัปโหลด</button>
      </section>

      <section class="audio-grid">
        <article *ngFor="let item of items">
          <div class="audio-icon"><i class="fa-solid fa-volume-high"></i></div>
          <div class="audio-meta">
            <strong>{{item.label}}</strong>
            <span>{{item.file}}</span>
          </div>
          <input [(ngModel)]="item.label" placeholder="ชื่อเสียง">
          <div class="audio-actions">
            <button class="btn" (click)="play(item.url)"><i class="fa-solid fa-play"></i> ทดสอบ</button>
            <button class="btn danger" (click)="remove(item)"><i class="fa-solid fa-trash"></i> ลบ</button>
          </div>
        </article>
      </section>

      <p class="empty-row" *ngIf="!items.length">ยังไม่มีไฟล์เสียงใน assets/audio</p>
    </main>
  `,
})
export class AudioSettingsComponent implements OnInit {
  appRouteUrl = appRouteUrl;
  items: any[] = [];
  file?: File;
  label = '';
  saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  saveMessage = '';

  constructor(private api: QueueService) {}

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
    this.api.uploadAudio(fd).subscribe(r => {
      this.items = this.sortAudio(r.data || []);
      this.file = undefined;
      this.label = '';
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
