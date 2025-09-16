import { Component } from '@angular/core';
import { AutenticacaoService } from '../../services/autenticacao';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UsuarioDados } from 'src/app/services/usuario';

@Component({
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.page.html',
  styleUrls: ['./editar-perfil.page.scss'],
  standalone: false,
})
export class EditarPerfilPage {
  usuario: UsuarioDados | null = null;
  apelido: string = '';
  avatarUrl: string = '';
  avataresDisponiveis = [
    'assets/avatares/avatar.jpg',
    'assets/avatares/avatar2.jpg',
    'assets/avatares/avatar3.jpg',
    'assets/avatares/avatar4.jpg',
    'assets/avatares/avatar5.jpg'
  ];

  constructor(private auth: AutenticacaoService, private afs: AngularFirestore) {
    this.auth.obterUsuarioAtual().subscribe(u => {
      this.usuario = u;
      this.apelido = u?.apelido || '';
      this.avatarUrl = u?.avatarUrl || '';
    });
  }

  async salvar() {
    if (!this.usuario) return;
    try {
      await this.afs.doc(`usuarios/${this.usuario.uid}`).set({ apelido: this.apelido, avatarUrl: this.avatarUrl }, { merge: true });
    } catch (e) {
      console.error('Erro ao salvar perfil:', e);
    }
  }
}

