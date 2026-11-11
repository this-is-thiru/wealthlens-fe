import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { AddCorporateActionComponent } from './add-corporate-action.component';
import { CorporateActionService } from '../../services/corporate-action.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';

describe('AddCorporateActionComponent', () => {
  let component: AddCorporateActionComponent;
  let fixture: ComponentFixture<AddCorporateActionComponent>;
  let mockCorporateActionService: MockedObject<CorporateActionService>;

  beforeEach(async () => {
    mockCorporateActionService = {
      addCorporateAction: vi
        .fn()
        .mockName('CorporateActionService.addCorporateAction'),
      getAllCorporateActions: vi
        .fn()
        .mockName('CorporateActionService.getAllCorporateActions'),
    } as unknown as MockedObject<CorporateActionService>;
    mockCorporateActionService.addCorporateAction.mockReturnValue(of('ok'));
    mockCorporateActionService.getAllCorporateActions.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        AddCorporateActionComponent,
        CommonModule,
        FormsModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
      ],
      providers: [
        {
          provide: CorporateActionService,
          useValue: mockCorporateActionService,
        },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCorporateActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync recordDate and executionDate when exDate changes', () => {
    component.onExDateChange('2026-05-28');
    expect(component.recordDate).toBe('2026-05-28');
    expect(component.date).toBe('2026-05-28');
  });

  it('should validate required fields before submitting', () => {
    component.stockCode = '';
    component.submitForm();
    expect(
      mockCorporateActionService.addCorporateAction,
    ).not.toHaveBeenCalled();
  });

  it('should call addCorporateAction API with correct payload on submit', async () => {
    vi.spyOn(component.actionAdded, 'emit');
    component.stockCode = 'RELIANCE';
    component.stockName = 'Reliance Industries Ltd';
    component.type = 'BONUS';
    component.ratio = '1:1';
    component.exDate = '2026-05-28';

    component.submitForm();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(
      mockCorporateActionService.addCorporateAction,
    ).toHaveBeenCalledWith({
      stockCode: 'RELIANCE',
      stockName: 'Reliance Industries Ltd',
      type: 'BONUS',
      assetType: 'EQUITY',
      description: '',
      priority: 0,
      exDate: '2026-05-28',
      recordDate: '2026-05-28',
      date: '2026-05-28',
      ratio: '1:1',
    });
    expect(component.actionAdded.emit).toHaveBeenCalled();
  });

  it('should reject a malformed ratio', () => {
    component.stockCode = 'RELIANCE';
    component.stockName = 'Reliance Industries Ltd';
    component.type = 'BONUS';
    component.ratio = 'one to one';
    component.exDate = '2026-05-28';

    component.submitForm();

    expect(
      mockCorporateActionService.addCorporateAction,
    ).not.toHaveBeenCalled();
    expect(component.validationError).toContain('ratio');
  });

  it('should reject a record date before the ex-date', () => {
    component.stockCode = 'RELIANCE';
    component.stockName = 'Reliance Industries Ltd';
    component.ratio = '1:1';
    component.exDate = '2026-05-28';
    component.recordDate = '2026-05-20';

    component.submitForm();

    expect(
      mockCorporateActionService.addCorporateAction,
    ).not.toHaveBeenCalled();
  });

  it('should open a resulting-company row when switching to demerger', () => {
    component.onTypeChange('DEMERGER');
    expect(component.demergerStocks.length).toBe(1);
  });

  it('should keep the demerger parent in sync with the stock code until edited', () => {
    component.onStockCodeChange('rel');
    expect(component.mainStockCode).toBe('REL');
    component.onStockCodeChange('reliance');
    expect(component.mainStockCode).toBe('RELIANCE');

    component.mainStockCode = 'PARENT';
    component.onStockCodeChange('relianc');
    expect(component.mainStockCode).toBe('PARENT');
  });
});
