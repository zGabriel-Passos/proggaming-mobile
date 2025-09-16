import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({ providedIn: 'root' })
export class EmailService {
	constructor(private afAuth: AngularFireAuth) {}

	async enviarVerificacaoEmail(urlRetorno?: string): Promise<void> {
		const usuario = await this.afAuth.currentUser;
		if (!usuario) {
			throw new Error('Nenhum usuário logado');
		}

		const actionCodeSettings = {
			url: urlRetorno || (window?.location?.origin ? `${window.location.origin}/registrar` : 'https://proggamingpage.firebaseapp.com/registrar'),
			handleCodeInApp: true
		} as any;

		const tarefa = (async () => {
			try {
				await usuario.reload().catch(() => {});
				await usuario.sendEmailVerification(actionCodeSettings);
			} catch (e) {
				console.warn('Falha ao enviar email de verificação', e);
			}
		})();

		const timeout = new Promise<void>((resolve) => setTimeout(() => resolve(), 8000));
		await Promise.race([tarefa, timeout]);
	}

	async enviarEmailRedefinicaoSenha(email: string): Promise<void> {
		await this.afAuth.sendPasswordResetEmail(email);
	}
}


