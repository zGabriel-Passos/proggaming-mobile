import { Component, OnInit, ViewChild } from '@angular/core';
import { Feedback, FeedbackService } from '../../services/feedback.service';
import { Observable } from 'rxjs';
import { AlertController, ToastController, IonModal } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireAuth } from '@angular/fire/compat/auth'; // <--- Importe o Auth

@Component({
  selector: 'app-feedbacks',
  templateUrl: 'feedbacks.page.html',
  styleUrls: ['feedbacks.page.scss'],
  standalone: false,
})
export class FeedbacksPage implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  feedbacks: Observable<Feedback[]> | undefined;
  feedbackForm!: FormGroup;
  isEditMode: boolean = false;
  currentFeedbackId: string | null = null;
  pageTitle: string = 'Lista de Feedbacks';
  currentUserId: string | null = null;

  constructor(
    private feedbackService: FeedbackService,
    private alertController: AlertController,
    private toastController: ToastController,
    private fb: FormBuilder,
    private afAuth: AngularFireAuth
  ) { }

  ngOnInit() {
    this.feedbacks = this.feedbackService.getFeedbacks();

    this.afAuth.authState.subscribe(user => {
      this.currentUserId = user ? user.uid : null;
    });

    this.feedbackForm = this.fb.group({
      autor: ['', [Validators.required, Validators.minLength(3)]],
      conteudo: ['', [Validators.required, Validators.minLength(10)]],
      avaliacao: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    });
  }


  async openModalForCreate() {
    if (!this.currentUserId) {
      this.presentToast('Você precisa estar logado para criar um feedback.', 'warning');
      return;
    }
    this.isEditMode = false;
    this.pageTitle = 'Novo Feedback';
    this.feedbackForm.reset({ avaliacao: 5 });
    await this.modal.present();
  }

  async openModalForEdit(feedback: Feedback) {
    if (feedback.userId !== this.currentUserId) {
      this.presentToast('Você não pode editar o feedback de outra pessoa.', 'danger');
      return;
    }
    this.isEditMode = true;
    this.pageTitle = 'Editar Feedback';
    this.currentFeedbackId = feedback.id!;
    this.feedbackForm.patchValue(feedback);
    await this.modal.present();
  }

  cancelModal() {
    this.modal.dismiss(null, 'cancel');
  }

  async submitForm() {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    const feedbackData = this.feedbackForm.value;
    let message = '';

    try {
      if (this.isEditMode && this.currentFeedbackId) {
        await this.feedbackService.updateFeedback(this.currentFeedbackId, feedbackData);
        message = 'Feedback atualizado com sucesso!';
      } else {
        await this.feedbackService.addFeedback(feedbackData);
        message = 'Feedback criado com sucesso!';
      }

      this.presentToast(message, 'success');
      this.modal.dismiss(null, 'confirm');

    } catch (e) {
      console.error('Erro ao salvar feedback:', e);
      this.presentToast('Erro ao salvar feedback. Verifique seu login.', 'danger');
    }
  }

  async confirmarExclusao(feedback: Feedback) {
    if (feedback.userId !== this.currentUserId) {
      this.presentToast('Você não pode excluir o feedback de outra pessoa.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza de que deseja excluir este feedback?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Excluir', handler: () => { this.excluirFeedback(feedback.id!); } },
      ],
    });
    await alert.present();
  }

  async excluirFeedback(id: string) {
    try {
      await this.feedbackService.deleteFeedback(id);
      this.presentToast('Feedback excluído com sucesso!', 'success');
    } catch (e) {
      this.presentToast('Erro ao excluir feedback. Verifique seu login.', 'danger');
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
    });
    toast.present();
  }
}