import { Component, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { addCircle, person, book, logOut } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    RouterModule,
  ],
})
export class AppComponent implements OnDestroy {
  private routerSub?: Subscription;

  constructor(private router: Router, private menu: MenuController) {
    try {
      addIcons({ 'add-circle': addCircle, 'person': person, 'book': book, 'log-out': logOut });
    } catch (e) {
    }
    try {
      this.routerSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(async () => {
        await this.closeMenu();
      });
    } catch (e) {
    }
  }

  async logout() {
    try {
      await this.closeMenu();
    } catch (e) {
    }
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('No se pudo limpiar localStorage', e);
    }
    this.router.navigate(['/login']);
  }

  async closeMenu() {
    try {
      const closed = await this.menu.close('first');
      if (closed) return;
    } catch (e) {
    }

    try {
      const menuEl = document.querySelector('ion-menu') as any;
      if (menuEl && typeof menuEl.close === 'function') {
        await menuEl.close();
      }
    } catch (e) {

    }
  }

  ngOnDestroy(): void {
    try { this.routerSub?.unsubscribe(); } catch (e) { }
  }
}
