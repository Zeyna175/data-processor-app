import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataProcessorService } from '../services/data-processor.service';
import { ProcessingOptionsComponent } from '../processing-options/processing-options.component';
import { ResultsComponent } from '../results/results.component';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, ProcessingOptionsComponent, ResultsComponent],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
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