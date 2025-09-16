import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
	ToastController,
	LoadingController,
	AlertController,
	ModalController,
	MenuController
} from '@ionic/angular';
import { AutenticacaoService } from '../../services/autenticacao';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-registrar',
	templateUrl: './registrar.page.html',
	styleUrls: ['./registrar.page.scss'],
	standalone: false,
})
export class RegistrarPage implements OnInit, OnDestroy {
	email = '';
	senha = '';
	eLogin = true;
	get ehLogin(): boolean { return this.eLogin; }
	carregando = false;
	mensagemErro = '';
	mostrarOverlayCarregamento = true;
	mostrarModalBemVindo = false;

	private inscricaoAuth?: Subscription;
	private timerBemVindo?: any;

	constructor(
		private servicoAuth: AutenticacaoService,
		private roteador: Router,
		private toastCtrl: ToastController,
		private loadingCtrl: LoadingController,
		private alertCtrl: AlertController,
		private modalCtrl: ModalController,
		private menuCtrl: MenuController
	) {}

	async ionViewWillEnter() {
		await this.menuCtrl.enable(false);
	}

	async ionViewDidLeave() {
		await this.menuCtrl.enable(true);
	}

	ngOnInit() {
		setTimeout(() => {
			this.mostrarOverlayCarregamento = false;
			this.verificarModalBemVindo();
		}, 1000);

		this.inscricaoAuth = this.servicoAuth.obterUsuarioAtual().subscribe(usuario => {
			if (usuario && (usuario.emailVerificado || this.ehUsuarioGoogle(usuario))) {
				this.roteador.navigateByUrl('/home', { replaceUrl: true });
			} else if (usuario && !usuario.emailVerificado) {
				this.servicoAuth.deslogar();
			}
		});
	}

	ngOnDestroy() {
		if (this.inscricaoAuth) {
			this.inscricaoAuth.unsubscribe();
		}
		if (this.timerBemVindo) {
			clearTimeout(this.timerBemVindo);
		}
	}

	verificarModalBemVindo() {
		const intervalo = 5 * 60 * 1000;
		const delayPrimeiraExibicao = 10000;
		const ultimaExibicao = Number(localStorage.getItem('ultimaExibicaoBemVindo') || 0);
		const agora = Date.now();

		if (!ultimaExibicao || (agora - ultimaExibicao) > intervalo) {
			this.timerBemVindo = setTimeout(() => {
				this.mostrarModalBemVindo = true;
				localStorage.setItem('ultimaExibicaoBemVindo', String(Date.now()));
			}, delayPrimeiraExibicao);
		}
	}

	fecharModalBemVindo() {
		this.mostrarModalBemVindo = false;
	}

	alternarModoAuth() {
		this.eLogin = !this.eLogin;
		this.mensagemErro = '';
		this.email = '';
		this.senha = '';
	}

	async processarAuth() {
		if (!this.email || !this.senha) {
			this.mensagemErro = 'Por favor, preencha todos os campos.';
			this.mostrarModalBemVindo = true
			return;
		}

		this.carregando = true;
		this.mensagemErro = '';

		try {
			if (this.eLogin) {
				await this.fazerLogin();
			} else {
				await this.cadastrar();
			}
		} catch (erro: any) {
			this.mensagemErro = this.obterMensagemErro(erro?.code) || (erro?.message || 'Ocorreu um erro. Tente novamente.');
			this.apresentarToastErro(this.mensagemErro);
		} finally {
			this.carregando = false;
		}
	}

	private async fazerLogin() {
		const usuario = await this.servicoAuth.logarComEmailSenha(this.email, this.senha);

		if (usuario?.emailVerificado) {
			this.apresentarToastSucesso('Login realizado com sucesso!');
			this.roteador.navigateByUrl('/home', { replaceUrl: true });
		} else {
			this.mensagemErro = 'Verifique seu e-mail antes de continuar, cheque o spam do seu email.';
			try {
				await this.servicoAuth.enviarVerificacaoEmail();
				this.apresentarToastSucesso('E-mail de verificação reenviado. Verifique sua caixa de entrada.');
			} catch {
				this.apresentarToastErro('Falha ao reenviar e-mail de verificação.');
			}
			await this.servicoAuth.deslogar();
		}
	}

	private async cadastrar() {
		const usuario = await this.servicoAuth.criarUsuarioComEmailSenha(this.email, this.senha);

		this.apresentarAlertaSucesso(
			'Conta criada com sucesso!',
			'Você será redirecionado para a tela de login.',
			async () => {
				this.eLogin = true;
				this.senha = '';
				if (usuario) {
					await this.servicoAuth.deslogar();
				}
				this.roteador.navigateByUrl('/registrar', { replaceUrl: true });
			}
		);
	}

	async loginComGoogle() {
		this.carregando = true;

		try {
			await this.servicoAuth.logarComGoogle();
			this.apresentarToastSucesso('Login com Google realizado com sucesso!');
			this.roteador.navigateByUrl('/home', { replaceUrl: true });
		} catch (erro: any) {
			this.mensagemErro = this.obterMensagemErro(erro.code);
			this.apresentarToastErro(this.mensagemErro);
		} finally {
			this.carregando = false;
		}
	}

	async redefinirSenha() {
		if (!this.email) {
			this.mensagemErro = 'Por favor, digite seu e-mail para redefinir a senha.';
			return;
		}

		const carregamento = await this.loadingCtrl.create({
			message: 'Enviando e-mail...'
		});
		await carregamento.present();

		try {
			await this.servicoAuth.enviarEmailRedefinicaoSenha(this.email);
			await carregamento.dismiss();

			this.apresentarAlertaSucesso(
				'E-mail enviado!',
				'Verifique sua caixa de entrada para redefinir sua senha. Não esqueça de verificar a pasta de spam.'
			);
		} catch (erro: any) {
			await carregamento.dismiss();
			this.mensagemErro = this.obterMensagemErro(erro.code);
			this.apresentarToastErro(this.mensagemErro);
		}
	}

	private ehUsuarioGoogle(usuario: any): boolean {
		return usuario.dadosProvedores?.some((provedor: any) => (provedor?.providerId || provedor?.idProvedor) === 'google.com');
	}

	private obterMensagemErro(codigoErro: string): string {
		const mensagensErro: { [key: string]: string } = {
			'auth/user-not-found': 'Usuário não encontrado.',
			'auth/wrong-password': 'Senha incorreta.',
			'auth/email-already-in-use': 'Este e-mail já está em uso.',
			'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
			'auth/invalid-email': 'E-mail inválido.',
			'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
			'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
			'auth/popup-closed-by-user': 'Login cancelado pelo usuário.',
			'auth/cancelled-popup-request': 'Login cancelado.',
		};

		return mensagensErro[codigoErro] || '';
	}

	private async apresentarToastSucesso(mensagem: string) {
		const toast = await this.toastCtrl.create({
			message: mensagem,
			duration: 3000,
			color: 'success',
			position: 'top'
		});
		await toast.present();
	}

	private async apresentarToastErro(mensagem: string) {
		const toast = await this.toastCtrl.create({
			message: mensagem,
			duration: 4000,
			color: 'danger',
			position: 'top'
		});
		await toast.present();
	}

	private async apresentarAlertaSucesso(cabecalho: string, mensagem: string, aoOk?: () => void) {
		const alerta = await this.alertCtrl.create({
			header: cabecalho,
			message: mensagem,
			buttons: [
				{
					text: 'OK',
					handler: () => {
						if (aoOk) {
							aoOk();
						}
					}
				}
			]
		});
		await alerta.present();
	}
}
