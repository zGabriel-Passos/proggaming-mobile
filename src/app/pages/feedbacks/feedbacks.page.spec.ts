import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeedbacksPage } from './feedbacks.page';

describe('FeedbacksPage', () => {
  let component: FeedbacksPage;
  let fixture: ComponentFixture<FeedbacksPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedbacksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
