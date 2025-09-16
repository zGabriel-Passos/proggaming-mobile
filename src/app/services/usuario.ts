import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

export interface UsuarioDados {
	uid: string;
	email: string | null;
	nomeExibicao?: string | null;
	fotoUrl?: string | null;
	emailVerificado: boolean;
	apelido?: string;
	avatarUrl?: string;
	nivelAtual?: number;
	xp?: number;
	fase1Concluida?: boolean;
	fasesHTML?: any;
	fase1?: any;
	fase2?: any;
	codigoAtual?: string;
	status?: string;
	dataCriacao?: any;
	ultimoLogin?: any;
}

@Injectable({
	providedIn: 'root'
})
export class UsuarioService {

	constructor(
		private afs: AngularFirestore
	) {}

	async criarOuAtualizarDocumento(usuarioFirebase: any): Promise<void> {
		const dadosUsuario: UsuarioDados = {
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
			dataCriacao: new Date(),
			ultimoLogin: new Date()
		};

		const tarefa = this.afs.firestore.doc(`usuarios/${usuarioFirebase.uid}`).set(dadosUsuario, { merge: true });
		const timeout = new Promise<void>((resolve) => setTimeout(() => resolve(), 8000));
		await Promise.race([tarefa, timeout]);
	}

	obterReferenciaUsuario(uid: string) {
		return this.afs.firestore.doc(`usuarios/${uid}`);
	}
}
