import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  isRegister = false;
  errorMessage = '';
  private apiUrl = 'https://data-processor-app.onrender.com/api';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    const endpoint = this.isRegister ? '/register' : '/login';
    this.http.post(`${this.apiUrl}${endpoint}`, {
      username: this.username,
      password: this.password
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          if (!this.isRegister) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('username', response.username);
            this.router.navigate(['/']);
          } else {
            this.errorMessage = 'Compte créé ! Connectez-vous maintenant.';
            this.isRegister = false;
          }
        }
      },
      error: (error) => {
        this.errorMessage = error.error.error || 'Erreur de connexion';
      }
    });
  }

  toggleMode() {
    this.isRegister = !this.isRegister;
    this.errorMessage = '';
  }
}
