import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataProcessorService } from '../services/data-processor.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h3 class="text-center">Traitement Automatique des Données</h3>
            </div>
            <div class="card-body">
              <div class="upload-area" 
                   (dragover)="onDragOver($event)" 
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   [class.drag-over]="isDragOver">
                <input type="file" 
                       #fileInput 
                       (change)="onFileSelected($event)" 
                       accept="*"
                       style="display: none;">
                <div class="text-center">
                  <div class="mb-3">📁</div>
                  <p>Glissez-déposez votre fichier ici ou</p>
                  <button class="btn btn-primary" (click)="fileInput.click()">
                    Sélectionner un fichier
                  </button>
                  <p class="mt-2 text-muted">Formats supportés: CSV, Excel, JSON, XML</p>
                </div>
              </div>
              
              <div *ngIf="selectedFile" class="mt-3">
                <p><strong>Fichier sélectionné:</strong> {{selectedFile.name}}</p>
                <button class="btn btn-success" (click)="uploadFile()" [disabled]="isUploading">
                  <span *ngIf="isUploading">⏳</span>
                  {{isUploading ? 'Traitement...' : 'Traiter le fichier'}}
                </button>
              </div>
              
              <div *ngIf="result" class="mt-3 alert alert-success">
                <h5>✅ {{result.message}}</h5>
                <p>Lignes: {{result.rows}} | Colonnes: {{result.columns}}</p>
                <button class="btn btn-outline-success" (click)="downloadFile()">
                  Télécharger le fichier traité
                </button>
              </div>
              
              <div *ngIf="error" class="mt-3 alert alert-danger">
                <strong>Erreur:</strong> {{error}}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upload-area {
      border: 2px dashed #ccc;
      border-radius: 10px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .upload-area:hover, .upload-area.drag-over {
      border-color: #007bff;
      background-color: #f8f9fa;
    }
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class FileUploadComponent {
  selectedFile: File | null = null;
  isUploading = false;
  isDragOver = false;
  result: any = null;
  error: string = '';

  constructor(private dataService: DataProcessorService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadFile() {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.error = '';
    this.result = null;

    this.dataService.uploadFile(this.selectedFile).subscribe({
      next: (response) => {
        this.result = response;
        this.isUploading = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Erreur lors du traitement';
        this.isUploading = false;
      }
    });
  }

  downloadFile() {
    if (!this.result?.processed_file) return;
    
    this.dataService.downloadFile(this.result.processed_file).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.result.processed_file;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }
}