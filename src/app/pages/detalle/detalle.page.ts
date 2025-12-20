import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { FirebaseService } from '../../services/firebase.service';
import { barcode, pricetags, documentText, bookmark, calendar, star, starOutline, person, clipboard, calendarClear } from 'ionicons/icons';

interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  rating?: number;
  color?: string;
  isbn?: string;
  category?: string;
  pages?: number;
  status?: 'por leer' | 'leyendo' | 'leído';
  startDate?: string | null;
  endDate?: string | null;
  image?: string | null;
}

@Component({
  selector: 'app-detalle',
  templateUrl: './detalle.page.html',
  styleUrls: ['./detalle.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton, CommonModule, FormsModule]
})
export class DetallePage implements OnInit {

  book: Book | null = null;
  private booksKey = 'books';
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private firebase: FirebaseService
  ) {
      addIcons({barcode,pricetags,clipboard,bookmark,calendarClear,calendar,person,documentText,star}); }


  ngAfterViewInit() {
    // Registrar iconos usados en esta página para asegurar disponibilidad
    try {
      addIcons({
        'barcode': barcode,
        'pricetags': pricetags,
        'documentText': documentText,
        'bookmark': bookmark,
        'calendar': calendar,
        'star': star,
        'star-outline': starOutline,
        'clipboard': clipboard,
      });
    } catch (e) {
    }
  }

  async ngOnInit() {
    // Definir clave local en función del usuario logueado
    try {
      const currentRaw = localStorage.getItem('currentUser');
      const current = currentRaw ? JSON.parse(currentRaw) : null;
      const email = current?.email;
      if (email) {
        const keySafe = String(email).trim().replace(/[.#$\[\]\/\s]/g, '_');
        this.booksKey = `books_${keySafe}`;
      } else {
        this.booksKey = 'books';
      }
    } catch { this.booksKey = 'books'; }
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;

    if (id === null) {
      return;
    }

    const stored = localStorage.getItem(this.booksKey);
    if (!stored) {
      return;
    }

    try {
      const list: Book[] = JSON.parse(stored);
      const found = list.find(b => Number((b as any).id) === id);
      if (!found) {
        return;
      }

      this.book = { ...found };
      
      // Cargar imagen desde Preferences si existe
      if (this.book.id) {
        try {
          const imageData = await Preferences.get({ key: `book_image_${this.book.id}` });
          if (imageData.value) {
            this.book.image = imageData.value;
            console.log('Imagen cargada desde Preferences');
          }
        } catch (e) {
          console.warn('Error al cargar imagen desde Preferences', e);
        }
      }
    } catch (e) {
      console.warn('Error parsing books', e);
      this.router.navigateByUrl('/listar');
    }
  }

  getInitials(title: string) {
    if (!title) return '';
    const parts = title.split(' ');
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
  }

  async saveChanges() {
    if (!this.book) return;
    if (!this.book.title || !this.book.author) {
      const t = await this.toastCtrl.create({ message: 'Completa título y autor.', duration: 1800, color: 'warning' });
      await t.present();
      return;
    }

    const isbnRaw = (this.book.isbn || '').toString().trim();
    const isbnDigits = isbnRaw.replace(/[^0-9]/g, '');
    if (!isbnRaw || !/^\d{13}$/.test(isbnDigits)) {
      const t = await this.toastCtrl.create({ message: 'El ISBN es obligatorio y debe contener exactamente 13 dígitos numéricos.', duration: 2000, color: 'warning' });
      await t.present();
      return;
    }
    this.book.isbn = isbnDigits;

    try {
      this.book.rating = Math.round(this.book.rating || 0);
      this.book.pages = Number(this.book.pages) || 0;
      if (!(this.book.status === 'leyendo' || this.book.status === 'leído')) {
        this.book.startDate = null;
      }
      if (this.book.status !== 'leído') {
        this.book.endDate = null;
      }

      const stored = localStorage.getItem(this.booksKey);
      const list: Book[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(b => Number((b as any).id) === Number(this.book!.id));
      if (idx !== -1) {
        list[idx] = { ...this.book };
        localStorage.setItem(this.booksKey, JSON.stringify(list));

        // Guardar en Firebase
        try {
          const currentRaw = localStorage.getItem('currentUser');
          const current = currentRaw ? JSON.parse(currentRaw) : null;
          const email = current?.email;
          if (email && this.book?.isbn) {
            await this.firebase.saveUserBook(email, this.book);
          }
        } catch (e) {
          console.warn('No se pudo guardar cambios del libro en Firebase', e);
        }

        const t = await this.toastCtrl.create({ message: 'Cambios guardados.', duration: 1400, color: 'success' });
        await t.present();
      }
      this.router.navigateByUrl('/listar');
    } catch (e) {
      console.warn('Error saving', e);
      const t = await this.toastCtrl.create({ message: 'Error al guardar.', duration: 1400, color: 'danger' });
      await t.present();
    }
  }

  async editPhoto() {
    if (!this.book) return;
    
    try {
      const permisos = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      
      if (permisos.camera === 'granted' || permisos.photos === 'granted') {
        console.log('Permisos concedidos:', permisos);
        
        try {
          const foto = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Prompt,
            promptLabelHeader: 'Selecciona una opción',
            promptLabelPhoto: 'Desde galería',
            promptLabelPicture: 'Tomar foto'
          });
          
          if (foto && foto.dataUrl) {
            this.book.image = foto.dataUrl;
            console.log('Imagen capturada con éxito');
            
            // Guardar imagen en Preferences para persistencia
            if (this.book.id) {
              try {
                await Preferences.set({
                  key: `book_image_${this.book.id}`,
                  value: foto.dataUrl
                });
                console.log('Imagen guardada en Preferences');
              } catch (e) {
                console.warn('Error al guardar imagen en Preferences', e);
              }
            }
            
            await this.persistCurrentBookToLocalStorage('Imagen guardada correctamente', 'success');
          } else {
            console.warn('No se obtuvo imagen');
            const t = await this.toastCtrl.create({ message: 'No se capturó ninguna imagen', duration: 1600, color: 'warning' });
            await t.present();
          }
        } catch (photoError: any) {
          console.error('Error al capturar imagen:', photoError);
          const errorMsg = photoError?.message || 'Error desconocido al capturar';
          const t = await this.toastCtrl.create({ message: `Error: ${errorMsg}`, duration: 1600, color: 'danger' });
          await t.present();
        }
      } else {
        console.warn('Permisos denegados:', permisos);
        const t = await this.toastCtrl.create({ message: 'Permisos denegados. Habilita los permisos de cámara y fotos en la configuración.', duration: 1600, color: 'warning' });
        await t.present();
      }
    } catch (error: any) {
      console.error('Error al solicitar permisos:', error);
      const errorMsg = error?.message || 'Error desconocido';
      const t = await this.toastCtrl.create({ message: `Error al solicitar permisos: ${errorMsg}`, duration: 1600, color: 'danger' });
      await t.present();
    }
  }

  async onFileSelected(event: Event) {
    if (!this.book) return;
    const input = event.target as HTMLInputElement;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string | ArrayBuffer | null;
      if (typeof result === 'string') {
        this.book!.image = result;
        
        // Guardar imagen en Preferences para persistencia
        if (this.book!.id) {
          try {
            await Preferences.set({
              key: `book_image_${this.book!.id}`,
              value: result
            });
            console.log('Imagen guardada en Preferences desde archivo');
          } catch (e) {
            console.warn('Error al guardar imagen en Preferences', e);
          }
        }
        
        // Persistir inmediatamente el cambio de imagen en localStorage
        await this.persistCurrentBookToLocalStorage('Imagen guardada localmente', 'success');
      }
      try { input.value = ''; } catch (e) {}
    };
    reader.readAsDataURL(file);
  }

  async removePhoto() {
    if (!this.book) return;
    this.book.image = null;
    
    // Eliminar imagen de Preferences
    if (this.book.id) {
      try {
        await Preferences.remove({ key: `book_image_${this.book.id}` });
        console.log('Imagen eliminada de Preferences');
      } catch (e) {
        console.warn('Error al eliminar imagen de Preferences', e);
      }
    }
    
    // Persistir inmediatamente la eliminación de imagen en localStorage
    await this.persistCurrentBookToLocalStorage('Imagen eliminada', 'warning');
  }

  private async persistCurrentBookToLocalStorage(message: string = 'Cambios guardados localmente', color: string = 'success') {
    try {
      if (!this.book) return;
      const stored = localStorage.getItem(this.booksKey);
      const list: Book[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(b => Number((b as any).id) === Number(this.book!.id));
      if (idx !== -1) {
        list[idx] = { ...this.book! };
        localStorage.setItem(this.booksKey, JSON.stringify(list));
        // Mostrar confirmación
        try {
          const t = await this.toastCtrl.create({ message, duration: 1400, color });
          await t.present();
        } catch {}
      }
    } catch (e) {
      console.warn('No se pudo persistir el cambio de imagen en localStorage', e);
    }
  }

  async confirmDelete() {
    if (!this.book) return;
    const alert = await this.alertCtrl.create({
      header: 'Eliminar libro',
      message: `¿Estás seguro que quieres eliminar "${this.book.title}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => this.deleteBook() }
      ]
    });
    await alert.present();
  }

  async deleteBook() {
    if (!this.book) return;
    try {
      const stored = localStorage.getItem(this.booksKey);
      const list: Book[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter(b => Number((b as any).id) !== Number(this.book!.id));
      localStorage.setItem(this.booksKey, JSON.stringify(updated));

      // Eliminar en Firebase
      try {
        const currentRaw = localStorage.getItem('currentUser');
        const current = currentRaw ? JSON.parse(currentRaw) : null;
        const email = current?.email;
        if (email && this.book?.isbn) {
          await this.firebase.deleteUserBook(email, this.book.isbn);
        }
      } catch (e) {
        console.warn('No se pudo eliminar el libro en Firebase', e);
      }
      const t = await this.toastCtrl.create({ message: 'Libro eliminado.', duration: 1200, color: 'warning' });
      await t.present();
    } catch (e) {
      console.warn('Error deleting', e);
    }
    this.router.navigateByUrl('/listar');
  }
  
  cancel() {
    this.router.navigateByUrl('/listar');
  }

}
