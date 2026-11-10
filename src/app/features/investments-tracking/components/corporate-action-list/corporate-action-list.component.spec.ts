import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { CorporateActionListComponent } from './corporate-action-list.component';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '@services/auth.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

describe('CorporateActionListComponent', () => {
  let component: CorporateActionListComponent;
  let fixture: ComponentFixture<CorporateActionListComponent>;
  let mockCorporateActionService: MockedObject<CorporateActionService>;
  let mockAuthService: MockedObject<AuthService>;
  let mockConfirmDialog: MockedObject<ConfirmDialogService>;

  beforeEach(async () => {
    mockCorporateActionService = {
      getAllCorporateActions: vi
        .fn()
        .mockName('CorporateActionService.getAllCorporateActions'),
      getCorporateActionById: vi
        .fn()
        .mockName('CorporateActionService.getCorporateActionById'),
      deleteCorporateAction: vi
        .fn()
        .mockName('CorporateActionService.deleteCorporateAction'),
      updateCorporateActionPriority: vi
        .fn()
        .mockName('CorporateActionService.updateCorporateActionPriority'),
      performSingleCorporateAction: vi
        .fn()
        .mockName('CorporateActionService.performSingleCorporateAction'),
    } as unknown as MockedObject<CorporateActionService>;
    mockCorporateActionService.getAllCorporateActions.mockReturnValue(
      of([
        {
          id: '100',
          stockCode: 'DUMMY',
          stockName: 'Dummy stock',
          type: 'STOCK_SPLIT',
          ratio: '1:2',
          exDate: '2024-10-27',
          recordDate: '2024-10-27',
        },
      ]),
    );
    mockCorporateActionService.getCorporateActionById.mockReturnValue(
      of({
        id: '100',
        stockCode: 'DUMMY',
        stockName: 'Dummy stock',
        type: 'STOCK_SPLIT',
        ratio: '1:2',
        exDate: '2024-10-27',
        recordDate: '2024-10-27',
        description: 'Mock detail',
      }),
    );
    mockCorporateActionService.deleteCorporateAction.mockReturnValue(
      of('deleted'),
    );
    mockCorporateActionService.updateCorporateActionPriority.mockReturnValue(
      of('updated'),
    );
    mockCorporateActionService.performSingleCorporateAction.mockReturnValue(
      of('applied'),
    );
    mockConfirmDialog = {
      confirm: vi.fn().mockName('ConfirmDialogService.confirm'),
      request: (() => null) as any,
    } as unknown as MockedObject<ConfirmDialogService>;

    mockAuthService = {
      getUserEmail: vi.fn().mockName('AuthService.getUserEmail'),
      getUserRole: vi.fn().mockName('AuthService.getUserRole'),
      isAdmin: vi.fn().mockName('AuthService.isAdmin'),
      isSuperUserRole: vi.fn().mockName('AuthService.isSuperUserRole'),
    } as unknown as MockedObject<AuthService>;
    mockAuthService.getUserEmail.mockReturnValue('user@example.com');
    mockAuthService.isAdmin.mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [
        CorporateActionListComponent,
        CommonModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
      ],
      providers: [
        {
          provide: CorporateActionService,
          useValue: mockCorporateActionService,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CorporateActionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load actions on init', () => {
    expect(component).toBeTruthy();
    expect(
      mockCorporateActionService.getAllCorporateActions,
    ).toHaveBeenCalled();
    expect(component.actions.length).toBe(1);
    expect(component.actions[0].stockCode).toBe('DUMMY');
  });

  it('should load corporate action detail and display modal on viewDetails', () => {
    component.viewDetails(component.actions[0]);

    expect(component.showDetailModal).toBe(true);
    expect(
      mockCorporateActionService.getCorporateActionById,
    ).toHaveBeenCalledWith('100');
    expect(component.selectedAction.description).toBe('Mock detail');
    expect(component.isDetailLoading).toBe(false);
    expect(component.detailIsPartial).toBe(false);
  });

  it('should fall back to the list row when the detail call fails', () => {
    mockCorporateActionService.getCorporateActionById.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    component.viewDetails(component.actions[0]);

    expect(component.selectedAction.stockCode).toBe('DUMMY');
    expect(component.detailIsPartial).toBe(true);
    expect(component.isDetailLoading).toBe(false);
  });

  it('should delete by id once confirmed', async () => {
    mockAuthService.isSuperUserRole.mockReturnValue(true);
    mockConfirmDialog.confirm.mockResolvedValue(true);

    await component.deleteAction(component.actions[0]);

    expect(
      mockCorporateActionService.deleteCorporateAction,
    ).toHaveBeenCalledWith('100');
    expect(component.deletingId).toBeNull();
  });

  it('should not delete when the dialog is cancelled', async () => {
    mockAuthService.isSuperUserRole.mockReturnValue(true);
    mockConfirmDialog.confirm.mockResolvedValue(false);

    await component.deleteAction(component.actions[0]);

    expect(
      mockCorporateActionService.deleteCorporateAction,
    ).not.toHaveBeenCalled();
  });

  it('should not delete without the super user role', async () => {
    mockAuthService.isSuperUserRole.mockReturnValue(false);

    await component.deleteAction(component.actions[0]);

    expect(mockConfirmDialog.confirm).not.toHaveBeenCalled();
    expect(
      mockCorporateActionService.deleteCorporateAction,
    ).not.toHaveBeenCalled();
  });

  it('should reject an out-of-range priority without calling the API', () => {
    component.startEditPriority(component.actions[0]);
    component.editPriorityValue = -1;

    component.savePriority(component.actions[0]);

    expect(
      mockCorporateActionService.updateCorporateActionPriority,
    ).not.toHaveBeenCalled();
  });

  it('should save a new priority', () => {
    component.startEditPriority(component.actions[0]);
    component.editPriorityValue = 3;

    component.savePriority(component.actions[0]);

    expect(
      mockCorporateActionService.updateCorporateActionPriority,
    ).toHaveBeenCalledWith('100', 3);
    expect(component.actions[0].priority).toBe(3);
    expect(component.editingPriorityId).toBeNull();
  });

  it('should emit actionExecuted after applying a symbol change', async () => {
    mockConfirmDialog.confirm.mockResolvedValue(true);
    vi.spyOn(component.actionExecuted, 'emit');

    await component.executeSingleAction({
      id: '200',
      stockCode: 'OLD',
      toStockCode: 'NEW',
      type: 'NAME_OR_SYMBOL_CHANGE',
    });

    expect(
      mockCorporateActionService.performSingleCorporateAction,
    ).toHaveBeenCalled();
    expect(component.actionExecuted.emit).toHaveBeenCalled();
  });

  it('should filter by search text and type', () => {
    component.searchQuery = 'nothing-matches';
    component.applyFilters();
    expect(component.filteredActions.length).toBe(0);
    expect(component.hasFilters).toBe(true);

    component.resetFilters();
    expect(component.filteredActions.length).toBe(1);
    expect(component.hasFilters).toBe(false);
  });

  it('should step through actions with prev/next and the arrow keys', () => {
    mockCorporateActionService.getCorporateActionById.mockImplementation(
      (id: string) => of({ id }),
    );
    component.actions = [
      { id: '1', stockCode: 'A', type: 'BONUS', ratio: '1:1' },
      { id: '2', stockCode: 'B', type: 'BONUS', ratio: '1:1' },
    ];
    component.applyFilters();

    component.viewDetails(component.filteredActions[0]);
    expect(component.selectedIndex).toBe(0);

    component.showAdjacent(1);
    expect(component.selectedAction.id).toBe('2');

    component.showAdjacent(1); // already at the end
    expect(component.selectedAction.id).toBe('2');

    component.onDetailKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowLeft' }),
    );
    expect(component.selectedAction.id).toBe('1');
  });

  it('should show the list row immediately and compute its effect', () => {
    component.viewDetails(component.actions[0]);
    expect(component.selectedEffect?.after[0].shares).toBe(200);
    expect(component.selectedTimeline.map((s) => s.label)).toEqual([
      'Ex-date',
      'Record date',
    ]);
  });

  it('should clear detail state on close', () => {
    component.viewDetails(component.actions[0]);
    component.closeModal();
    expect(component.showDetailModal).toBe(false);
    expect(component.selectedEffect).toBeNull();
  });
});
