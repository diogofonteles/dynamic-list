import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

@Component({
  selector: 'app-root',
  imports: [AppComponent],
  template: `
  <app-list-root></app-list-root>
  `,
})
export class App {
  name = 'Angular';
}

bootstrapApplication(App);
