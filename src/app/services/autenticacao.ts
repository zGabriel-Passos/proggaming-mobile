import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, startWith } from 'rxjs/operators';
import * as firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

export interface Usuario {
  uid: string;
  email: string;
  nomeExibicao?: string;
  fotoUrl?: string;
  apelido?: string;
  avatarUrl?: string;
  emailVerificado: boolean;
  dadosProvedores: any[];
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
export class AutenticacaoService {

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private roteador: Router,
    private plataforma: Platform
  ) {
    this.afAuth.authState.subscribe(usuario => {
      if (usuario) {
        const caminhoAtual = this.roteador.url;

        if ((usuario.emailVerified || this.ehUsuarioGoogle(usuario)) &&
            (caminhoAtual === '/registrar' || caminhoAtual === '/')) {
          this.roteador.navigateByUrl('/home', { replaceUrl: true });
        }
        else if (!usuario.emailVerified && !this.ehUsuarioGoogle(usuario) &&
                 caminhoAtual !== '/registrar' && caminhoAtual !== '/') {
          this.roteador.navigateByUrl('/registrar', { replaceUrl: true });
        }
      } else {
        const caminhoAtual = this.roteador.url;
        if (caminhoAtual !== '/registrar' && caminhoAtual !== '/') {
          this.roteador.navigateByUrl('/registrar', { replaceUrl: true });
        }
      }
    });
  }

  obterUsuarioAtual(): Observable<Usuario | null> {
    return this.afAuth.authState.pipe(
      switchMap(usuario => {
        if (!usuario) {
          return of(null);
        }
        const base = this.mapearUsuarioFirebase(usuario);
        return new Observable<Usuario>(subscriber => {
          const ref = firebase.firestore().doc(`usuarios/${usuario.uid}`);
          const unsubscribe = ref.onSnapshot(
            snap => {
              const dadosDb = snap.exists ? snap.data() : {} as any;
              subscriber.next(this.mesclarUsuarioComBanco(usuario, dadosDb));
            },
            erro => {
              console.error('Firestore listener error:', erro);
              subscriber.next(base);
            }
          );
          return () => unsubscribe();
        }).pipe(startWith(base), catchError(() => of(base)));
      })
    );
  }

  obterUsuarioAtualPromise(): Promise<Usuario | null> {
    return this.afAuth.currentUser.then(async usuario => {
      if (!usuario) return null;
      const docRef = this.afs.doc(`usuarios/${usuario.uid}`).ref;
      const snap = await docRef.get();
      const dadosDb = snap.exists ? snap.data() : {};
      return this.mesclarUsuarioComBanco(usuario, dadosDb || {});
    });
  }

  async logarComEmailSenha(email: string, senha: string): Promise<Usuario> {
    try {
      const credencial = await this.afAuth.signInWithEmailAndPassword(email, senha);
      if (!credencial.user) {
        throw new Error('Falha no login');
      }
      return this.mapearUsuarioFirebase(credencial.user);
    } catch (erro) {
      console.error('Erro ao fazer login:', erro);
      throw erro;
    }
  }

  async criarUsuarioComEmailSenha(email: string, senha: string): Promise<Usuario> {
    try {
      const credencial = await this.afAuth.createUserWithEmailAndPassword(email, senha);
      if (!credencial.user) {
        throw new Error('Falha no cadastro');
      }

      await this.criarDocumentoUsuario(credencial.user);

      return this.mapearUsuarioFirebase(credencial.user);
    } catch (erro: any) {
      if (erro?.code === 'auth/email-already-in-use') {
      }
      console.error('Erro ao criar usuário:', erro);
      throw erro;
    }
  }

  async logarComGoogle(): Promise<Usuario> {
    try {
      const auth = getAuth();
      const provedor = new GoogleAuthProvider();
      provedor.addScope('email');
      provedor.addScope('profile');

      await setPersistence(auth, browserLocalPersistence);

      let usuarioFirebase: firebase.User | null = null;

      if (this.plataforma.is('capacitor') || this.plataforma.is('android') || this.plataforma.is('ios')) {
        await signInWithRedirect(auth, provedor);
        const resultado = await getRedirectResult(auth);
        usuarioFirebase = resultado?.user as any;
      } else {
        const resultado = await signInWithPopup(auth, provedor);
        usuarioFirebase = resultado.user as any;
      }

      if (!usuarioFirebase) {
        throw new Error('Falha no login com Google');
      }

      await this.criarDocumentoUsuario(usuarioFirebase as any);
      return this.mapearUsuarioFirebase(usuarioFirebase as any);
    } catch (erro) {
      console.error('Erro no login com Google:', erro);
      throw erro;
    }
  }

  async enviarVerificacaoEmail(): Promise<void> {
    const usuario = await this.afAuth.currentUser;
    if (!usuario) {
      throw new Error('Nenhum usuário logado');
    }
    try {
      await usuario.reload();
      const actionCodeSettings = {
        url: window?.location?.origin ? `${window.location.origin}/registrar` : 'https://proggamingpage.firebaseapp.com/registrar',
        handleCodeInApp: true
      } as any;
      await usuario.sendEmailVerification(actionCodeSettings);
    } catch (e) {
      console.error('Falha ao enviar email de verificação:', e);
      throw e;
    }
  }

  async enviarEmailRedefinicaoSenha(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  async deslogar(): Promise<void> {
    await this.afAuth.signOut();
    this.roteador.navigateByUrl('/registrar', { replaceUrl: true });
  }

  private async criarDocumentoUsuario(usuarioFirebase: firebase.User): Promise<void> {
    const dadosUsuario = {
      uid: usuarioFirebase.uid,
      email: usuarioFirebase.email,
      nomeExibicao: usuarioFirebase.displayName,
      fotoUrl: usuarioFirebase.photoURL,
      emailVerificado: usuarioFirebase.emailVerified,
      apelido: usuarioFirebase.displayName || '',
      avatarUrl: usuarioFirebase.photoURL || '',
      nivelAtual: 1,
      xp: 0,
      fase1Concluida: false,
      fasesHTML: {},
      codigoAtual: '',
      status: 'disponivel',
      dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
      ultimoLogin: firebase.firestore.FieldValue.serverTimestamp()
    };

    return this.afs.doc(`usuarios/${usuarioFirebase.uid}`).set(dadosUsuario, { merge: true });
  }

  private mapearUsuarioFirebase(usuarioFirebase: firebase.User): Usuario {
    return {
      uid: usuarioFirebase.uid,
      email: usuarioFirebase.email || '',
      nomeExibicao: usuarioFirebase.displayName || '',
      fotoUrl: usuarioFirebase.photoURL || '',
      emailVerificado: usuarioFirebase.emailVerified,
      dadosProvedores: usuarioFirebase.providerData || []
    };
  }

  private mesclarUsuarioComBanco(usuarioFirebase: firebase.User, dadosDb: any): Usuario {
    const base = this.mapearUsuarioFirebase(usuarioFirebase);
    return {
      ...base,
      apelido: dadosDb.apelido ?? base.nomeExibicao ?? '',
      avatarUrl: dadosDb.avatarUrl ?? base.fotoUrl ?? '',
      nivelAtual: dadosDb.nivelAtual ?? 1,
      xp: dadosDb.xp ?? 0,
      fase1Concluida: dadosDb.fase1Concluida ?? false,
      fasesHTML: dadosDb.fasesHTML ?? {},
      fase1: dadosDb.fase1 ?? undefined,
      fase2: dadosDb.fase2 ?? undefined,
      codigoAtual: dadosDb.codigoAtual ?? '',
      status: dadosDb.status ?? undefined
    };
  }

  private ehUsuarioGoogle(usuario: firebase.User): boolean {
    return usuario.providerData?.some(provedor => provedor?.providerId === 'google.com') || false;
  }
}
