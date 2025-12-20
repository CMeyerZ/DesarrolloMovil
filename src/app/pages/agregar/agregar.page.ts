import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { book, person, star, colorPalette, barcode, pricetags, bookmark, calendar, documents, calendarClear } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';

interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  rating?: number;
  image?: string | null;
  isbn?: string;
  category?: string;
  pages?: number;
  status?: 'por leer' | 'leyendo' | 'leído';
  startDate?: string | null;
  endDate?: string | null;
}

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton, CommonModule, FormsModule]
})

export class AgregarPage implements OnInit {
  private sanitizeEmailKey(email: string): string {
    return String(email).trim().replace(/[.#$\[\]\/\s]/g, '_');
  }

  async tomarFoto() {
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
            this.imagenCapturada = foto.dataUrl;
            console.log('Imagen capturada con éxito');
            await this.showToast('Imagen capturada correctamente', 'success');
          } else {
            console.warn('No se obtuvo imagen');
            await this.showToast('No se capturó ninguna imagen', 'warning');
          }
        } catch (photoError: any) {
          console.error('Error al capturar imagen:', photoError);
          const errorMsg = photoError?.message || 'Error desconocido al capturar';
          await this.showToast(`Error: ${errorMsg}`, 'danger');
        }
      } else { 
        console.warn('Permisos denegados:', permisos);
        await this.showToast('Permisos denegados. Habilita los permisos de cámara y fotos en la configuración.', 'warning');
      }
    } catch (error: any) {
      console.error('Error al solicitar permisos:', error);
      const errorMsg = error?.message || 'Error desconocido';
      await this.showToast(`Error al solicitar permisos: ${errorMsg}`, 'danger');
    }
  }
  
  imagenCapturada: string | undefined;

  book: Partial<Book> = {
    title: '',
    author: '',
    description: '',
    rating: 4,
    isbn: '',
    category: '',
    pages: 0,
    status: 'por leer',
    startDate: null,
    endDate: null
  };

  constructor(private router: Router, private firebase: FirebaseService, private toastCtrl: ToastController) {

    addIcons({book, person, star, colorPalette, barcode, pricetags, bookmark, calendar, documents, calendarClear});
  }

  ngOnInit() {
  }

  async addBook() {
    if (!this.book.title || !this.book.author) {
      window.alert('Por favor completa el título y el autor.');
      return;
    }

    const isbnRaw = (this.book.isbn || '').toString().trim();
    const isbnDigits = isbnRaw.replace(/[^0-9]/g, '');
    if (!isbnRaw || !/^\d{13}$/.test(isbnDigits)) {
      window.alert('El ISBN es obligatorio y debe contener exactamente 13 dígitos numéricos.');
      return;
    }

    this.book.isbn = isbnDigits;

    const currentRaw = localStorage.getItem('currentUser');
    const current = currentRaw ? JSON.parse(currentRaw) : null;
    const email = current?.email;
    const key = email ? `books_${this.sanitizeEmailKey(email)}` : 'books';
    const stored = localStorage.getItem(key);
    const list: Book[] = stored ? JSON.parse(stored) : [];

    const newBook: Book = {
      id: Date.now(),
      title: this.book.title!.trim(),
      author: this.book.author!.trim(),
      description: this.book.description || '',
      rating: Math.round((this.book.rating || 0)),
      isbn: this.book.isbn || '',
      category: this.book.category || '',
      pages: Number(this.book.pages) || 0,
      status: this.book.status || 'por leer',

      startDate: (this.book.status === 'leyendo' || this.book.status === 'leído') ? this.book.startDate || null : null,
      endDate: (this.book.status === 'leído') ? this.book.endDate || null : null
    };

      if (this.imagenCapturada) {
        (newBook as any).image = this.imagenCapturada;
        // Guardar imagen en Preferences para persistencia
        try {
          await Preferences.set({
            key: `book_image_${newBook.id}`,
            value: this.imagenCapturada
          });
          console.log('Imagen guardada en Preferences');
        } catch (e) {
          console.warn('Error al guardar imagen en Preferences', e);
        }
      }

    // Guardar en Firebase por usuario logueado (único por ISBN)
    let remoteError = false;
    try {
      if (email && newBook.isbn) {
        await this.firebase.saveUserBook(email, newBook);
      }
    } catch (e) {
      console.warn('No se pudo guardar el libro en Firebase', e);
      remoteError = true;
      await this.showToast('Error al guardar en la nube (Firebase)', 'danger');
    }

    // Guardar localmente
    let localError = false;
    try {
      list.unshift(newBook);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.error('Error al guardar en localStorage', e);
      localError = true;
      await this.showToast('Error al guardar localmente', 'danger');
    }

    // Si hubo cualquier error, no navegar
    if (remoteError || localError) {
      return;
    }

    // Confirmar alta
    await this.showToast('Libro agregado', 'success');
    this.router.navigateByUrl('/listar');
  }

  private async showToast(message: string, color: string = 'success') {
    try {
      const t = await this.toastCtrl.create({ message, duration: 1600, color });
      await t.present();
    } catch {}
  }

}
