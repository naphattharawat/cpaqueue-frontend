import { Routes } from '@angular/router';
import { PortalComponent } from './portal.component';
import { CallerComponent } from './caller.component';
import { DisplayComponent } from './display.component';
import { MultiDisplayComponent } from './multi-display.component';
import { CheckQueueComponent } from './check-queue.component';
import { MediaManagerComponent } from './media-manager.component';
import { ServiceSettingsComponent } from './service-settings.component';
import { AudioSettingsComponent } from './audio-settings.component';
import { DisplayDeviceComponent } from './display-device.component';
import { DashboardComponent } from './dashboard.component';
import { LoginComponent } from './login.component';
import { adminGuard, authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: PortalComponent, canActivate: [authGuard] },
  { path: 'caller', component: CallerComponent, canActivate: [authGuard] },
  { path: 'caller-mobile', component: CallerComponent, canActivate: [authGuard] },
  { path: 'display', component: DisplayComponent, canActivate: [adminGuard] },
  { path: 'display-multi', component: MultiDisplayComponent, canActivate: [adminGuard] },
  { path: 'display-device', component: DisplayDeviceComponent },
  { path: 'check-queue', component: CheckQueueComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'media-manager', component: MediaManagerComponent, canActivate: [adminGuard] },
  { path: 'service-settings', component: ServiceSettingsComponent, canActivate: [adminGuard] },
  { path: 'audio-settings', component: AudioSettingsComponent, canActivate: [adminGuard] },
];
