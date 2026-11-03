import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
      .current-status{margin:14px 0 20px;padding:18px;border-radius:18px;background:#f95620;color:#fff;text-align:left;box-shadow:0 12px 28px #b8320a33}.current-status>span.service-type{display:inline-block;margin-bottom:8px;padding:4px 12px;border-radius:999px;background:#fff;color:#c2410c;font-weight:800;opacity:1}.current-status>span{display:block;font-size:13px;font-weight:700;opacity:.9}.current-status strong{display:block;margin-top:4px;font-size:24px;line-height:1.25}.current-status p{margin:7px 0 0;font-size:16px;font-weight:600}.current-status small{display:block;margin-top:10px;opacity:.85}
      .journey{position:relative;display:grid;gap:10px;margin:0 0 20px;padding-left:32px;text-align:left}.journey:before{content:'';position:absolute;left:13px;top:22px;bottom:22px;width:3px;background:#e2e8f0}.journey-step{position:relative;min-height:68px;padding:14px 14px 14px 16px;border-radius:14px;background:#f8fafc;color:#94a3b8}.journey-marker{position:absolute;z-index:1;left:-31px;top:20px;width:28px;height:28px;border:3px solid #cbd5e1;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:13px}.journey-step.done{color:#15803d}.journey-step.done .journey-marker{border-color:#16a34a;background:#16a34a;color:#fff}.journey-step.current{color:#9a3412;background:#fff1ec;border:1px solid #fdba9f}.journey-step.current .journey-marker{border-color:#f95620;background:#fff;color:#f95620;box-shadow:0 0 0 5px #ffded3}.journey-step strong{display:block;font-size:18px;line-height:1.25}.journey-step p{margin:5px 0 0;color:#475569;font-weight:600}.journey-step small{display:block;margin-top:5px;color:#94a3b8}.step-queues{display:grid;gap:8px;margin-top:10px}.step-queue{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px;border-radius:12px;background:#fff;border:1px solid #fed0c1}.step-queue .detail-label{margin-bottom:2px}.step-queue strong{font-size:17px}.step-queue p{margin:4px 0 0;font-size:15px}.step-queue b{white-space:nowrap;border-radius:999px;padding:5px 12px;font-size:13px;background:#fee2e2;color:#b91c1c}.step-queue b.wait{background:#dcfce7;color:#15803d}.step-queue b.done{background:#dbeafe;color:#1d4ed8}.detail-heading{margin:4px 0 10px;text-align:left;color:#9a3412;font-size:17px}
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

        <div class="queue-summary" *ngIf="result || journey">
          <span>หมายเลขคิว</span>
          <strong>{{primaryQueueNo}}</strong>
          <small>{{patientName}}</small>
        </div>

        <section class="current-status" *ngIf="journey">
          <span class="service-type" *ngIf="journey.service_type_label">{{journey.service_type_label}}</span>
          <span>สถานะปัจจุบัน</span>
          <strong>{{journey.current_label}}</strong>
          <p *ngIf="journey.current_detail">{{journey.current_detail}}</p>
          <small *ngIf="journey.updated_at">อัปเดตล่าสุด {{formatTime(journey.updated_at)}} น.</small>
        </section>

        <section class="journey" *ngIf="journey?.steps?.length">
          <article class="journey-step" *ngFor="let step of journey.steps" [ngClass]="step.status">
            <span class="journey-marker"><i class="fa-solid" [class.fa-check]="step.status==='done'" [class.fa-circle]="step.status!=='done'"></i></span>
            <strong>{{step.label}}</strong>
            <p *ngIf="step.detail">{{step.detail}}</p>
            <small *ngIf="step.updated_at">{{formatTime(step.updated_at)}} น.</small>
            <div class="step-queues" *ngIf="step.key==='queue' && hisQueues.length">
              <div class="step-queue" *ngFor="let q of hisQueues">
                <div>
                  <span class="detail-label">{{q.location_name || 'จุดบริการ'}}</span>
                  <strong>{{roomText(q)}}</strong>
                  <p>{{messageFor(q)}}</p>
                </div>
                <b [ngClass]="statusClass(q)">{{statusText(q)}}</b>
              </div>
            </div>
          </article>
        </section>

        <h2 class="detail-heading" *ngIf="bottomResults.length">รายละเอียดหมายเลขรับบริการ</h2>
        <div class="result-list" *ngIf="bottomResults.length">
          <article class="result-card detail-card" *ngFor="let result of bottomResults">
            <div class="detail-main">
              <div>
                <span class="detail-label">{{result.location_name || 'จุดบริการ'}}</span>
                <strong>{{roomText(result)}}</strong>
              </div>
              <b [ngClass]="statusClass(result)">{{statusText(result)}}</b>
            </div>
            <p>{{messageFor(result)}}</p>
          </article>
        </div>

        <p class="error" *ngIf="error">{{error}}</p>
      </section>
    </main>
  `
})
export class CheckQueueComponent implements OnInit, OnDestroy {
  query = '';
  result: any = null;
  results: any[] = [];
  error = '';
  message = '';
  scannedMode = false;
  journey: any = null;
  hisQueues: any[] = [];
  private refreshTimer?: number;

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

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  get primaryQueueNo() {
    return this.journey?.queue_no || this.result?.oqueue || this.result?.queue_no || '-';
  }

  get patientName() {
    return this.journey?.patient_name || this.result?.patient_name || '';
  }

  check() {
    const query = this.query.trim();
    if (!query) {
      this.results = [];
      this.hisQueues = [];
      this.result = null;
      this.error = 'กรุณากรอกหมายเลขคิว';
      return;
    }
    this.api.checkQueue(query).subscribe({
      next: r => {
        this.results = Array.isArray(r.queues) ? r.queues : (r.data ? [r.data] : []);
        this.result = this.results[0] || null;
        this.journey = r.journey || null;
        this.hisQueues = this.hasQueueStep(r.journey) && Array.isArray(r.his_queues) ? r.his_queues : [];
        this.error = r.status === 'success' ? '' : r.message;
        this.message = this.result ? this.messageFor(this.result) : '';
        if (r.status !== 'success' || this.journey?.current_stage === 'complete') this.stopAutoRefresh();
        else this.startAutoRefresh();
      },
      error: () => {
        if (!this.result && !this.journey) this.error = 'ไม่สามารถโหลดสถานะได้ กรุณาลองใหม่อีกครั้ง';
        this.startAutoRefresh();
      },
    });
  }

  // การ์ดคิวหน้าจุดบริการย้ายไปอยู่ใน step "รอพบแพทย์" ส่วนที่เหลือ (เช่นห้องยา) แสดงด้านล่าง
  get bottomResults() {
    return this.hisQueues.length ? this.results.filter(r => r.source === 'pharmacy_robot') : this.results;
  }

  private hasQueueStep(journey: any) {
    return !!journey?.steps?.some((step: any) => step.key === 'queue');
  }

  private startAutoRefresh() {
    if (this.refreshTimer || !this.query.trim()) return;
    this.refreshTimer = window.setInterval(() => this.check(), 20000);
  }

  private stopAutoRefresh() {
    if (!this.refreshTimer) return;
    window.clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }

  formatTime(value: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(11, 16);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  roomText(result: any) {
    const destination = String(result?.destination_label || 'ห้องตรวจ').trim();
    return result?.room_number ? `${destination} ${result.room_number}` : destination;
  }

  messageFor(result: any) {
    if (result?.source === 'pharmacy_robot') {
      if (result.service_status === 'กำลังเรียกคิว') return `กรุณาไปที่ ${result.location_name || 'ห้องยา'}`;
      return result.finance_status || 'อยู่ระหว่างดำเนินการ';
    }
    if (result?.call_status === 'D') return 'ตรวจรักษาเสร็จแล้ว';
    return result?.call_status === 'Y'
      ? (result.remaining === 0 ? 'คุณเป็นคิวถัดไป เตรียมตัวเข้ารับบริการ' : `อีก ${result.remaining} คิวถึงคุณ`)
      : result?.call_status === 'N'
        ? 'ถึงคิวของคุณแล้ว'
        : result?.call_status === 'F'
          ? 'เลยคิวของคุณแล้ว กรุณาติดต่อเจ้าหน้าที่'
          : 'อยู่ในสถานะรอผล/ไม่พบ';
  }

  statusText(result: any) {
    if (result?.source === 'pharmacy_robot') return result.service_status || 'อยู่ระหว่างดำเนินการ';
    const s = result?.call_status;
    return s === 'D' ? 'เสร็จสิ้น' : s === 'N' ? 'เรียกแล้ว' : s === 'F' ? 'เลยคิว' : s === 'W' ? 'ไม่พบ/รอผล' : 'รอเรียก';
  }

  statusClass(result: any) {
    if (result?.source === 'pharmacy_robot') {
      if (result.service_status === 'จ่ายยาเสร็จสิ้น') return 'done';
      if (result.service_status !== 'ยกเลิกรายการ') return 'wait';
      return '';
    }
    return result.call_status === 'N' || result.call_status === 'D' ? 'done' : result.call_status === 'Y' ? 'wait' : '';
  }
}
