import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <a href="/" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
      <div><b>Doctor Queue</b><small>CALLER</small></div>
      <span class="pill"><i class="fa-regular fa-clock"></i>{{ clock }}</span>
    </header>

    <section class="filters">
      <label>จุดบริการ
        <select [(ngModel)]="locationId" (change)="locationChanged()">
          <option value="">-- เลือกจุดบริการ --</option>
          <option *ngFor="let l of locations" [value]="l.opd_qs_location_id">{{l.opd_qs_location_name}}</option>
        </select>
      </label>

      <label class="doctor-filter">แพทย์
        <div class="combo" [class.open]="doctorOpen">
          <button class="combo-trigger" type="button" (click)="doctorOpen=!doctorOpen">
            <span>{{doctorSummary}}</span>
            <i class="fa-solid" [class.fa-chevron-up]="doctorOpen" [class.fa-chevron-down]="!doctorOpen"></i>
          </button>
          <div class="combo-panel" *ngIf="doctorOpen" (click)="$event.stopPropagation()">
            <div class="combo-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input [(ngModel)]="doctorQuery" placeholder="ค้นหาชื่อหรือรหัส..." />
            </div>
            <label class="combo-row" *ngFor="let d of filteredDoctors()">
              <input type="checkbox" [checked]="selectedDoctorCodes.includes(d.code)" (change)="toggleDoctor(d.code, $any($event.target).checked)">
              <b>{{d.name}}</b>
              <small>{{d.room_number ? 'ห้อง ' + d.room_number : d.room_name}}</small>
            </label>
            <div class="combo-footer">
              <span>เลือก {{selectedDoctorCodes.length}} คน</span>
              <div class="combo-footer-actions">
                <button type="button" (click)="selectAllDoctors()">เลือกทั้งหมด</button>
                <button type="button" (click)="clearDoctors()">ล้าง</button>
              </div>
            </div>
          </div>
        </div>
      </label>

      <button class="btn" (click)="loadQueues()"><i class="fa-solid fa-rotate"></i> F5</button>
      <a class="btn display" [href]="displayLink" target="_blank"><i class="fa-solid fa-tv"></i> Display</a>
    </section>

    <main class="workspace">
      <aside class="panel">
        <ng-container *ngIf="selected; else empty">
          <div class="big-q">{{selected.oqueue || selected.queue_slot_number}}</div>
          <div class="status">{{statusText(selected.call_status)}}</div>
          <p><b>ชื่อ</b> {{selected.patient_name}}</p>
          <p><b>HN</b> {{selected.hn}}</p>
          <p><b>ห้อง</b> {{selected.room_name || '-'}}</p>
          <p><b>แพทย์</b> {{selected.doctor_name || '-'}}</p>

          <ng-container *ngIf="selectedTab(selected) === 'waiting'">
            <button class="wide call" (click)="callQueue(selected)">เรียกคิว <span>F1</span></button>
            <button class="wide hold" (click)="cancelQueue(selected)">ไม่พบ</button>
          </ng-container>
          <ng-container *ngIf="selectedTab(selected) === 'called'">
            <button class="wide call" (click)="callQueue(selected)">เรียกซ้ำ <span>F1</span></button>
            <button class="wide warning" (click)="holdQueue(selected)">เรียกไม่พบ <span>F3</span></button>
            <button class="wide hold" (click)="cancelQueue(selected)">ยกเลิกเรียก</button>
          </ng-container>
          <ng-container *ngIf="selectedTab(selected) === 'hold'">
            <button class="wide call" (click)="callQueue(selected)">เรียกคิว <span>F1</span></button>
          </ng-container>
          <button class="wide next" (click)="callNext()">คิวถัดไป <span>F2</span></button>
        </ng-container>
        <ng-template #empty><div class="empty"><i class="fa-solid fa-heart-pulse"></i><p>ยังไม่ได้เลือกคิว</p></div></ng-template>
      </aside>

      <section class="panel list">
        <div class="tabs">
          <button [class.active]="tab==='waiting'" (click)="tab='waiting'">รอเรียก {{counts.waiting}}</button>
          <button [class.active]="tab==='called'" (click)="tab='called'">เรียกแล้ว {{counts.called}}</button>
          <button [class.active]="tab==='hold'" (click)="tab='hold'">ไม่พบ / รอผล Lab {{counts.hold}}</button>
        </div>

        <article class="queue-card" *ngFor="let q of filteredQueues()" (click)="selected=q">
          <div class="q-num">{{q.oqueue || q.queue_slot_number}}<small *ngIf="q.oqueue">({{q.queue_slot_number}})</small></div>
          <div class="q-info">
            <b>{{q.patient_name}}</b>
            <span>{{q.start_time?.slice(0,5) || '--:--'}} น. · HN {{q.hn}} · ห้อง {{q.room_number || q.opd_qs_room_id}} · {{q.doctor_name || '-'}}</span>
          </div>
          <div class="actions">
            <ng-container *ngIf="tab === 'waiting'">
              <button class="btn-call" (click)="callQueue(q); $event.stopPropagation()">เรียกคิว</button>
              <button class="btn-hold" (click)="cancelQueue(q); $event.stopPropagation()">ไม่พบ</button>
            </ng-container>
            <ng-container *ngIf="tab === 'called'">
              <button class="btn-call" (click)="callQueue(q); $event.stopPropagation()">เรียกซ้ำ</button>
              <button class="btn-warning" (click)="holdQueue(q); $event.stopPropagation()">เรียกไม่พบ</button>
              <button class="btn-hold" (click)="cancelQueue(q); $event.stopPropagation()">ยกเลิกเรียก</button>
            </ng-container>
            <ng-container *ngIf="tab === 'hold'">
              <button class="btn-call" (click)="callQueue(q); $event.stopPropagation()">เรียกคิว</button>
            </ng-container>
          </div>
        </article>
        <div class="empty-row" *ngIf="filteredQueues().length===0">ไม่มีข้อมูลคิว</div>
      </section>
    </main>
  `,
})
export class CallerComponent implements OnInit {
  clock = '';
  locations: any[] = [];
  doctors: any[] = [];
  queues: any[] = [];
  selected: any = null;
  locationId = localStorage.getItem('caller_location_id') || '';
  selectedDoctorCodes: string[] = JSON.parse(localStorage.getItem('caller_doctor_codes') || '[]');
  tab: 'waiting' | 'called' | 'hold' = 'waiting';
  displayLink = '/display';
  doctorOpen = false;
  doctorQuery = '';
  private loadQueuesWatchdog?: number;

  constructor(private api: QueueService) {}

  ngOnInit() {
    setInterval(() => this.clock = new Date().toTimeString().slice(0, 8), 1000);
    this.clock = new Date().toTimeString().slice(0, 8);
    this.api.locations().subscribe(r => this.locations = r.data);
    if (this.locationId) this.locationChanged(false);
    this.api.events$.subscribe(e => { if (e.type === 'queue.changed') this.loadQueues(); });
    this.api.connect(['queue:all']);
    this.resetLoadQueuesWatchdog();
  }

  get doctorSummary() {
    return this.selectedDoctorCodes.length ? `เลือก ${this.selectedDoctorCodes.length} คน` : '-- เลือกแพทย์ --';
  }

  get counts() {
    return {
      waiting: this.queues.filter(q => !['N', 'W'].includes(q.call_status)).length,
      called: this.queues.filter(q => q.call_status === 'N').length,
      hold: this.queues.filter(q => q.call_status === 'W').length,
    };
  }

  filteredDoctors() {
    const q = this.doctorQuery.trim().toLowerCase();
    return this.doctors.filter(d => !q || String(d.name).toLowerCase().includes(q) || String(d.code).toLowerCase().includes(q));
  }

  toggleDoctor(code: string, checked: boolean) {
    this.selectedDoctorCodes = checked ? [...new Set([...this.selectedDoctorCodes, code])] : this.selectedDoctorCodes.filter(c => c !== code);
    this.doctorChanged();
  }

  clearDoctors() {
    this.selectedDoctorCodes = [];
    this.doctorChanged();
  }

  selectAllDoctors() {
    const visibleCodes = this.filteredDoctors().map(d => d.code);
    this.selectedDoctorCodes = [...new Set([...this.selectedDoctorCodes, ...visibleCodes])];
    this.doctorChanged();
  }

  locationChanged(clear = true) {
    localStorage.setItem('caller_location_id', this.locationId);
    if (clear) this.selectedDoctorCodes = [];
    this.api.doctors(this.locationId).subscribe(r => this.doctors = r.data);
    this.loadQueues();
  }

  doctorChanged() {
    localStorage.setItem('caller_doctor_codes', JSON.stringify(this.selectedDoctorCodes));
    this.updateDisplayLink();
    this.loadQueues();
  }

  loadQueues() {
    this.resetLoadQueuesWatchdog();
    if (!this.locationId) return;
    this.api.queues(this.locationId, this.selectedDoctorCodes.join(',')).subscribe(r => {
      this.queues = r.data;
      this.updateDisplayLink();
    });
  }

  resetLoadQueuesWatchdog() {
    if (this.loadQueuesWatchdog) window.clearTimeout(this.loadQueuesWatchdog);
    this.loadQueuesWatchdog = window.setTimeout(() => this.loadQueues(), 30000);
  }

  filteredQueues() {
    const filtered = this.queues.filter(q => this.tab === 'waiting' ? !['N', 'W'].includes(q.call_status) : this.tab === 'called' ? q.call_status === 'N' : q.call_status === 'W');
    if (this.tab === 'waiting') return filtered;
    return [...filtered].sort((a, b) => this.callTimeMs(b) - this.callTimeMs(a));
  }

  callTimeMs(q: any) {
    return q?.call_datetime ? new Date(q.call_datetime).getTime() || 0 : 0;
  }

  statusText(s: string) {
    return s === 'N' ? 'เรียกแล้ว' : s === 'W' ? 'ไม่พบ' : 'รอเรียก';
  }

  selectedTab(q: any): 'waiting' | 'called' | 'hold' {
    return q?.call_status === 'N' ? 'called' : q?.call_status === 'W' ? 'hold' : 'waiting';
  }

  callQueue(q: any) {
    this.api.call({ slot_id: q.opd_qs_slot_id, room_id: q.opd_qs_room_id, queue_no: q.queue_slot_number }).subscribe(() => this.loadQueues());
  }

  holdQueue(q: any) {
    this.api.hold({ slot_id: q.opd_qs_slot_id, room_id: q.opd_qs_room_id, location_id: this.locationId }).subscribe(() => this.loadQueues());
  }

  cancelQueue(q: any) {
    this.api.cancel({ slot_id: q.opd_qs_slot_id, room_id: q.opd_qs_room_id, location_id: this.locationId }).subscribe(() => {
      this.selected = null;
      this.loadQueues();
    });
  }

  callNext() {
    const next = this.queues.find(q => !['N', 'W'].includes(q.call_status));
    if (next) {
      this.selected = next;
      this.callQueue(next);
    }
  }

  updateDisplayLink() {
    const doc = this.selectedDoctorCodes.join(',');
    const rooms = [...new Set(this.queues.map(q => q.opd_qs_room_id).filter(Boolean))];
    this.displayLink = rooms.length > 1
      ? `/display-multi?location_id=${this.locationId}&room_ids=${rooms.join(',')}`
      : `/display?location_id=${this.locationId}${rooms[0] ? `&room_id=${rooms[0]}` : ''}${doc ? `&doctor_code=${doc}` : ''}`;
  }

  @HostListener('document:keydown', ['$event'])
  hotkey(e: KeyboardEvent) {
    if (!this.selected) return;
    if (e.key === 'F1') this.callQueue(this.selected);
    if (e.key === 'F2') this.callNext();
    if (e.key === 'F3' && this.selectedTab(this.selected) === 'called') this.holdQueue(this.selected);
  }

  @HostListener('document:click', ['$event'])
  clickOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.combo')) this.doctorOpen = false;
  }
}
