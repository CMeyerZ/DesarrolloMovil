import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel, IonInput, IonList } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel, IonInput, IonList, CommonModule, FormsModule]
})
export class ProfilePage implements OnInit {

  userName: string = 'Invitado';
  userEmail: string | null = null;

  // editar contraseña
  editing: boolean = false;
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  formErrors: { current?: string; new?: string; confirm?: string } = {};

  constructor(private router: Router, private toastCtrl: ToastController) { }

  ngOnInit() {
    try {
      const rawCurrent = localStorage.getItem('currentUser');
      if (rawCurrent) {
        try {
          const parsed = JSON.parse(rawCurrent);
          if (parsed && typeof parsed === 'object') {
            const candidate = parsed.name || parsed.nombre || parsed.username || parsed.fullName;
            const emailCandidate = parsed.email || parsed.emailAddress || parsed.correo;
            if (candidate && typeof candidate === 'string') { this.userName = candidate; }
            if (emailCandidate && typeof emailCandidate === 'string') { this.userEmail = emailCandidate; }
          }
        } catch (e) {
          if (typeof rawCurrent === 'string' && rawCurrent.trim().length > 0) { this.userName = rawCurrent; }
        }
        return;
      }

      const possibleKeys = ['user', 'usuario', 'userInfo', 'profile', 'name', 'nombre', 'userName', 'user'];
      for (const k of possibleKeys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed) {
            const candidate = parsed.name || parsed.nombre || parsed.username || parsed.fullName;
            const emailCandidate = parsed.email || parsed.emailAddress || parsed.correo;
            if (candidate && typeof candidate === 'string') { this.userName = candidate; }
            if (emailCandidate && typeof emailCandidate === 'string') { this.userEmail = emailCandidate; }
            if (this.userName) break;
          }
        } catch (e) {
          if (typeof raw === 'string' && raw.trim().length > 0) { this.userName = raw; break; }
        }
      }
    } catch (e) {
    }
  }

  startEdit(){
    this.editing = true;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.formErrors = {};
  }

  cancelEdit(){
    this.editing = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.formErrors = {};
  }

  private async showToast(message: string, color: string = 'success'){
    const t = await this.toastCtrl.create({ message, duration: 2000, color });
    await t.present();
  }

  async changePassword(){
    this.formErrors = {};

    const cur = (this.currentPassword || '');
    const neu = (this.newPassword || '');
    const conf = (this.confirmPassword || '');

    if(!cur){ this.formErrors.current = 'Introduce la contraseña actual.'; }
    if(!neu){ this.formErrors.new = 'Introduce la nueva contraseña.'; }
    else if(neu.length < 6){ this.formErrors.new = 'La contraseña debe tener al menos 6 caracteres.'; }
    if(!conf){ this.formErrors.confirm = 'Confirma la nueva contraseña.'; }
    else if(neu && conf !== neu){ this.formErrors.confirm = 'Las contraseñas no coinciden.'; }

    if(Object.keys(this.formErrors).length){
      const first = this.formErrors[Object.keys(this.formErrors)[0] as keyof typeof this.formErrors];
      if(first) await this.showToast(first, 'danger');
      return;
    }

    // localizar usuario actual por email en localStorage.users
    const currentRaw = localStorage.getItem('currentUser');
    if(!currentRaw){ await this.showToast('No hay usuario logueado.', 'danger'); return; }
    let current: any = null;
    try { current = JSON.parse(currentRaw); } catch(e){ current = null; }
    if(!current || !current.email){ await this.showToast('No se pudo identificar el usuario.', 'danger'); return; }

    const usersStr = localStorage.getItem('users');
    const users: Array<any> = usersStr ? JSON.parse(usersStr) : [];
    const idx = users.findIndex(u => u.email === current.email);
    if(idx === -1){ await this.showToast('Usuario no encontrado en el sistema.', 'danger'); return; }

    // comprobar contraseña actual
    const stored = users[idx];
    if(!stored.password || stored.password !== cur){ await this.showToast('La contraseña actual es incorrecta.', 'danger'); return; }

    // actualizar
    users[idx] = { ...stored, password: neu };
    try{
      localStorage.setItem('users', JSON.stringify(users));
      this.cancelEdit();
      await this.showToast('Contraseña actualizada correctamente', 'success');
    } catch(e){
      console.error('No se pudo guardar la nueva contraseña', e);
      await this.showToast('Error al guardar la nueva contraseña', 'danger');
    }
  }

  goToList() {
    this.router.navigateByUrl('/listar');
  }

  goToAdd() {
    this.router.navigateByUrl('/agregar');
  }

  logout() {
    try {
      localStorage.removeItem('currentUser');
    } catch (e) {
      console.warn('No se pudo eliminar currentUser', e);
    }
    this.router.navigateByUrl('/login');
  }

}
