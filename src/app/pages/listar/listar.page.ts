import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonButton, IonIcon, IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { Preferences } from '@capacitor/preferences';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  rating: number;
  color: string;
  isbn?: string;
  image?: string | null;
  category?: string;
  pages?: number;
  status?: 'por leer' | 'leyendo' | 'leído';
  startDate?: string | null;
  endDate?: string | null;
}

@Component({
  selector: 'app-listar',
  templateUrl: './listar.page.html',
  styleUrls: ['./listar.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonButton, IonIcon, IonAccordion, IonAccordionGroup, IonItem, IonLabel, CommonModule, FormsModule]
})
export class ListarPage implements OnInit {

  searchTerm: string = '';

  books: Book[] = [];

  constructor(private router: Router, private firebase: FirebaseService) { }

  ngAfterViewInit() {
    try {
      addIcons({ 'star': star, 'star-outline': starOutline });
    } catch (e) {

    }
  }

  ngOnInit() {

    this.loadBooks();
  }

  private sanitizeEmailKey(email: string): string {
    return String(email).trim().replace(/[.#$\[\]\/\s]/g, '_');
  }

  private async loadBooks() {
    // Determinar clave local por usuario
    const currentRaw = localStorage.getItem('currentUser');
    const current = currentRaw ? JSON.parse(currentRaw) : null;
    const email = current?.email;
    const userKey = email ? `books_${this.sanitizeEmailKey(email)}` : 'books';

    // Intentar cargar desde Firebase para el usuario logueado
    try {
      if (email) {
        const remoteBooks = await this.firebase.getUserBooks(email);
        if (Array.isArray(remoteBooks) && remoteBooks.length) {
          // Mapear a interfaz Book si falta algún campo
          const mapped: Book[] = remoteBooks.map((b: any, idx: number) => ({
            id: Number(b?.id ?? Date.now() + idx),
            title: String(b?.title ?? ''),
            author: String(b?.author ?? ''),
            description: b?.description ?? '',
            rating: Number(b?.rating ?? 0),
            color: String(b?.color ?? 'linear-gradient(180deg,#8EC5FC,#E0C3FC)'),
            isbn: String(b?.isbn ?? ''),
            image: b?.image ?? null,
            category: b?.category ?? '',
            pages: Number(b?.pages ?? 0),
            status: (b?.status as any) ?? 'por leer',
            startDate: b?.startDate ?? null,
            endDate: b?.endDate ?? null,
          }));
          // Mezclar imágenes locales (si existen) basadas en ISBN
          try {
            const localRaw = localStorage.getItem(userKey);
            const localList: Book[] = localRaw ? JSON.parse(localRaw) : [];
            const localByIsbn = new Map<string, Book>();
            for (const lb of localList) {
              const isbnKey = String(lb?.isbn || '').replace(/[^0-9]/g, '');
              if (isbnKey) localByIsbn.set(isbnKey, lb);
            }
            for (const m of mapped) {
              const isbnKey = String(m?.isbn || '').replace(/[^0-9]/g, '');
              const lb = localByIsbn.get(isbnKey);
              if (lb && lb.image) {
                m.image = lb.image;
              }
            }
          } catch {}
          this.books = mapped;
          
          // Cargar imágenes desde Preferences
          await this.loadImagesFromPreferences();
          
          try { localStorage.setItem(userKey, JSON.stringify(this.books)); } catch { }
          return;
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar libros desde Firebase, se usará localStorage', e);
    }

    // Fallback: si hay usuario, cargar su cache local o mostrar vacío
    const storedUser = localStorage.getItem(userKey);
    if (email) {
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as Book[];
          if (Array.isArray(parsed)) {
            this.books = parsed;
            // Cargar imágenes desde Preferences
            await this.loadImagesFromPreferences();
            return;
          }
        } catch (e) {
          console.warn('Error parseando libros locales del usuario', e);
        }
      }
      // Usuario logueado pero sin libros: lista vacía
      this.books = [];
      try { localStorage.setItem(userKey, JSON.stringify(this.books)); } catch {}
      return;
    }

    // Sin usuario: no mostrar demo ni usar clave global; lista vacía
    this.books = [];
    return;
  }

  ionViewWillEnter() {
    this.loadBooks();
  }

  private async loadImagesFromPreferences() {
    for (const book of this.books) {
      if (book.id) {
        try {
          const imageData = await Preferences.get({ key: `book_image_${book.id}` });
          if (imageData.value) {
            book.image = imageData.value;
          }
        } catch (e) {
          console.warn(`Error al cargar imagen para libro ${book.id}`, e);
        }
      }
    }
  }

  filteredBooks(): Book[] {
    const q = this.searchTerm?.trim().toLowerCase();
    if (!q) return this.books;
    return this.books.filter(b => (b.title + ' ' + b.author).toLowerCase().includes(q));
  }

  getInitials(title: string) {
    if (!title) return '';
    const parts = title.split(' ');
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
  }

  viewBook(book: Book) {
    this.router.navigateByUrl(`/detalle/${book.id}`);
  }

  deleteBook(book: Book) {
    this.books = this.books.filter(b => b.id !== book.id);
    try {
      const currentRaw = localStorage.getItem('currentUser');
      const current = currentRaw ? JSON.parse(currentRaw) : null;
      const email = current?.email;
      const key = email ? `books_${this.sanitizeEmailKey(email)}` : 'books';
      localStorage.setItem(key, JSON.stringify(this.books));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }

    // Eliminar también en Firebase (si hay usuario y ISBN)
    try {
      const currentRaw = localStorage.getItem('currentUser');
      const current = currentRaw ? JSON.parse(currentRaw) : null;
      const emailFirebase = current?.email;
      if (emailFirebase && book?.isbn) {
        this.firebase.deleteUserBook(emailFirebase, String(book.isbn));
      }
    } catch (e) {
      console.warn('No se pudo eliminar el libro en Firebase', e);
    }
  }

}
