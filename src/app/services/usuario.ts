import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Usuario {
  uid: string;
  email: string;
  apelido?: string;
  avatarUrl?: string;
  emailVerificado: boolean;
  nivelAtual?: number;
  xp?: number;
  fase1Concluida?: boolean;
  fasesHTML?: any;
  fase1?: any;
  fase2?: any;
  codigoAtual?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
constructor(private firestore: Firestore){}

  obterUsuario(uid: string): Observable<Usuario> {
    const usuarioDocRef = doc(this.firestore, `usuarios/${uid}`)
    return docData(usuarioDocRef) as Observable<Usuario>;
  }

  criarUsuario(usuario: Usuario) {
    const usuarioCollectionRef = collection(this.firestore, 'usuarios');
    return addDoc(usuarioCollectionRef, { ...usuario, createdAt: Date.now() });
  }

  deletarusuario(uid: string) {
    const usuarioDocRef = doc(this.firestore, `usuarios/${uid}`);
    return deleteDoc(usuarioDocRef);
  }
}
