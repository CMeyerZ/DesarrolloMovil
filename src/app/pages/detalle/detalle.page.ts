import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
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
    private toastCtrl: ToastController
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

  ngOnInit() {
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
      if (this.fileInput && this.fileInput.nativeElement) {
        this.fileInput.nativeElement.click();
        return;
      }
    } catch (e) {  }

    try {
      const foto = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });
      if (foto && foto.dataUrl) {
        this.book.image = foto.dataUrl;
      }
    } catch (e) {
      console.warn('No se pudo tomar/seleccionar la foto', e);
    }
  }

  onFileSelected(event: Event) {
    if (!this.book) return;
    const input = event.target as HTMLInputElement;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string | ArrayBuffer | null;
      if (typeof result === 'string') {
        this.book!.image = result;
      }
      try { input.value = ''; } catch (e) {}
    };
    reader.readAsDataURL(file);
  }

  removePhoto() {
    if (!this.book) return;
    this.book.image = null;
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
