import { Component } from '@angular/core';
import { AutenticacaoService } from './services/autenticacao';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(public autenticacaoService: AutenticacaoService) {}
}
