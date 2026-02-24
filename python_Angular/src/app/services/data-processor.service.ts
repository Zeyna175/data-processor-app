import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataProcessorService {
  private apiUrl = 'https://data-processor-app.onrender.com/api';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  analyzeFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/analyze`, formData, { headers });
  }

  processFile(filename: string, options: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/process`, { filename, options }, { headers });
  }

  downloadFile(filename: string): Observable<Blob> {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/download/${filename}`, { headers, responseType: 'blob' });
  }

  getStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status`);
  }
}