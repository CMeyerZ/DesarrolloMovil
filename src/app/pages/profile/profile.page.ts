import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel, IonInput, IonList } from '@ionic/angular/standalone';
import { ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

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

  constructor(private router: Router, private toastCtrl: ToastController, private alertCtrl: AlertController, private firebase: FirebaseService) { }

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

    // Si existe en localStorage, comprobar contraseña actual y proceder
    if (idx !== -1) {
      // comprobar contraseña actual
      const stored = users[idx];
      if (!stored.password || stored.password !== cur) { await this.showToast('La contraseña actual es incorrecta.', 'danger'); return; }

      // Intentar actualizar en Firebase; si falla, seguiremos y actualizaremos localmente
      let updatedInFirebase = false;
      try {
        if (this.firebase) {
          updatedInFirebase = await this.firebase.updatePasswordByEmail(current.email, neu);
        }
      } catch (e) {
        console.warn('Error actualizando contraseña en Firebase, se hará fallback a localStorage', e);
      }

      // Actualizar localStorage para mantener consistencia local
      users[idx] = { ...stored, password: neu };
      try {
        localStorage.setItem('users', JSON.stringify(users));
      } catch (e) {
        console.error('No se pudo guardar la nueva contraseña localmente', e);
        await this.showToast('Error al guardar la nueva contraseña', 'danger');
        return;
      }

      this.cancelEdit();
      if (updatedInFirebase) {
        await this.showToast('Contraseña actualizada correctamente', 'success');
      } else {
        await this.showToast('Contraseña actualizada localmente (no encontrada/actualizada en Firebase)', 'warning');
      }
      return;
    }

    // Si no está en localStorage intentamos actualizar en Firebase directamente
    try {
      if (this.firebase) {
        const updated = await this.firebase.updatePasswordByEmail(current.email, neu);
        if (updated) {
          // sincronizar localStorage: añadir o actualizar registro local
          const nameCandidate = (current.name && typeof current.name === 'string') ? current.name : 'Usuario';
          users.push({ name: nameCandidate, email: current.email, password: neu });
          try { localStorage.setItem('users', JSON.stringify(users)); } catch (e) { console.warn('No se pudo sincronizar localStorage tras actualizar Firebase', e); }
          this.cancelEdit();
          await this.showToast('Contraseña actualizada correctamente', 'success');
          return;
        } else {
          await this.showToast('Usuario no encontrado en el sistema.', 'danger');
          return;
        }
      }
    } catch (e) {
      console.error('Error actualizando contraseña en Firebase:', e);
      await this.showToast('Error de conexión al actualizar contraseña', 'danger');
      return;
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

  // Dar de baja la cuenta con confirmación y eliminación en Firebase
  async deleteAccount() {
    // Identificar usuario actual
    const currentRaw = localStorage.getItem('currentUser');
    if (!currentRaw) { await this.showToast('No hay usuario logueado.', 'danger'); return; }
    let current: any = null;
    try { current = JSON.parse(currentRaw); } catch (e) { current = null; }
    if (!current || !current.email) { await this.showToast('No se pudo identificar el usuario.', 'danger'); return; }

    // Mostrar confirmación
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cuenta',
      message: '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: async () => {
            // Intentar eliminar en Firebase
            let deletedRemote = false;
            try {
              deletedRemote = await this.firebase.deleteUserByEmail(current.email);
            } catch (e) {
              console.error('Error eliminando usuario en Firebase:', e);
            }

            // Eliminar en localStorage (users y currentUser)
            try {
              const usersStr = localStorage.getItem('users');
              const users: Array<any> = usersStr ? JSON.parse(usersStr) : [];
              const filtered = users.filter(u => u.email !== current.email);
              localStorage.setItem('users', JSON.stringify(filtered));
            } catch (e) {
              console.warn('No se pudo actualizar lista local de usuarios tras eliminar', e);
            }
            try { localStorage.removeItem('currentUser'); } catch (e) { }

            if (deletedRemote) {
              await this.showToast('Cuenta eliminada correctamente', 'success');
            } else {
              await this.showToast('Cuenta eliminada localmente (no encontrada en Firebase)', 'warning');
            }

            // Redirigir a login
            this.router.navigateByUrl('/login');
          }
        }
      ]
    });
    await alert.present();
  }

}
