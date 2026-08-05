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

export const routes: Routes = [
  { path: '', component: PortalComponent },
  { path: 'caller', component: CallerComponent },
  { path: 'caller-mobile', component: CallerComponent },
  { path: 'display', component: DisplayComponent },
  { path: 'display-multi', component: MultiDisplayComponent },
  { path: 'display-device', component: DisplayDeviceComponent },
  { path: 'check-queue', component: CheckQueueComponent },
  { path: 'media-manager', component: MediaManagerComponent },
  { path: 'service-settings', component: ServiceSettingsComponent },
  { path: 'audio-settings', component: AudioSettingsComponent },
];
