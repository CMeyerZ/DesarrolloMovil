import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'listar',
    loadComponent: () => import('./pages/listar/listar.page').then( m => m.ListarPage)
  },
  {
    path: 'agregar',
    loadComponent: () => import('./pages/agregar/agregar.page').then( m => m.AgregarPage)
  },
  {
    path: 'detalle',
    loadComponent: () => import('./pages/detalle/detalle.page').then( m => m.DetallePage)
  },
  {
    path: 'detalle/:id',
    loadComponent: () => import('./pages/detalle/detalle.page').then( m => m.DetallePage)
  },
];
