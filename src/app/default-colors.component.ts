import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';
import { displayFontFamily } from './display-color.util';

@Component({
    imports: [CommonModule, FormsModule],
    template: `
    <main class="service-settings">
      <div class="quick-toast" *ngIf="toastMessage">{{toastMessage}}</div>
      <header>
        <a [href]="appRouteUrl('/service-settings')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>ค่าสีเริ่มต้นของระบบ</h1>
        <div class="save-action">
          <button class="btn" [disabled]="saving" (click)="save()">{{saving ? 'กำลังบันทึก...' : 'บันทึกค่าเริ่มต้น'}}</button>
          <span *ngIf="saveStatus" [class.error]="saveStatus === 'บันทึกไม่สำเร็จ'">{{saveStatus}}</span>
        </div>
      </header>

      <div class="settings-detail" *ngIf="colors">
        <div class="settings-section queue-color-settings">
          <div class="section-head">
            <h2><i class="fa-solid fa-palette"></i> ธีมสีเริ่มต้นของระบบ</h2>
          </div>
          <small>สีนี้จะเป็นค่าเริ่มต้นเมื่อจุดบริการกด "คืนค่าเริ่มต้น" ระบบจะคำนวณระดับความเข้มสำหรับแต่ละส่วนของหน้าจอให้อัตโนมัติ</small>

          <label class="theme-color-field">สีธีม
            <span class="theme-color-control">
              <input type="color" [(ngModel)]="colors.queue_colors.theme" title="เลือกสีธีม">
              <b>{{colors.queue_colors.theme}}</b>
              <span class="theme-color-sample" [style.background]="colors.queue_colors.theme"></span>
            </span>
          </label>

          <label>ฟอนต์หน้าจอแสดงผล
            <select [(ngModel)]="colors.display_font_family">
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
            <select [(ngModel)]="colors.queue_font_weight">
              <option value="400">บาง</option>
              <option value="700">ปกติ</option>
              <option value="900">หนา</option>
            </select>
          </label>
          <div class="bg-color-field">
            <span>ความหนาขอบตัวหนังสือ</span>
            <div class="bg-color-row">
              <input type="range" min="0" max="4" step="0.5" [(ngModel)]="colors.queue_colors.text_stroke_width">
              <span class="bg-alpha-value">{{colors.queue_colors.text_stroke_width}}px</span>
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
          </div>

          <div class="room-color-grid">
            <div>
              <b>คิวที่กำลังเรียก</b>
              <span class="queue-color-preview preview-pulse" [style.font-weight]="colors.queue_font_weight" [style.color]="colors.queue_colors.active_text" [style.border-color]="colors.queue_colors.active_border" [style.-webkit-text-stroke]="textStrokeStyle(colors.queue_colors.active_text_stroke)" [ngStyle]="{'--queue-active-pulse1': backgroundPreview('active_pulse1'), '--queue-active-pulse2': backgroundPreview('active_pulse2')}">123</span>
              <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="colors.queue_colors.active_text"></label>
              <label class="color-field"><span>สีขอบตัวหนังสือ</span><input type="color" title="เลือกสีขอบตัวหนังสือ" [ngModel]="strokeSwatch(colors.queue_colors.active_text_stroke)" (ngModelChange)="colors.queue_colors.active_text_stroke = $event"></label>
              <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="colors.queue_colors.active_border"></label>
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
              <span class="queue-color-preview" [style.font-weight]="colors.queue_font_weight" [style.color]="colors.queue_colors.previous_text" [style.border-color]="colors.queue_colors.previous_border" [style.background]="backgroundPreview('previous_bg')" [style.-webkit-text-stroke]="textStrokeStyle(colors.queue_colors.previous_text_stroke)">123</span>
              <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="colors.queue_colors.previous_text"></label>
              <label class="color-field"><span>สีขอบตัวหนังสือ</span><input type="color" title="เลือกสีขอบตัวหนังสือ" [ngModel]="strokeSwatch(colors.queue_colors.previous_text_stroke)" (ngModelChange)="colors.queue_colors.previous_text_stroke = $event"></label>
              <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="colors.queue_colors.previous_border"></label>
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
              <span class="queue-color-preview" [style.font-weight]="colors.queue_font_weight" [style.color]="colors.queue_colors.called_text" [style.border-color]="colors.queue_colors.called_border" [style.background]="backgroundPreview('called_bg')" [style.-webkit-text-stroke]="textStrokeStyle(colors.queue_colors.called_text_stroke)">123</span>
              <label class="color-field"><span>สีตัวหนังสือ</span><input type="color" title="เลือกสีตัวหนังสือ" [(ngModel)]="colors.queue_colors.called_text"></label>
              <label class="color-field"><span>สีขอบตัวหนังสือ</span><input type="color" title="เลือกสีขอบตัวหนังสือ" [ngModel]="strokeSwatch(colors.queue_colors.called_text_stroke)" (ngModelChange)="colors.queue_colors.called_text_stroke = $event"></label>
              <label class="color-field"><span>สีกรอบ</span><input type="color" title="เลือกสีกรอบ" [(ngModel)]="colors.queue_colors.called_border"></label>
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
        </div>
      </div>
    </main>
  `
})
export class DefaultColorsComponent implements OnInit {
  appRouteUrl = appRouteUrl;
  colors: any = null;
  saving = false;
  saveStatus = '';
  private saveStatusTimer?: number;
  toastMessage = '';
  private toastTimer?: number;

  private readonly backgroundFieldDefaults: Record<QueueColorKey, { hex: string; alpha: number }> = {
    previous_bg: { hex: '#f1f5f9', alpha: 100 },
    called_bg: { hex: '#f1f5f9', alpha: 100 },
    active_pulse1: { hex: '#fef3c7', alpha: 100 },
    active_pulse2: { hex: '#fde68a', alpha: 100 },
    page_bg: { hex: '#0b5427', alpha: 100 },
  };

  constructor(private api: QueueService) {}

  ngOnInit() {
    this.api.queueColorDefaults().subscribe(r => {
      this.colors = this.normalize(r.data);
    });
  }

  normalize(value: any) {
    return {
      queue_font_weight: ['400', '700', '900'].includes(String(value?.queue_font_weight)) ? String(value.queue_font_weight) : '900',
      display_font_family: value?.display_font_family || 'kanit',
      queue_colors: {
        theme: '#4899b2',
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
        ...(value?.queue_colors || {}),
      },
    };
  }

  save() {
    if (!this.colors || this.saving) return;
    window.clearTimeout(this.saveStatusTimer);
    this.saving = true;
    this.saveStatus = 'กำลังบันทึก...';
    this.api.updateQueueColorDefaults(this.colors).subscribe({
      next: r => {
        this.colors = this.normalize(r.data);
        this.saving = false;
        this.saveStatus = 'บันทึกแล้ว';
        this.showToast('บันทึกค่าสีเริ่มต้นสำเร็จ');
        this.saveStatusTimer = window.setTimeout(() => this.saveStatus = '', 2500);
      },
      error: err => {
        console.warn('Save queue color defaults failed', err);
        this.saving = false;
        this.saveStatus = 'บันทึกไม่สำเร็จ';
      },
    });
  }

  showToast(message: string) {
    window.clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastTimer = window.setTimeout(() => this.toastMessage = '', 1600);
  }

  selectedDisplayFontFamily() {
    return displayFontFamily(this.colors?.display_font_family);
  }

  // Empty color means no outline — matches the "transparent" fallback used on the actual display.
  textStrokeStyle(color: string) {
    return color ? `${this.colors?.queue_colors?.text_stroke_width ?? 1}px ${color}` : '';
  }

  // <input type=color> can't represent "unset" — an empty value renders as black, which looks
  // like a color is actively chosen even though no outline is applied. Show a neutral gray
  // placeholder instead so the swatch doesn't contradict the (stroke-less) preview.
  strokeSwatch(color: string) {
    return color || '#e5e7eb';
  }

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
    return this.parseRgba(this.colors?.queue_colors?.[key], this.backgroundFieldDefaults[key]).hex;
  }

  backgroundAlpha(key: QueueColorKey) {
    return this.parseRgba(this.colors?.queue_colors?.[key], this.backgroundFieldDefaults[key]).alpha;
  }

  backgroundPreview(key: QueueColorKey) {
    if (this.colors?.queue_colors?.[key]) return this.colors.queue_colors[key];
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
    if (!this.colors) return;
    const fallbackHex = this.backgroundFieldDefaults[key].hex;
    const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallbackHex;
    this.colors.queue_colors[key] = this.rgbaFromHexAlpha(clean, alphaPct);
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
