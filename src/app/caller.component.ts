import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
    imports: [CommonModule, FormsModule],
    template: `
    <header class="topbar">
      <a [href]="appRouteUrl('/')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
      <div><b>Doctor Queue</b><small>CALLER</small></div>
      <span class="pill"><i class="fa-regular fa-clock"></i>{{ clock }}</span>
      <button class="caller-logout" type="button" title="ออกจากระบบ" (click)="logout()">
        <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
      </button>
    </header>

    <section class="filters">
      <label>จุดบริการ
        <select [(ngModel)]="locationId" (change)="locationChanged()">
          <option value="">-- เลือกจุดบริการ --</option>
          <option *ngFor="let l of locations" [value]="l.opd_qs_location_id">{{l.opd_qs_location_name}}</option>
        </select>
      </label>

      <label class="doctor-filter">{{pooledCallEnabled ? 'แพทย์ปลายทาง' : 'แพทย์'}}
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
              <input [type]="pooledCallEnabled ? 'radio' : 'checkbox'" name="caller_doctor" [checked]="selectedDoctorCodes.includes(d.code)" (change)="toggleDoctor(d.code, $any($event.target).checked)">
              <b>{{d.name}}</b>
              <small>{{d.room_number ? 'ห้อง ' + d.room_number : d.room_name}}</small>
            </label>
            <div class="combo-footer">
              <span>{{pooledCallEnabled ? 'เลือกแพทย์ปลายทาง' : 'เลือก ' + selectedDoctorCount + ' คน'}}</span>
              <div class="combo-footer-actions">
                <button type="button" *ngIf="!pooledCallEnabled" (click)="selectAllDoctors()">เลือกทั้งหมด</button>
                <button type="button" (click)="clearDoctors()">ล้าง</button>
              </div>
            </div>
          </div>
        </div>
      </label>

      <button class="btn" (click)="loadQueues()"><i class="fa-solid fa-rotate"></i> F5</button>
      <label>ค้นหาคิว
        <input class="caller-queue-search" type="search" [(ngModel)]="queueQuery" placeholder="หมายเลขคิว" (keydown.enter)="searchQueue(); $event.preventDefault()" [disabled]="!locationId">
      </label>
      <a *ngIf="isAdminUser" class="btn display" [href]="displayLink" target="_blank"><i class="fa-solid fa-tv"></i> Display</a>
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
          <div class="pooled-doctor-actions" *ngIf="pooledCallEnabled">
            <b>เรียกเข้าห้องแพทย์</b>
            <button type="button" *ngFor="let d of doctors" [disabled]="!doctorRoomId(d)" (click)="callQueueForDoctor(selected, d)">
              {{d.name}} <span>{{d.room_number ? '#' + d.room_number : d.room_name}}</span>
            </button>
          </div>

          <ng-container *ngIf="selectedTab(selected) === 'waiting'">
            <button class="wide call" (click)="callQueue(selected)">เรียกคิว <span>Alt+1</span></button>
            <button class="wide warning" (click)="holdQueue(selected)">ไม่พบ <span>Alt+3</span></button>
            <button class="wide hold" (click)="pharmacyQueue(selected)">เติมยา/ไปรฯ <span>Alt+4</span></button>
          </ng-container>
          <ng-container *ngIf="selectedTab(selected) === 'called'">
            <button class="wide call" (click)="callQueue(selected)">เรียกซ้ำ <span>Alt+1</span></button>
            <button class="wide warning" (click)="holdQueue(selected)">เรียกไม่พบ <span>Alt+3</span></button>
            <button class="wide hold" (click)="cancelQueue(selected)">ยกเลิกเรียก</button>
          </ng-container>
          <ng-container *ngIf="selectedTab(selected) === 'hold'">
            <button class="wide call" (click)="callQueue(selected)">เรียกคิว <span>Alt+1</span></button>
          </ng-container>
          <ng-container *ngIf="selectedTab(selected) === 'pharmacy'">
            <button class="wide call" (click)="callQueue(selected)">เรียกคิว <span>Alt+1</span></button>
          </ng-container>
          <button class="wide next" (click)="callNext()">คิวถัดไป <span>Alt+2</span></button>
        </ng-container>
        <ng-template #empty><div class="empty"><i class="fa-solid fa-heart-pulse"></i><p>ยังไม่ได้เลือกคิว</p></div></ng-template>
      </aside>

      <section class="panel list">
        <div class="tabs">
          <button [class.active]="tab==='waiting'" (click)="tab='waiting'">รอเรียก {{counts.waiting}}</button>
          <button [class.active]="tab==='called'" (click)="tab='called'">เรียกแล้ว {{counts.called}}</button>
          <button [class.active]="tab==='hold'" (click)="tab='hold'">ไม่พบ / รอผล Lab {{counts.hold}}</button>
          <button [class.active]="tab==='pharmacy'" (click)="tab='pharmacy'">เติมยา/ไปรษณีย์ {{counts.pharmacy}}</button>
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
              <button class="btn-hold" (click)="holdQueue(q); $event.stopPropagation()">ไม่พบ</button>
              <button class="btn-hold" (click)="pharmacyQueue(q); $event.stopPropagation()">เติมยา/ไปรฯ</button>
            </ng-container>
            <ng-container *ngIf="tab === 'called'">
              <button class="btn-call" (click)="callQueue(q); $event.stopPropagation()">เรียกซ้ำ</button>
              <button class="btn-warning" (click)="holdQueue(q); $event.stopPropagation()">เรียกไม่พบ</button>
              <button class="btn-hold" (click)="cancelQueue(q); $event.stopPropagation()">ยกเลิกเรียก</button>
            </ng-container>
            <ng-container *ngIf="tab === 'hold'">
              <button class="btn-call" (click)="callQueue(q); $event.stopPropagation()">เรียกคิว</button>
            </ng-container>
            <ng-container *ngIf="tab === 'pharmacy'">
              <button class="btn-call" (click)="callQueue(q); $event.stopPropagation()">เรียกคิว</button>
            </ng-container>
          </div>
        </article>
        <div class="empty-row" *ngIf="filteredQueues().length===0">ไม่มีข้อมูลคิว</div>
      </section>
    </main>
    <div class="caller-search-backdrop" *ngIf="queueSearchOpen" (click)="closeQueueSearch()">
      <section class="caller-search-dialog" role="dialog" aria-modal="true" aria-labelledby="queue-search-title" (click)="$event.stopPropagation()">
        <header><h2 id="queue-search-title">หมายเลข {{searchedQueueNumber}}</h2><button type="button" class="icon-btn" title="ปิด" (click)="closeQueueSearch()"><i class="fa-solid fa-xmark"></i></button></header>
        <p *ngIf="!queueSearchResults.length">ไม่พบคิวในรายการของจุดบริการและแพทย์ที่เลือก</p>
        <article class="caller-search-result" *ngFor="let q of queueSearchResults">
          <strong class="caller-search-number">{{q.oqueue || q.queue_slot_number}}</strong>
          <b>{{statusText(q.call_status)}}</b>
          <p>{{q.patient_name}} · ห้อง {{q.room_number || q.opd_qs_room_id}} · {{q.doctor_name || '-'}}</p>
          <div class="actions">
            <button type="button" class="btn-call" (click)="selected=q; callQueue(q)">{{selectedTab(q) === 'called' ? 'เรียกซ้ำ' : 'เรียกคิว'}}</button>
            <button type="button" class="btn-warning" *ngIf="selectedTab(q) === 'waiting' || selectedTab(q) === 'called'" (click)="selected=q; holdQueue(q)">{{selectedTab(q) === 'called' ? 'เรียกไม่พบ' : 'ไม่พบ'}}</button>
            <button type="button" class="btn-hold" *ngIf="selectedTab(q) === 'waiting'" (click)="selected=q; pharmacyQueue(q)">เติมยา/ไปรฯ</button>
            <button type="button" class="btn-hold" *ngIf="selectedTab(q) === 'called'" (click)="selected=q; cancelQueue(q)">ยกเลิกเรียก</button>
          </div>
          <div class="pooled-doctor-actions" *ngIf="pooledCallEnabled">
            <b>เรียกเข้าห้องแพทย์</b>
            <button type="button" *ngFor="let d of doctors" [disabled]="!doctorRoomId(d)" (click)="selected=q; callQueueForDoctor(q, d)">{{d.name}} <span>{{d.room_number ? '#' + d.room_number : d.room_name}}</span></button>
          </div>
        </article>
      </section>
    </div>
  `
})
export class CallerComponent implements OnInit {
  clock = '';
  locations: any[] = [];
  locationConfigs: any[] = [];
  doctors: any[] = [];
  queues: any[] = [];
  selected: any = null;
  locationId = localStorage.getItem('caller_location_id') || '';
  selectedDoctorCodes: string[] = JSON.parse(localStorage.getItem('caller_doctor_codes') || '[]');
  tab: 'waiting' | 'called' | 'hold' | 'pharmacy' = 'waiting';
  displayLink = appRouteUrl('/display');
  doctorOpen = false;
  doctorQuery = '';
  queueQuery = '';
  searchedQueueNumber = '';
  queueSearchOpen = false;

  get queueSearchResults() {
    return this.queues.filter(q => [q.oqueue, q.queue_slot_number].some(value =>
      value != null && String(value).trim().toLowerCase() === this.searchedQueueNumber.toLowerCase()));
  }

  searchQueue() {
    const number = this.queueQuery.trim();
    if (!this.locationId || !number) return;
    this.searchedQueueNumber = number;
    this.queueSearchOpen = true;
    this.doctorOpen = false;
  }

  closeQueueSearch() {
    this.queueSearchOpen = false;
  }
  pooledCallEnabled = false;
  isAdminUser = false;
  private loadQueuesWatchdog?: number;
  private loadQueuesGeneration = 0;

  constructor(private api: QueueService, private auth: AuthService, private router: Router) {}

  appRouteUrl = appRouteUrl;

  ngOnInit() {
    this.auth.loadUser().then(user => this.isAdminUser = this.auth.isAdmin(user));
    setInterval(() => this.clock = new Date().toTimeString().slice(0, 8), 1000);
    this.clock = new Date().toTimeString().slice(0, 8);
    this.api.locations().subscribe(r => this.locations = r.data);
    this.api.locationConfigs().subscribe(r => {
      this.locationConfigs = r.data || [];
      this.applyLocationConfig();
    });
    if (this.locationId) this.locationChanged(false);
    this.api.events$.subscribe(e => {
      if (e.type !== 'queue.changed') return;
      const slotId = String(e.payload?.slotId ?? '');
      if (e.payload?.action === 'cancel' && slotId) {
        this.queues = this.queues.filter(q => String(q.opd_qs_slot_id) !== slotId);
        if (this.selected && String(this.selected.opd_qs_slot_id) === slotId) this.selected = null;
        this.updateDisplayLink();
      }
      this.loadQueues();
      window.setTimeout(() => this.loadQueues(), 300);
    });
    this.api.connect(['queue:all']);
    this.resetLoadQueuesWatchdog();
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  get doctorSummary() {
    if (this.pooledCallEnabled) {
      const doctor = this.selectedDestinationDoctor();
      return doctor ? `${doctor.name}${doctor.room_number ? ' ห้อง ' + doctor.room_number : ''}` : '-- เลือกแพทย์ปลายทาง --';
    }
    return this.selectedDoctorCount ? `เลือก ${this.selectedDoctorCount} คน` : '-- เลือกแพทย์ --';
  }

  get selectedDoctorCount() {
    return this.validSelectedDoctorCodes().length;
  }

  get counts() {
    return {
      waiting: this.queues.filter(q => !['N', 'W', 'P'].includes(q.call_status)).length,
      called: this.queues.filter(q => q.call_status === 'N').length,
      hold: this.queues.filter(q => q.call_status === 'W').length,
      pharmacy: this.queues.filter(q => q.call_status === 'P').length,
    };
  }

  filteredDoctors() {
    const q = this.doctorQuery.trim().toLowerCase();
    return this.doctors.filter(d => !q || String(d.name).toLowerCase().includes(q) || String(d.code).toLowerCase().includes(q));
  }

  toggleDoctor(code: string, checked: boolean) {
    this.selectedDoctorCodes = this.pooledCallEnabled
      ? (checked ? [code] : [])
      : checked ? [...new Set([...this.selectedDoctorCodes, code])] : this.selectedDoctorCodes.filter(c => c !== code);
    if (this.pooledCallEnabled) this.doctorOpen = false;
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
    this.closeQueueSearch();
    localStorage.setItem('caller_location_id', this.locationId);
    if (clear) this.selectedDoctorCodes = [];
    this.applyLocationConfig();
    this.api.doctors(this.locationId).subscribe(r => {
      this.doctors = r.data;
      this.normalizeSelectedDoctors();
      if (this.pooledCallEnabled && this.selectedDoctorCodes.length > 1) this.selectedDoctorCodes = this.selectedDoctorCodes.slice(0, 1);
      this.updateDisplayLink();
    });
    this.loadQueues();
  }

  applyLocationConfig() {
    const config = this.locationConfigs.find(c => String(c.location_id) === String(this.locationId));
    this.pooledCallEnabled = !!config?.pooled_call_enabled;
    if (this.pooledCallEnabled && this.selectedDoctorCodes.length > 1) {
      this.selectedDoctorCodes = this.selectedDoctorCodes.slice(0, 1);
      localStorage.setItem('caller_doctor_codes', JSON.stringify(this.selectedDoctorCodes));
    }
  }

  doctorChanged() {
    this.closeQueueSearch();
    this.normalizeSelectedDoctors();
    localStorage.setItem('caller_doctor_codes', JSON.stringify(this.selectedDoctorCodes));
    this.updateDisplayLink();
    this.loadQueues();
  }

  validSelectedDoctorCodes() {
    const available = new Set(this.doctors.map(d => String(d.code)));
    return this.selectedDoctorCodes.filter(code => !available.size || available.has(String(code)));
  }

  normalizeSelectedDoctors() {
    const next = this.validSelectedDoctorCodes();
    if (next.length !== this.selectedDoctorCodes.length) {
      this.selectedDoctorCodes = next;
      localStorage.setItem('caller_doctor_codes', JSON.stringify(this.selectedDoctorCodes));
    }
  }

  loadQueues() {
    this.resetLoadQueuesWatchdog();
    if (!this.locationId) return;
    const generation = ++this.loadQueuesGeneration;
    const doctorCodes = this.pooledCallEnabled ? '' : this.validSelectedDoctorCodes().join(',');
    this.api.queues(this.locationId, doctorCodes).subscribe(r => {
      if (generation !== this.loadQueuesGeneration) return;
      this.queues = r.data;
      this.updateDisplayLink();
    });
  }

  resetLoadQueuesWatchdog() {
    if (this.loadQueuesWatchdog) window.clearTimeout(this.loadQueuesWatchdog);
    this.loadQueuesWatchdog = window.setTimeout(() => this.loadQueues(), 30000);
  }

  filteredQueues() {
    const statusForTab: Record<string, string> = { called: 'N', hold: 'W', pharmacy: 'P' };
    const filtered = this.tab === 'waiting'
      ? this.queues.filter(q => !['N', 'W', 'P'].includes(q.call_status))
      : this.queues.filter(q => q.call_status === statusForTab[this.tab]);
    if (this.tab === 'waiting') return filtered;
    return [...filtered].sort((a, b) => this.callTimeMs(b) - this.callTimeMs(a));
  }

  callTimeMs(q: any) {
    return q?.call_datetime ? new Date(q.call_datetime).getTime() || 0 : 0;
  }

  statusText(s: string) {
    return s === 'N' ? 'เรียกแล้ว' : s === 'W' ? 'ไม่พบ' : s === 'P' ? 'เติมยา/ไปรฯ' : 'รอเรียก';
  }

  selectedTab(q: any): 'waiting' | 'called' | 'hold' | 'pharmacy' {
    return q?.call_status === 'N' ? 'called' : q?.call_status === 'W' ? 'hold' : q?.call_status === 'P' ? 'pharmacy' : 'waiting';
  }

  callQueue(q: any) {
    const roomId = this.pooledCallEnabled ? this.destinationRoomId() : q.opd_qs_room_id;
    if (!roomId) return window.alert('กรุณาเลือกแพทย์ปลายทางก่อนเรียกคิว');
    this.callQueueToRoom(q, roomId);
  }

  callQueueForDoctor(q: any, doctor: any) {
    const roomId = this.doctorRoomId(doctor);
    if (!roomId) return;
    this.callQueueToRoom(q, roomId);
  }

  callQueueToRoom(q: any, roomId: string) {
    this.api.call({ slot_id: q.opd_qs_slot_id, room_id: roomId, location_id: this.locationId, queue_no: q.queue_slot_number }).subscribe(() => this.loadQueues());
  }

  holdQueue(q: any) {
    this.api.hold({ slot_id: q.opd_qs_slot_id, room_id: q.opd_qs_room_id, location_id: this.locationId }).subscribe({
      next: () => {
        const heldAt = new Date().toISOString();
        this.queues = this.queues.map(item => String(item.opd_qs_slot_id) === String(q.opd_qs_slot_id)
          ? { ...item, call_status: 'W', call_datetime: heldAt }
          : item);
        this.selected = this.queues.find(item => String(item.opd_qs_slot_id) === String(q.opd_qs_slot_id)) || null;
        this.updateDisplayLink();
        this.loadQueues();
        window.setTimeout(() => this.loadQueues(), 300);
      },
      error: err => {
        console.warn('Hold queue failed', err);
        window.alert(err?.error?.message || 'บันทึกคิวเรียกไม่พบไม่สำเร็จ');
      },
    });
  }

  pharmacyQueue(q: any) {
    this.api.pharmacy({ slot_id: q.opd_qs_slot_id, room_id: q.opd_qs_room_id, location_id: this.locationId }).subscribe({
      next: () => {
        const heldAt = new Date().toISOString();
        this.queues = this.queues.map(item => String(item.opd_qs_slot_id) === String(q.opd_qs_slot_id)
          ? { ...item, call_status: 'P', call_datetime: heldAt }
          : item);
        this.selected = this.queues.find(item => String(item.opd_qs_slot_id) === String(q.opd_qs_slot_id)) || null;
        this.updateDisplayLink();
        this.loadQueues();
        window.setTimeout(() => this.loadQueues(), 300);
      },
      error: err => {
        console.warn('Pharmacy queue failed', err);
        window.alert(err?.error?.message || 'บันทึกคิวเติมยา/ไปรษณีย์ไม่สำเร็จ');
      },
    });
  }

  cancelQueue(q: any) {
    this.api.cancel({ slot_id: q.opd_qs_slot_id, room_id: q.opd_qs_room_id, location_id: this.locationId }).subscribe(() => {
      this.selected = null;
      this.queues = this.queues.filter(item => String(item.opd_qs_slot_id) !== String(q.opd_qs_slot_id));
      this.updateDisplayLink();
      this.loadQueues();
      window.setTimeout(() => this.loadQueues(), 300);
    });
  }

  callNext() {
    const next = this.queues.find(q => !['N', 'W', 'P'].includes(q.call_status));
    if (next) {
      this.selected = next;
      this.callQueue(next);
    }
  }

  updateDisplayLink() {
    const doc = this.pooledCallEnabled ? '' : this.validSelectedDoctorCodes().join(',');
    const sourceRooms = this.pooledCallEnabled
      ? this.doctors.map(d => this.doctorRoomId(d))
      : this.queues.map(q => q.opd_qs_room_id);
    const rooms = [...new Set(sourceRooms.map(room => String(room || '').trim()).filter(Boolean))];
    this.displayLink = rooms.length > 1
      ? appRouteUrl(`/display-multi?location_id=${this.locationId}&room_ids=${rooms.join(',')}`)
      : appRouteUrl(`/display?location_id=${this.locationId}${rooms[0] ? `&room_id=${rooms[0]}` : ''}${doc ? `&doctor_code=${doc}` : ''}`);
  }

  selectedDestinationDoctor() {
    return this.doctors.find(d => String(d.code) === String(this.selectedDoctorCodes[0]));
  }

  destinationRoomId() {
    return this.doctorRoomId(this.selectedDestinationDoctor());
  }

  doctorRoomId(doctor: any) {
    return String(doctor?.opd_qs_room_id || doctor?.room_id || doctor?.call_opd_qs_room_id || '').trim();
  }

  @HostListener('document:keydown', ['$event'])
  hotkey(e: KeyboardEvent) {
    if (this.queueSearchOpen) {
      if (e.key === 'Escape') this.closeQueueSearch();
      return;
    }
    if (!this.selected) return;
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === '1') {
      e.preventDefault();
      this.callQueue(this.selected);
    }
    if (e.key === '2') {
      e.preventDefault();
      this.callNext();
    }
    if (e.key === '3' && this.selectedTab(this.selected) === 'waiting') {
      e.preventDefault();
      this.holdQueue(this.selected);
    }
    if (e.key === '3' && this.selectedTab(this.selected) === 'called') {
      e.preventDefault();
      this.holdQueue(this.selected);
    }
    if (e.key === '4' && this.selectedTab(this.selected) === 'waiting') {
      e.preventDefault();
      this.pharmacyQueue(this.selected);
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.combo')) this.doctorOpen = false;
  }
}
