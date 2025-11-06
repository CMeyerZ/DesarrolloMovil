import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton, IonRange } from '@ionic/angular/standalone';

interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  rating?: number;
  color?: string;
}

@Component({
  selector: 'app-detalle',
  templateUrl: './detalle.page.html',
  styleUrls: ['./detalle.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonInput, IonTextarea, IonButton, IonRange, CommonModule, FormsModule]
})
export class DetallePage implements OnInit {

  book: Book | null = null;
  private booksKey = 'books';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    // If no id provided, don't redirect — allow the detalle page to be its own route
    if (id === null) {
      // leave book as null; the template shows a 'Libro no encontrado.' message
      return;
    }

    const stored = localStorage.getItem(this.booksKey);
    if (!stored) {
      // no stored books: keep book null and let the page render empty state
      return;
    }

    try {
      const list: Book[] = JSON.parse(stored);
      const found = list.find(b => b.id === id);
      if (!found) {
        // book id not found — keep null so template shows not-found state
        return;
      }
      // clone to avoid direct mutation until save
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

    try {
      const stored = localStorage.getItem(this.booksKey);
      const list: Book[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(b => b.id === this.book!.id);
      if (idx !== -1) {
        list[idx] = { ...this.book };
        localStorage.setItem(this.booksKey, JSON.stringify(list));
        const t = await this.toastCtrl.create({ message: 'Cambios guardados.', duration: 1400, color: 'success' });
        await t.present();
      }
      // return to listar
      this.router.navigateByUrl('/listar');
    } catch (e) {
      console.warn('Error saving', e);
      const t = await this.toastCtrl.create({ message: 'Error al guardar.', duration: 1400, color: 'danger' });
      await t.present();
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
      const updated = list.filter(b => b.id !== this.book!.id);
      localStorage.setItem(this.booksKey, JSON.stringify(updated));
      const t = await this.toastCtrl.create({ message: 'Libro eliminado.', duration: 1200, color: 'warning' });
      await t.present();
    } catch (e) {
      console.warn('Error deleting', e);
    }
    this.router.navigateByUrl('/listar');
  }

  /**
   * Cancelar edición y volver a la lista sin guardar
   */
  cancel() {
    this.router.navigateByUrl('/listar');
  }

}
