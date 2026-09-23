import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';

@Component({
    imports: [CommonModule, FormsModule],
    styles: [`
      .check-screen{min-height:100vh;background:radial-gradient(circle at 80% 20%,#ff855d,#f95620 52%,#b8320a);display:grid;place-items:center;padding:20px;font-family:Kanit,Arial,sans-serif}
      .check-card{width:min(520px,100%);background:#fff;border-radius:24px;padding:30px;text-align:center;box-shadow:0 24px 60px #7c210833}
      .check-brand{display:flex;flex-direction:column;align-items:center;gap:5px;color:#9a3412;font-weight:700}
      .check-brand img{display:block;width:112px;height:72px;object-fit:contain}
      h1{margin:10px 0 0;font-size:28px;line-height:1.25;font-weight:700;letter-spacing:0}
      .check-form{display:flex;gap:10px;margin:22px 0}.check-form input{flex:1;height:48px;border:1px solid #fed0c1;border-radius:12px;padding:0 14px;font-size:18px}.check-form button{border:0;border-radius:12px;background:#f95620;color:#fff;padding:0 20px;font-weight:800;cursor:pointer}.check-form button:hover{background:#d94412}
      .queue-summary{background:linear-gradient(180deg,#fff1ec,#fff);border:1px solid #fed0c1;border-radius:22px;padding:18px;margin-bottom:14px;display:grid;gap:4px}.queue-summary span{color:#64748b;font-size:13px;font-weight:900}.queue-summary strong{font-size:86px;line-height:1;color:#f95620}.queue-summary small{color:#0f172a;font-size:16px;font-weight:900}
      .result-list{display:grid;gap:12px;max-height:60vh;overflow:auto;padding-right:4px}.result-card{background:#fff8f5;border:1px solid #fed0c1;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:8px;text-align:left}.detail-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.detail-label{display:block;color:#d94412;font-size:13px;font-weight:900;margin-bottom:4px}.result-card strong{font-size:20px;color:#0f172a;line-height:1.25}.result-card p{margin:8px 0 0;color:#475569;font-weight:800}.result-card b{align-self:flex-start;white-space:nowrap;border-radius:999px;padding:7px 18px;background:#fee2e2;color:#b91c1c}.result-card b.wait{background:#dcfce7;color:#15803d}.result-card b.done{background:#dbeafe;color:#1d4ed8}.error{color:#b91c1c;font-weight:700}
      @media(max-width:560px){.check-card{padding:24px 20px}.check-brand img{width:96px;height:62px}.check-brand span{font-size:14px}h1{font-size:24px}}
    `],
    template: `
    <main class="check-screen">
      <section class="check-card">
        <div class="check-brand">
          <img src="assets/images/cpa-hospital-logo.png" alt="โรงพยาบาลเจ้าพระยาอภัยภูเบศร">
          <span>โรงพยาบาลเจ้าพระยาอภัยภูเบศร</span>
        </div>
        <h1>ตรวจสอบหมายเลขรับบริการ</h1>
        <div class="check-form" *ngIf="!scannedMode">
          <input [(ngModel)]="query" (keyup.enter)="check()" placeholder="กรอกหมายเลขคิว">
          <button (click)="check()">ตรวจสอบ</button>
        </div>

        <div class="queue-summary" *ngIf="results.length">
          <span>หมายเลขคิว</span>
          <strong>{{primaryQueueNo}}</strong>
          <small>{{patientName}}</small>
        </div>

        <div class="result-list" *ngIf="results.length">
          <article class="result-card detail-card" *ngFor="let result of results">
            <div class="detail-main">
              <div>
                <span class="detail-label">{{result.location_name || 'จุดบริการ'}}</span>
                <strong>{{roomText(result)}}</strong>
              </div>
              <b [class.done]="result.call_status==='N'" [class.wait]="result.call_status==='Y'">{{statusText(result.call_status)}}</b>
            </div>
            <p>{{messageFor(result)}}</p>
          </article>
        </div>

        <p class="error" *ngIf="error">{{error}}</p>
      </section>
    </main>
  `
})
export class CheckQueueComponent implements OnInit {
  query = '';
  result: any = null;
  results: any[] = [];
  error = '';
  message = '';
  scannedMode = false;

  constructor(private api: QueueService, private route: ActivatedRoute) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.scannedMode = params.has('q');
    const q = (params.get('q') || '').trim();
    if (this.scannedMode && q) {
      this.query = q;
      this.check();
    }
  }

  get primaryQueueNo() {
    return this.result?.oqueue || this.result?.queue_no || '-';
  }

  get patientName() {
    return this.result?.patient_name || '';
  }

  check() {
    const query = this.query.trim();
    if (!query) {
      this.results = [];
      this.result = null;
      this.error = 'กรุณากรอกหมายเลขคิว';
      return;
    }
    this.api.checkQueue(query).subscribe(r => {
      this.results = Array.isArray(r.queues) ? r.queues : (r.data ? [r.data] : []);
      this.result = this.results[0] || null;
      this.error = r.status === 'success' ? '' : r.message;
      this.message = this.result ? this.messageFor(this.result) : '';
    });
  }

  roomText(result: any) {
    const destination = String(result?.destination_label || 'ห้องตรวจ').trim();
    return result?.room_number ? `${destination} ${result.room_number}` : destination;
  }

  messageFor(result: any) {
    return result?.call_status === 'Y'
      ? (result.remaining === 0 ? 'คุณเป็นคิวถัดไป เตรียมตัวเข้ารับบริการ' : `อีก ${result.remaining} คิวถึงคุณ`)
      : result?.call_status === 'N'
        ? 'ถึงคิวของคุณแล้ว'
        : result?.call_status === 'F'
          ? 'เลยคิวของคุณแล้ว กรุณาติดต่อเจ้าหน้าที่'
          : 'อยู่ในสถานะรอผล/ไม่พบ';
  }

  statusText(s: string) {
    return s === 'N' ? 'เรียกแล้ว' : s === 'F' ? 'เลยคิว' : s === 'W' ? 'ไม่พบ/รอผล' : 'รอเรียก';
  }
}
