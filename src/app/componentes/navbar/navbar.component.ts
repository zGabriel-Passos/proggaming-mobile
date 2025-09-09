import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false
})
export class NavbarComponent  implements OnInit {
  @Input() titulo: string = 'Proggaming';

  constructor() { }

  ngOnInit() {}

  voltar() {
    history.back();
  }

}
