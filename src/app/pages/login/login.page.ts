import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mail, lockClosed } from 'ionicons/icons';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class LoginPage implements OnInit {

  credentials = { email: '', password: '' };
  emailError: string | null = null;
  passwordError: string | null = null;

  constructor(private router: Router, private toastCtrl: ToastController) {
    addIcons({ 'mail': mail, 'lockClosed': lockClosed });

  }

  ngOnInit() {
  }

  async onSubmit(form: NgForm) {
    Object.keys(form.controls).forEach(k => {
      const control = form.controls[k];
      control.markAsTouched();
    });
    this.emailError = null;
    this.passwordError = null;

    const email = (this.credentials.email || '').trim();
    const password = this.credentials.password || '';

    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    let valid = true;

    if (!email) {
      this.emailError = 'El correo es obligatorio.';
      valid = false;
    } else if (!emailRegex.test(email)) {
      this.emailError = 'El formato de correo no es válido.';
      valid = false;
    }

    if (!password) {
      this.passwordError = 'La contraseña es obligatoria.';
      valid = false;
    } else if (password.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres.';
      valid = false;
    }

    if (!valid) {
      const messages: string[] = [];
      if (this.emailError) messages.push(this.emailError);
      if (this.passwordError) messages.push(this.passwordError);
      const msg = messages.join(' ');
      await this.showErrorToast(msg);
      return;
    }

    const usersStr = localStorage.getItem('users');
    const users: Array<any> = usersStr ? JSON.parse(usersStr) : [];

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      await this.showErrorToast('Correo o contraseña incorrectos.');
      return;
    }

    localStorage.setItem('currentUser', JSON.stringify({ name: user.name, email: user.email }));
    await this.showSuccessToast('Inicio de sesión correcto');
    this.router.navigateByUrl('/listar');
  }

  private async showErrorToast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await t.present();
  }

  private async showSuccessToast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await t.present();
  }
}