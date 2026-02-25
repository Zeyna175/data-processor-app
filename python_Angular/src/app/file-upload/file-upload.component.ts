import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataProcessorService } from '../services/data-processor.service';
import { ProcessingOptionsComponent } from '../processing-options/processing-options.component';
import { ResultsComponent } from '../results/results.component';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, ProcessingOptionsComponent, ResultsComponent],
  template: `
    <div class="container">
      <div class="stepper" *ngIf="currentStep > 0">
        <div class="step" [class.active]="currentStep >= 1" [class.completed]="currentStep > 1">
          <div class="step-number">1</div>
          <div class="step-label">Upload</div>
        </div>
        <div class="step-line" [class.completed]="currentStep > 1"></div>
        <div class="step" [class.active]="currentStep >= 2" [class.completed]="currentStep > 2">
          <div class="step-number">2</div>
          <div class="step-label">Options</div>
        </div>
        <div class="step-line" [class.completed]="currentStep > 2"></div>
        <div class="step" [class.active]="currentStep >= 3">
          <div class="step-number">3</div>
          <div class="step-label">Résultats</div>
        </div>
      </div>

      <div *ngIf="currentStep === 1" class="upload-section">
        <div class="header">
          <h1>🚀 Traitement Automatique des Données</h1>
          <p class="subtitle">Nettoyage et normalisation intelligents</p>
        </div>
        
        <div class="upload-card">
          <div class="upload-area" 
               (dragover)="onDragOver($event)" 
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)"
               [class.drag-over]="isDragOver">
            <input type="file" 
                   #fileInput 
                   (change)="onFileSelected($event)" 
                   accept=".csv,.xlsx,.xls,.json,.xml"
                   style="display: none;">
            <div class="upload-content">
              <div class="upload-icon">📁</div>
              <p class="upload-text">Glissez-déposez votre fichier ici</p>
              <button class="btn btn-primary" (click)="fileInput.click()">
                Sélectionner un fichier
              </button>
              <p class="formats">CSV, Excel, JSON, XML</p>
            </div>
          </div>
          
          <div *ngIf="selectedFile" class="file-selected">
            <div class="file-info">
              <span class="file-icon">📄</span>
              <span class="file-name">{{selectedFile.name}}</span>
              <span class="file-size">{{getFileSize()}}</span>
            </div>
            <button class="btn btn-success" (click)="analyzeFile()" [disabled]="isProcessing">
              <span *ngIf="isProcessing">⏳ Analyse...</span>
              <span *ngIf="!isProcessing">🔍 Analyser</span>
            </button>
          </div>
          
          <div *ngIf="error" class="alert alert-danger">
            ❌ {{error}}
          </div>
        </div>
      </div>

      <div *ngIf="currentStep === 2">
        <div *ngIf="previewData && previewColumns.length">
          <h3>Aperçu du fichier</h3>
          <table class="table table-bordered">
            <thead>
              <tr>
                <th *ngFor="let col of previewColumns">{{col}}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of previewData">
                <td *ngFor="let col of previewColumns">{{row[col]}}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-processing-options 
          [analysis]="analysis"
          (back)="goBack()"
          (process)="processFile($event)">
        </app-processing-options>
      </div>

      <app-results 
        *ngIf="currentStep === 3" 
        [stats]="processingStats"
        [filename]="processedFilename"
        (download)="downloadFile()"
        (newFile)="reset()">
      </app-results>
    </div>
  `,
  styles: [`
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
    .stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 3rem; background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .step-number { width: 50px; height: 50px; border-radius: 50%; background: #e9ecef; color: #6c757d; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; transition: all 0.3s ease; }
    .step.active .step-number { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .step.completed .step-number { background: #28a745; color: white; }
    .step-label { font-size: 0.9rem; color: #6c757d; font-weight: 600; }
    .step.active .step-label { color: #667eea; }
    .step-line { width: 100px; height: 3px; background: #e9ecef; margin: 0 1rem; transition: all 0.3s ease; }
    .step-line.completed { background: #28a745; }
    .upload-section { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 { font-size: 2.5rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .subtitle { font-size: 1.2rem; color: #7f8c8d; }
    .upload-card { background: white; border-radius: 20px; padding: 2rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
    .upload-area { border: 3px dashed #cbd5e0; border-radius: 15px; padding: 3rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: #f8f9fa; }
    .upload-area:hover, .upload-area.drag-over { border-color: #667eea; background: #f0f4ff; transform: scale(1.02); }
    .upload-content { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .upload-icon { font-size: 4rem; }
    .upload-text { font-size: 1.2rem; color: #495057; font-weight: 600; margin: 0; }
    .formats { color: #6c757d; font-size: 0.9rem; margin: 0; }
    .file-selected { margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #e7f3ff; border-radius: 10px; }
    .file-info { display: flex; align-items: center; gap: 1rem; }
    .file-icon { font-size: 2rem; }
    .file-name { font-weight: 600; color: #2c3e50; }
    .file-size { color: #6c757d; font-size: 0.9rem; }
    .btn { padding: 0.75rem 2rem; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover:not(:disabled) { background: #218838; transform: translateY(-2px); }
    .alert { padding: 1rem; border-radius: 10px; margin-top: 1rem; }
    .alert-danger { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
  `]
})
export class FileUploadComponent {
  currentStep = 1;
  selectedFile: File | null = null;
  isDragOver = false;
  isProcessing = false;
  error = '';
  analysis: any = null;
  processingStats: any = null;
  processedFilename = '';
  previewData: any = null;
  previewColumns: string[] = [];

  constructor(private dataService: DataProcessorService) { }

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
    this.error = '';
    this.previewData = null;
    this.previewColumns = [];
    if (this.selectedFile) {
      // On upload le fichier temporairement pour pouvoir le prévisualiser
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      this.dataService.analyzeFile(this.selectedFile).subscribe({
        next: (response) => {
          if (response.filename) {
            this.dataService.previewFile(response.filename).subscribe({
              next: (preview) => {
                this.previewColumns = preview.columns;
                this.previewData = preview.data;
              }
            });
          }
        }
      });
    }
  }

  getFileSize(): string {
    if (!this.selectedFile) return '';
    const bytes = this.selectedFile.size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  analyzeFile() {
    if (!this.selectedFile) return;
    this.isProcessing = true;
    this.error = '';
    this.dataService.analyzeFile(this.selectedFile).subscribe({
      next: (response) => {
        this.analysis = response;
        this.currentStep = 2;
        this.isProcessing = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Erreur d\'analyse';
        this.isProcessing = false;
      }
    });
  }

  processFile(options: any) {
    if (!this.analysis?.filename) return;

    this.isProcessing = true;

    this.dataService.processFile(this.analysis.filename, options).subscribe({
      next: (response) => {
        this.processingStats = response.stats;
        this.processedFilename = response.processed_file;
        this.currentStep = 3;
        this.isProcessing = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Erreur de traitement';
        this.isProcessing = false;
        this.currentStep = 2;
      }
    });
  }

  downloadFile() {
    if (!this.processedFilename) return;

    this.dataService.downloadFile(this.processedFilename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.processedFilename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  goBack() {
    this.currentStep = 1;
    this.selectedFile = null;
    this.analysis = null;
  }

  reset() {
    this.currentStep = 1;
    this.selectedFile = null;
    this.analysis = null;
    this.processingStats = null;
    this.processedFilename = '';
    this.error = '';
  }
}