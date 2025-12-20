import { Injectable } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, set, get } from 'firebase/database';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private db: any;

  constructor() {
    try {
      if (!getApps().length) {
        initializeApp(environment.firebaseConfig);
      }
      this.db = getDatabase();
    } catch (e) {
      console.warn('Firebase initialization error:', e);
    }
  }

  // Utilidades de hashing (SHA-256 con salt)
  private generateSalt(bytes: number = 16): string {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    // base64 simple
    let s = '';
    for (let i = 0; i < array.length; i++) s += String.fromCharCode(array[i]);
    return btoa(s);
  }

  private async sha256Hex(text: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    return this.sha256Hex(`${salt}:${password}`);
  }

  // Guarda un usuario bajo /users (push)
  async saveUser(user: { name: string; email: string; password: string }): Promise<void> {
    if (!this.db) throw new Error('Database no inicializada');
    const usersRef = ref(this.db, 'users');
    const newRef = push(usersRef);
    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(user.password, salt);
    await set(newRef, {
      name: user.name,
      email: user.email,
      passwordHash,
      passwordSalt: salt,
    });
  }

  // Valida credenciales: devuelve el usuario si email+password coinciden, o null
  async validateUser(email: string, password: string): Promise<{ name: string; email: string } | null> {
    if (!this.db) throw new Error('Database no inicializada');
    const snapshot = await get(ref(this.db, 'users'));
    if (!snapshot.exists()) return null;
    const usersObj = snapshot.val();
    for (const key of Object.keys(usersObj || {})) {
      const u = usersObj[key];
      if (!u || u.email !== email) continue;
      // Compatibilidad: si existe hash+salt, validar con hash; si no, comparar plano (usuarios antiguos)
      if (u.passwordHash && u.passwordSalt) {
        const check = await this.hashPassword(password, String(u.passwordSalt));
        if (check === String(u.passwordHash)) {
          return { name: u.name, email: u.email };
        }
      } else if (u.password && u.password === password) {
        return { name: u.name, email: u.email };
      }
    }
    return null;
  }

  // Actualiza la contraseña del usuario identificado por email.
  // Devuelve true si se actualizó en la base de datos, false si el usuario no existe.
  async updatePasswordByEmail(email: string, newPassword: string): Promise<boolean> {
    if (!this.db) throw new Error('Database no inicializada');
    const snapshot = await get(ref(this.db, 'users'));
    if (!snapshot.exists()) return false;
    const usersObj = snapshot.val();
    for (const key of Object.keys(usersObj || {})) {
      const u = usersObj[key];
      if (u && u.email === email) {
        // Generar nuevo salt y hash
        const salt = this.generateSalt();
        const passwordHash = await this.hashPassword(newPassword, salt);
        // Actualizar campos de seguridad
        await set(ref(this.db, `users/${key}/passwordHash`), passwordHash);
        await set(ref(this.db, `users/${key}/passwordSalt`), salt);
        // Opcional: eliminar el campo password plano si existiera
        try {
          const { remove } = await import('firebase/database');
          await remove(ref(this.db, `users/${key}/password`));
        } catch {}
        return true;
      }
    }
    return false;
  }

  // Comprueba si un email ya está registrado en /users
  async isEmailRegistered(email: string): Promise<boolean> {
    if (!this.db) throw new Error('Database no inicializada');
    const snapshot = await get(ref(this.db, 'users'));
    if (!snapshot.exists()) return false;
    const usersObj = snapshot.val();
    const users = Object.values(usersObj || {}) as Array<any>;
    return users.some(u => u && u.email === email);
  }

  // Obtiene todos los libros del usuario (agrupados bajo /books/{email})
  async getUserBooks(email: string): Promise<Array<any>> {
    if (!this.db) throw new Error('Database no inicializada');
    const snapshot = await get(ref(this.db, `books/${this.sanitizeKey(email)}`));
    if (!snapshot.exists()) return [];
    const obj = snapshot.val();
    const list: Array<any> = Object.values(obj || {});
    // Opcional: deduplicar por ISBN
    const seen = new Set<string>();
    const result: Array<any> = [];
    for (const item of list) {
      const isbn = (item && item.isbn) ? String(item.isbn) : '';
      if (!isbn || !seen.has(isbn)) {
        seen.add(isbn);
        result.push(item);
      }
    }
    return result;
  }

  // Guarda/actualiza un libro para el usuario, usando ISBN como clave única
  async saveUserBook(email: string, book: any): Promise<void> {
    if (!this.db) throw new Error('Database no inicializada');
    const isbnRaw = String(book?.isbn || '').trim();
    const isbnDigits = isbnRaw.replace(/[^0-9]/g, '');
    if (!isbnDigits || isbnDigits.length !== 13) {
      throw new Error('ISBN inválido: se requieren 13 dígitos');
    }
    const keyEmail = this.sanitizeKey(email);
    const bookRef = ref(this.db, `books/${keyEmail}/${isbnDigits}`);
    // No persistir la imagen ni el color en Firebase: mantenerlos solo en localStorage/UI
    const { image, color, ...rest } = book || {};
    await set(bookRef, { ...rest, isbn: isbnDigits });
  }

  // Elimina un libro del usuario por ISBN
  async deleteUserBook(email: string, isbn: string): Promise<void> {
    if (!this.db) throw new Error('Database no inicializada');
    const isbnDigits = String(isbn || '').replace(/[^0-9]/g, '');
    if (!isbnDigits || isbnDigits.length !== 13) {
      throw new Error('ISBN inválido: se requieren 13 dígitos');
    }
    const keyEmail = this.sanitizeKey(email);
    const bookRef = ref(this.db, `books/${keyEmail}/${isbnDigits}`);
    const { remove } = await import('firebase/database');
    await remove(bookRef);
  }

  private sanitizeKey(email: string): string {
    // Firebase Realtime Database no permite los caracteres . # $ [ ] /
    // Reemplazamos cualquier carácter inválido por guiones bajos para claves seguras
    return String(email)
      .trim()
      .replace(/[.#$\[\]\/]/g, '_')
      .replace(/\s+/g, '_');
  }

  // Elimina el usuario por email en Realtime Database. Devuelve true si se eliminó.
  async deleteUserByEmail(email: string): Promise<boolean> {
    if (!this.db) throw new Error('Database no inicializada');
    const snapshot = await get(ref(this.db, 'users'));
    if (!snapshot.exists()) return false;
    const usersObj = snapshot.val();
    for (const key of Object.keys(usersObj || {})) {
      const u = usersObj[key];
      if (u && u.email === email) {
        const { remove } = await import('firebase/database');
        await remove(ref(this.db, `users/${key}`));
        return true;
      }
    }
    return false;
  }
}
