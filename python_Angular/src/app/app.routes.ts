import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { FileUploadComponent } from './file-upload/file-upload.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: FileUploadComponent }
];
