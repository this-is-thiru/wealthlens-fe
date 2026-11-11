import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { PortfolioAnalyticsComponent } from './portfolio-analytics.component';

describe('PortfolioAnalyticsComponent', () => {
  let component: PortfolioAnalyticsComponent;
  let fixture: ComponentFixture<PortfolioAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioAnalyticsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        providePrimeNG(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
