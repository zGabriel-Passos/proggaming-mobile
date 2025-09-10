import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AprenderPage } from './aprender.page';

const routes: Routes = [
  {
    path: '',
    component: AprenderPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AprenderPageRoutingModule {}
