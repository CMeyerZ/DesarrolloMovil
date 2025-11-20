import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonButton, IonIcon, IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';
import { Router } from '@angular/router';

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

  books: Book[] = [
    {
      id: 1,
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      description: 'Una saga familiar mágica y épica situada en Macondo.',
      rating: 5,
      color: 'linear-gradient(180deg,#FF9F66,#FF7A59)',
      isbn: '9798890981745',
      category: 'Novela',
      pages: 432,
      status: 'por leer',
      startDate: null,
      endDate: null
    },
    {
      id: 2,
      title: 'Don Quijote de la Mancha',
      author: 'Miguel de Cervantes',
      description: 'Aventuras del caballero andante más famoso de la literatura española.',
      rating: 5,
      color: 'linear-gradient(180deg,#8EC5FC,#E0C3FC)',
      isbn: '9788491057536',
      category: 'Clásico',
      pages: 1024,
      status: 'por leer',
      startDate: null,
      endDate: null
    },
    {
      id: 3,
      title: 'El Principito',
      author: 'Antoine de Saint-Exupéry',
      description: 'Un pequeño príncipe viaja y nos enseña sobre la amistad y la vida.',
      rating: 4,
      color: 'linear-gradient(180deg,#FFD6B0,#FF8C6A)',
      isbn: '9788418174193',
      category: 'Infantil',
      pages: 96,
      status: 'leyendo',
      startDate: '2025-10-15',
      endDate: null
    },
    {
      id: 4,
      title: 'Siddhartha',
      author: 'Hermann Hesse',
      description: 'Búsqueda espiritual de un hombre en la India antigua.',
      rating: 4,
      color: 'linear-gradient(180deg,#A8E6CF,#DCEDC2)',
      isbn: '9789358487169',
      category: 'Filosofía',
      pages: 168,
      status: 'leído',
      startDate: '2024-03-01',
      endDate: '2024-03-20'
    }
  ];

  constructor(private router: Router) { }

  ngAfterViewInit() {
    try {
      addIcons({ 'star': star, 'star-outline': starOutline });
    } catch (e) {

    }
  }

  ngOnInit() {

    this.loadBooks();
  }

  private loadBooks() {
    const key = 'books';
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Book[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.books = parsed;
          return;
        }
      } catch (e) {
        console.warn('Error parsing stored books', e);
      }
    }

    try {
      localStorage.setItem(key, JSON.stringify(this.books));
    } catch (e) {
      console.warn('No se pudo inicializar localStorage con libros', e);
    }
  }

  ionViewWillEnter() {
    this.loadBooks();
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
      localStorage.setItem('books', JSON.stringify(this.books));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }
  }

}
