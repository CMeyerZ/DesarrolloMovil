import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem,IonIcon, IonInput, IonButton } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { person as personIcon, mail as mailIcon, lockClosed as lockClosedIcon, lockOpen as lockOpenIcon } from 'ionicons/icons';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonItem,IonIcon, IonInput, IonButton]
})
export class RegisterPage implements OnInit {

  formData = {
    name: '',
    email: '',
    password: '',
    confirm: ''
  };

  errors: { name?: string; email?: string; password?: string; confirm?: string } = {};

  // Icon bindings para la plantilla
  public person = personIcon;
  public mail = mailIcon;
  public lockClosed = lockClosedIcon;
  public lockOpen = lockOpenIcon;

  constructor(private toastCtrl: ToastController, private router: Router) { }

  ngOnInit() {
  }

  private clearErrors() {
    this.errors = {};
  }

  private async showToast(message: string, color: string = 'success'){
    const t = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    await t.present();
  }

  async onSubmit(ev: Event){
    ev.preventDefault();
    this.clearErrors();

    const name = (this.formData.name || '').trim();
    const email = (this.formData.email || '').trim();
    const password = (this.formData.password || '');
    const confirm = (this.formData.confirm || '');

    // Validaciones
    if(!name){ this.errors.name = 'El nombre es obligatorio.'; }

    if(!email){
      this.errors.email = 'El correo es obligatorio.';
    } else {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!re.test(email)) this.errors.email = 'Introduce un correo válido.';
    }

    if(!password){
      this.errors.password = 'La contraseña es obligatoria.';
    } else if(password.length < 6){
      this.errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if(!confirm){
      this.errors.confirm = 'Confirma la contraseña.';
    } else if(password && confirm !== password){
      this.errors.confirm = 'Las contraseñas no coinciden.';
    }

    // Si hay errores, mostrar un toast con el primero y salir
    const keys = Object.keys(this.errors) as Array<keyof typeof this.errors>;
    if(keys.length){
      const first = this.errors[keys[0]];
      if(first) this.showToast(first, 'danger');
      return;
    }

    // Guardar usuario en localStorage (lista `users`) evitando duplicados
    console.log('Formulario válido:', this.formData);
    const usersStr = localStorage.getItem('users');
    const users: Array<any> = usersStr ? JSON.parse(usersStr) : [];

    // Comprobar si el correo ya está registrado
    if (users.some(u => u.email === email)) {
      await this.showToast('El correo ya está registrado.', 'danger');
      return;
    }

    // Añadir nuevo usuario (guardar solo datos necesarios)
    users.push({ name, email, password });
    localStorage.setItem('users', JSON.stringify(users));

    await this.showToast('Cuenta creada correctamente', 'success');

    // Reset form
    this.formData = { name: '', email: '', password: '', confirm: '' };

    // Navegar a la página de login después del registro correcto
    this.router.navigateByUrl('/login');
  }

  // Comprueba sin mutar errores si el formulario actualmente es válido
  isFormValid(): boolean {
    const name = (this.formData.name || '').trim();
    const email = (this.formData.email || '').trim();
    const password = (this.formData.password || '');
    const confirm = (this.formData.confirm || '');

    if(!name) return false;
    if(!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!re.test(email)) return false;
    if(!password || password.length < 6) return false;
    if(!confirm) return false;
    if(password !== confirm) return false;

    return true;
  }

  // Validación en tiempo real para un campo concreto (no muestra toasts)
  validateField(field: 'name'|'email'|'password'|'confirm'){
    const value = (this.formData[field] || '').toString();

    // Limpiar error previo
    delete this.errors[field];

    if(field === 'name'){
      if(!value.trim()) this.errors.name = 'El nombre es obligatorio.';
      return;
    }

    if(field === 'email'){
      if(!value.trim()){
        this.errors.email = 'El correo es obligatorio.';
        return;
      }
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!re.test(value)) this.errors.email = 'Introduce un correo válido.';
      return;
    }

    if(field === 'password'){
      if(!value) { this.errors.password = 'La contraseña es obligatoria.'; return; }
      if(value.length < 6) { this.errors.password = 'La contraseña debe tener al menos 6 caracteres.'; return; }
      // si password cambia, volver a validar confirm
      if(this.formData.confirm && this.formData.confirm !== value){
        this.errors.confirm = 'Las contraseñas no coinciden.';
      } else {
        delete this.errors.confirm;
      }
      return;
    }

    if(field === 'confirm'){
      if(!value) { this.errors.confirm = 'Confirma la contraseña.'; return; }
      if(this.formData.password && value !== this.formData.password){
        this.errors.confirm = 'Las contraseñas no coinciden.';
      }
      return;
    }
  }

}
