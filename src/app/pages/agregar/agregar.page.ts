import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { book, person, star, colorPalette, barcode, pricetags, bookmark, calendar, documents, calendarClear } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  rating?: number;
  color?: string;
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

  async tomarFoto() {
    try {
      const foto = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      this.imagenCapturada = foto.dataUrl;
      console.log('Foto tomada con éxito:', foto);
      console.log('Objeto foto completo:', this.imagenCapturada);
    } catch (error) {
      console.error('Error al tomar la foto:', error);
    }
  }
  
  imagenCapturada: string | undefined;

  book: Partial<Book> = {
    title: '',
    author: '',
    description: '',
    rating: 4,
    color: 'linear-gradient(180deg,#FFD6B0,#FF8C6A)',
    isbn: '',
    category: '',
    pages: 0,
    status: 'por leer',
    startDate: null,
    endDate: null
  };

  constructor(private router: Router) {

    addIcons({book, person, star, colorPalette, barcode, pricetags, bookmark, calendar, documents, calendarClear});
  }

  ngOnInit() {
  }

  addBook() {
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

    const key = 'books';
    const stored = localStorage.getItem(key);
    const list: Book[] = stored ? JSON.parse(stored) : [];

    const newBook: Book = {
      id: Date.now(),
      title: this.book.title!.trim(),
      author: this.book.author!.trim(),
      description: this.book.description || '',
      rating: Math.round((this.book.rating || 0)),
      color: this.book.color || 'linear-gradient(180deg,#FFD6B0,#FF8C6A)',
      isbn: this.book.isbn || '',
      category: this.book.category || '',
      pages: Number(this.book.pages) || 0,
      status: this.book.status || 'por leer',

      startDate: (this.book.status === 'leyendo' || this.book.status === 'leído') ? this.book.startDate || null : null,
      endDate: (this.book.status === 'leído') ? this.book.endDate || null : null
    };

      if (this.imagenCapturada) {
        (newBook as any).image = this.imagenCapturada;
      }

    list.unshift(newBook);
    localStorage.setItem(key, JSON.stringify(list));

    this.router.navigateByUrl('/listar');
  }

}
