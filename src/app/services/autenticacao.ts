import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, startWith } from 'rxjs/operators';
import { UsuarioService } from './usuario';
import { EmailService } from './email';
import { Auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from '@angular/fire/auth';

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
		private plataforma: Platform,
		private servicoUsuario: UsuarioService,
		private servicoEmail: EmailService,
		private auth: Auth
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
					const ref = this.afs.firestore.doc(`usuarios/${usuario.uid}`);
					const unsubscribe = ref.onSnapshot(
						(snap: any) => {
							const dadosDb = snap.exists ? snap.data() : {} as any;
							subscriber.next(this.mesclarUsuarioComBanco(usuario as any, dadosDb || {}));
						},
						() => subscriber.next(base)
					);
					return () => unsubscribe();
				}).pipe(
					startWith(base),
					catchError(() => of(base))
				);
			})
		);
	}

	obterUsuarioAtualPromise(): Promise<Usuario | null> {
		return this.afAuth.currentUser.then(async usuario => {
			if (!usuario) return null;
			const docRef = this.afs.firestore.doc(`usuarios/${usuario.uid}`);
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

			await this.servicoUsuario.criarOuAtualizarDocumento(credencial.user as any);

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
			const provedor = new GoogleAuthProvider();
			await setPersistence(this.auth, browserLocalPersistence);
			let usuarioFirebase: any = null;
			if (this.plataforma.is('capacitor') || this.plataforma.is('android') || this.plataforma.is('ios')) {
				await signInWithRedirect(this.auth, provedor);
				const resultado = await getRedirectResult(this.auth);
				usuarioFirebase = resultado?.user as any;
			} else {
				const resultado = await signInWithPopup(this.auth, provedor);
				usuarioFirebase = resultado.user as any;
			}

			if (!usuarioFirebase) {
				throw new Error('Falha no login com Google');
			}

			await this.servicoUsuario.criarOuAtualizarDocumento(usuarioFirebase as any);
			return this.mapearUsuarioFirebase(usuarioFirebase as any);
		} catch (erro) {
			console.error('Erro no login com Google:', erro);
			throw erro;
		}
	}

	async enviarVerificacaoEmail(): Promise<void> {
		await this.servicoEmail.enviarVerificacaoEmail();
	}

	async enviarEmailRedefinicaoSenha(email: string): Promise<void> {
		return this.servicoEmail.enviarEmailRedefinicaoSenha(email);
	}

	async deslogar(): Promise<void> {
		await this.afAuth.signOut();
		this.roteador.navigateByUrl('/registrar', { replaceUrl: true });
	}

	private mapearUsuarioFirebase(usuarioFirebase: any): Usuario {
		return {
			uid: usuarioFirebase.uid,
			email: usuarioFirebase.email || '',
			nomeExibicao: usuarioFirebase.displayName || '',
			fotoUrl: usuarioFirebase.photoURL || '',
			emailVerificado: usuarioFirebase.emailVerified,
			dadosProvedores: usuarioFirebase.providerData || []
		};
	}

	private mesclarUsuarioComBanco(usuarioFirebase: any, dadosDb: any): Usuario {
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

	private ehUsuarioGoogle(usuario: any): boolean {
		return usuario.providerData?.some((provedor: any) => provedor?.providerId === 'google.com') || false;
	}
}
