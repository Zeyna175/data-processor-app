import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  username: string | null = null;
  stats: any = {};
  files: any[] = [];
  private apiUrl = 'https://data-processor-app.onrender.com/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.username = this.authService.getCurrentUsername();
    this.loadStats();
    this.loadFiles();
  }

  loadStats() {
    const headers = this.authService.getAuthHeaders();
    this.http.get(`${this.apiUrl}/stats`, { headers }).subscribe({
      next: (data: any) => this.stats = data,
      error: (err) => console.error(err)
    });
  }

  loadFiles() {
    const headers = this.authService.getAuthHeaders();
    this.http.get(`${this.apiUrl}/files`, { headers }).subscribe({
      next: (data: any) => this.files = data.files,
      error: (err) => console.error(err)
    });
  }

  deleteFile(filename: string) {
    if (confirm('Supprimer ce fichier ?')) {
      const headers = this.authService.getAuthHeaders();
      this.http.delete(`${this.apiUrl}/files/${filename}`, { headers }).subscribe({
        next: () => this.loadFiles(),
        error: (err) => console.error(err)
      });
    }
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => console.error(err)
    });
  }

  goToUpload() {
    this.router.navigate(['/upload']);
  }
}
