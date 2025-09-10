import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, startWith } from 'rxjs/operators';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { Usuario, UsuarioService } from './usuario';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private roteador: Router,
    private plataforma: Platform,
    private usuarioService: UsuarioService,
  ) {
    this.afAuth.authState.subscribe(usuario => {
      if (usuario) {
        const caminhoAtual = this.roteador.url;

        if ((usuario.emailVerified || this.ehUsuarioGoogle(usuario)) &&
            (caminhoAtual === '/registrar' || caminhoAtual === '/')) {
          this.roteador.navigateByUrl('/home', { replaceUrl: true });
        } else if (!usuario.emailVerified && !this.ehUsuarioGoogle(usuario) &&
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

  async logarComEmailSenha(email: string, senha: string) {
    const credencial = await this.afAuth.signInWithEmailAndPassword(email, senha);
    if (!credencial.user) throw new Error('Falha no login');
    return this.usuarioService.obterUsuario(credencial.user.uid);
  }

  async criarUsuarioComEmailSenha(email: string, senha: string) {
    const credencial = await this.afAuth.createUserWithEmailAndPassword(email, senha);
    if (!credencial.user) throw new Error('Falha no cadastro');
    await this.criarDocumentoUsuario(credencial.user);
    return this.usuarioService.obterUsuario(credencial.user.uid);
  }

  async logarComGoogle() {
    const provedor = new firebase.auth.GoogleAuthProvider();
    provedor.addScope('email');
    provedor.addScope('profile');

    let resultado;
    if (this.plataforma.is('capacitor') || this.plataforma.is('android') || this.plataforma.is('ios')) {
      resultado = await this.afAuth.signInWithRedirect(provedor);
    } else {
      resultado = await this.afAuth.signInWithPopup(provedor);
    }

    let usuarioFirebase
    if (resultado != null ) {
      usuarioFirebase = resultado.user;
    }
    if (!usuarioFirebase) throw new Error('Falha no login com Google');

    await this.criarDocumentoUsuario(usuarioFirebase);
    return this.usuarioService.obterUsuario(usuarioFirebase.uid);
  }

  async enviarVerificacaoEmail(): Promise<void> {
    const usuario = await this.afAuth.currentUser;
    if (!usuario) throw new Error('Nenhum usuário logado');
    await usuario.sendEmailVerification({
      url: `${window.location.origin}/registrar`,
      handleCodeInApp: true
    } as any);
  }

  async enviarEmailRedefinicaoSenha(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  async deslogar(): Promise<void> {
    await this.afAuth.signOut();
    this.roteador.navigateByUrl('/registrar', { replaceUrl: true });
  }

  private async criarDocumentoUsuario(usuarioFirebase: firebase.User): Promise<any> {
    const dadosUsuario: Usuario = {
      uid: usuarioFirebase.uid,
      email: usuarioFirebase.email!,
      emailVerificado: usuarioFirebase.emailVerified,
      apelido: usuarioFirebase.displayName || '',
      avatarUrl: usuarioFirebase.photoURL || '',
      nivelAtual: 1,
      xp: 0,
      fase1Concluida: false,
      fasesHTML: {},
      codigoAtual: '',
      status: 'disponivel',
    };
    return this.usuarioService.criarUsuario(dadosUsuario);
  }

  private mesclarUsuarioComBanco(usuarioFirebase: firebase.User, dadosDb: any): Usuario {
    const base = this.usuarioService.obterUsuario(usuarioFirebase.uid);
    return {
      ...base,
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
