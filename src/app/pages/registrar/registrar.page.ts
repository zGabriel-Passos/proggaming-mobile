import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/autenticacao';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { IonHeader } from "@ionic/angular/standalone";

@Component({
  selector: 'app-registrar',
  templateUrl: './registrar.page.html',
  styleUrls: ['./registrar.page.scss'],
  standalone: false,
})
export class RegistrarPage {

  email = '';
  senha = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  async cadastrar() {
    const loading = await this.loadingCtrl.create({ message: 'Cadastrando...' });
    await loading.present();

    try {
      await this.authService.register(this.email, this.senha);
      await loading.dismiss();
      this.presentToast('Cadastro realizado com sucesso!', 'success');
      this.router.navigateByUrl('/login'); // ou /home, dependendo do fluxo
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast('Erro ao cadastrar: ' + error.message, 'danger');
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}