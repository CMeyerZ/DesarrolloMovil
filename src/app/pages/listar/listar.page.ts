import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonButton } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  rating: number;
  color: string; // cover color
}

@Component({
  selector: 'app-listar',
  templateUrl: './listar.page.html',
  styleUrls: ['./listar.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonButton, CommonModule, FormsModule]
})
export class ListarPage implements OnInit {

  searchTerm: string = '';

  books: Book[] = [
    {
      id: 1,
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      description: 'Una saga familiar mágica y épica situada en Macondo.',
      rating: 4.8,
      color: 'linear-gradient(180deg,#FF9F66,#FF7A59)'
    },
    {
      id: 2,
      title: 'Don Quijote de la Mancha',
      author: 'Miguel de Cervantes',
      description: 'Aventuras del caballero andante más famoso de la literatura española.',
      rating: 4.6,
      color: 'linear-gradient(180deg,#8EC5FC,#E0C3FC)'
    },
    {
      id: 3,
      title: 'El Principito',
      author: 'Antoine de Saint-Exupéry',
      description: 'Un pequeño príncipe viaja y nos enseña sobre la amistad y la vida.',
      rating: 4.7,
      color: 'linear-gradient(180deg,#FFD6B0,#FF8C6A)'
    },
    {
      id: 4,
      title: 'Siddhartha',
      author: 'Hermann Hesse',
      description: 'Búsqueda espiritual de un hombre en la India antigua.',
      rating: 4.4,
      color: 'linear-gradient(180deg,#A8E6CF,#DCEDC2)'
    }
  ];

  constructor(private router: Router) { }

  ngOnInit() {
    // Cargar libros desde localStorage si existen
    const key = 'books';
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Book[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.books = parsed;
        }
      } catch (e) {
        console.warn('Error parsing stored books', e);
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
    // navegar a la página de detalle con el id del libro
    this.router.navigateByUrl(`/detalle/${book.id}`);
  }

  deleteBook(book: Book) {
    this.books = this.books.filter(b => b.id !== book.id);
    // Guardar cambios en localStorage
    try {
      localStorage.setItem('books', JSON.stringify(this.books));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }
  }

}
