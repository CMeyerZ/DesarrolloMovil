import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton, IonRange } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { book, person, documentText, star, colorPalette, } from 'ionicons/icons';
interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  rating?: number;
  color?: string;
}

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton, IonRange, CommonModule, FormsModule]
})
export class AgregarPage implements OnInit {

  book: Partial<Book> = { title: '', author: '', description: '', rating: 4.5, color: 'linear-gradient(180deg,#FFD6B0,#FF8C6A)' };

  constructor(private router: Router) {
    // Registrar los iconos que usamos en esta página
    addIcons({
      'book': book,
      'person': person,
      'documentText': documentText,
      'star': star,
      'colorPalette': colorPalette
    });
  }

  ngOnInit() {
  }

  addBook() {
    if (!this.book.title || !this.book.author) {
      window.alert('Por favor completa el título y el autor.');
      return;
    }

    const key = 'books';
    const stored = localStorage.getItem(key);
    const list: Book[] = stored ? JSON.parse(stored) : [];

    const newBook: Book = {
      id: Date.now(),
      title: this.book.title!.trim(),
      author: this.book.author!.trim(),
      description: this.book.description || '',
      rating: this.book.rating || 0,
      color: this.book.color || 'linear-gradient(180deg,#FFD6B0,#FF8C6A)'
    };

    list.unshift(newBook);
    localStorage.setItem(key, JSON.stringify(list));

    // Navegar a la lista para ver el nuevo libro
    this.router.navigateByUrl('/listar');
  }

}
