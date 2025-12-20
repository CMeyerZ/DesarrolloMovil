import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { addIcons } from 'ionicons';
import { star, starOutline, book, person, documentText, colorPalette, barcode, pricetags, bookmark, calendar, logOut } from 'ionicons/icons';
//Importaciones Firebase
import { initializeApp } from 'firebase/app';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { environment } from './environments/environment';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideHttpClient } from '@angular/common/http';
try {
  addIcons({
    'star': star,
    'star-outline': starOutline,
    'book': book,
    'person': person,
    'documentText': documentText,
    'colorPalette': colorPalette,
    'barcode': barcode,
    'pricetags': pricetags,
    'bookmark': bookmark,
    'calendar': calendar,
    'log-out': logOut
  });
} catch (e) {
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideDatabase(() => getDatabase()),
  ],
});
