import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AutenticacaoService } from '../services/autenticacao';
import { UsuarioDados } from '../services/usuario';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  usuario: UsuarioDados | null = null;
  private subUsuario?: Subscription;

  constructor(private autenticacaoService: AutenticacaoService, private router: Router) {}

  async ngOnInit() {
    this.subUsuario = this.autenticacaoService.obterUsuarioAtual().subscribe(u => {
      this.usuario = u;
      console.log('[Home] Usuario atualizado:', u);
    });
  }

  editarPerfil() {
    this.router.navigateByUrl('/editar-perfil');
  }

  instalarAplicativo() {
    console.log('Em desenvolvimento');
  }

  ngOnDestroy(): void {
    this.subUsuario?.unsubscribe();
  }
}
