import { Component, OnInit, OnDestroy } from '@angular/core';
import { AutenticacaoService, Usuario } from '../services/autenticacao';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  usuario: Usuario | null = null;
  private subUsuario?: Subscription;

  constructor(private autenticacaoService: AutenticacaoService) {}

  async ngOnInit() {
    this.subUsuario = this.autenticacaoService.obterUsuarioAtual().subscribe(u => {
      this.usuario = u;
      console.log('[Home] Usuario atualizado:', u);
    });
  }

  editarPerfil() {
    console.log('Abrir modal para editar perfil...');
  }

  instalarAplicativo() {
    console.log('Instalar PWA...');
  }

  ngOnDestroy(): void {
    this.subUsuario?.unsubscribe();
  }
}
