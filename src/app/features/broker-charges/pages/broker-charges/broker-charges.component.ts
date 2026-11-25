import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { AuthService } from '@core/services/auth.service';
import { BrokerChargesService } from '@features/broker-charges/services/broker-charges.service';
import { extractErrorMessage } from '@core/utils/http-error.util';
import {
  summarizeChargeBreakdown,
  summarizeLedgerDeductibility,
} from '../../utils/charge-deductibility.util';
import {
  AssetType,
  TradeSegment,
  ExchangeName,
  ChargeEvent,
  AmcChargeFrequency,
  ChargeSimulationRequest,
  ChargeBreakdownResponse,
  ChargeCatalogueEntry,
  UserCharge,
  ChargeReconciliationResponse,
  ChargeAccount,
  ChargeSchedule,
  ChargeScheduleDrift,
} from '../../models/broker-charges.model';

@Component({
  selector: 'app-broker-charges',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
    ExpansionPanelComponent,
    FooterComponent,
    BadgeComponent,
    ButtonComponent,
  ],
  templateUrl: './broker-charges.component.html',
  styleUrls: ['./broker-charges.component.css'],
})
export class BrokerChargesComponent implements OnInit {
  private authService = inject(AuthService);
  private chargesService = inject(BrokerChargesService);

  userEmail = this.authService.userEmail;
  isDemo = this.authService.isDemo;

  // View Mode: 'investor' (default) or 'admin'
  viewMode = signal<'investor' | 'admin'>('investor');

  // Expansion Panel States (Expand / Collapse)
  simulatorExpanded = signal<boolean>(true);
  ledgerExpanded = signal<boolean>(true);
  dematExpanded = signal<boolean>(false);

  rateCardsExpanded = signal<boolean>(true);
  amcExpanded = signal<boolean>(false);
  reconExpanded = signal<boolean>(false);

  // Global Notification / Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'info' | 'warning'>('success');

  // ==========================================
  // 1. PRE-TRADE SIMULATOR STATE
  // ==========================================
  simBroker = signal<string>('ZERODHA');
  simAssetType = signal<AssetType>('EQUITY');
  simSegment = signal<TradeSegment>('DELIVERY');
  simExchange = signal<ExchangeName>('NSE');
  simEvent = signal<ChargeEvent>('BUY');
  simStockCode = signal<string>('RELIANCE');
  simTransactionDate = signal<string>(new Date().toISOString().split('T')[0]);
  simQuantity = signal<number>(100);
  simPrice = signal<number>(1500.0);
  simHoldingDays = signal<number>(180);
  isSimulating = signal<boolean>(false);
  simulationResult = signal<ChargeBreakdownResponse | null>(null);

  simDeductibility = computed(() =>
    summarizeChargeBreakdown(
      this.simulationResult()?.lines,
      this.catalogueEntries(),
      {
        quantity: Number(this.simQuantity()) || 0,
        price: Number(this.simPrice()) || 0,
      },
    ),
  );

  contractNoteDeductibility = computed(() =>
    summarizeChargeBreakdown(
      this.selectedContractNote()?.lines,
      this.catalogueEntries(),
    ),
  );

  simGrossTurnover = computed(() => {
    return (this.simQuantity() || 0) * (this.simPrice() || 0);
  });

  simNetTotal = computed(() => {
    const gross = this.simGrossTurnover();
    const charges = this.simulationResult()?.totalCharges || 0;
    return this.simEvent() === 'BUY' ? gross + charges : gross - charges;
  });

  simBreakEven = computed(() => {
    const qty = this.simQuantity() || 1;
    const charges = this.simulationResult()?.totalCharges || 0;
    return charges / qty;
  });

  // ==========================================
  // 2. CHARGES LEDGER & CONTRACT NOTES
  // ==========================================
  ledgerLoading = signal<boolean>(false);
  ledgerCharges = signal<UserCharge[]>([]);
  ledgerGaps = signal<UserCharge[]>([]);
  filterAssetType = signal<string>('ALL');
  filterFromDate = signal<string>('');
  filterToDate = signal<string>('');

  selectedContractNote = signal<ChargeBreakdownResponse | null>(null);
  selectedTxnId = signal<string>('');
  isContractNoteModalOpen = signal<boolean>(false);

  ledgerTotalFees = computed(() => {
    return this.ledgerCharges().reduce(
      (sum, item) => sum + (item.totalCharges || 0),
      0,
    );
  });

  ledgerDeductibility = computed(() =>
    summarizeLedgerDeductibility(this.ledgerCharges(), this.catalogueEntries()),
  );

  ledgerDeductibleFees = computed(() => this.ledgerDeductibility().deductible);

  ledgerNonDeductibleFees = computed(
    () => this.ledgerDeductibility().nonDeductible,
  );

  // ==========================================
  // 3. DEMAT ACCOUNTS STATE
  // ==========================================
  dematAccounts = signal<ChargeAccount[]>([]);
  dematLoading = signal<boolean>(false);
  isAddDematModalOpen = signal<boolean>(false);

  newDematId = signal<string>('');
  newDematBroker = signal<string>('ZERODHA');
  newDematHolder = signal<string>('Primary Account');
  newDematOpenedOn = signal<string>(new Date().toISOString().split('T')[0]);
  newDematFrequency = signal<AmcChargeFrequency>('QUARTERLY');
  newDematPlanCode = signal<string>('STANDARD');

  // ==========================================
  // 4. RATE CARDS & CATALOGUE (ADMIN)
  // ==========================================
  adminBrokerFilter = signal<string>('ZERODHA');
  rateCards = signal<ChargeSchedule[]>([]);
  unverifiedCards = signal<ChargeSchedule[]>([]);
  driftItems = signal<ChargeScheduleDrift[]>([]);
  catalogueEntries = signal<ChargeCatalogueEntry[]>([]);
  rateCardSubTab = signal<'cards' | 'unverified' | 'drift' | 'catalogue'>(
    'cards',
  );
  selectedScheduleForView = signal<ChargeSchedule | null>(null);
  isViewRulesModalOpen = signal<boolean>(false);
  isSeeding = signal<boolean>(false);

  // ==========================================
  // 5. AMC BILLING CONSOLE (ADMIN)
  // ==========================================
  amcFrequency = signal<AmcChargeFrequency>('QUARTERLY');
  amcBilledThrough = signal<string>(new Date().toISOString().split('T')[0]);
  amcDueAccounts = signal<ChargeAccount[]>([]);
  amcBilledResult = signal<ChargeAccount[]>([]);
  amcPreviewLoading = signal<boolean>(false);
  isImposingAmc = signal<boolean>(false);

  // ==========================================
  // 6. AUDIT & RECONCILIATION (ADMIN)
  // ==========================================
  reconEmail = signal<string>('');
  reconLoading = signal<boolean>(false);
  reconciliationData = signal<ChargeReconciliationResponse | null>(null);
  reconFilter = signal<'ALL' | 'DISCREPANCIES' | 'UNRESOLVED'>('ALL');

  filteredReconRows = computed(() => {
    const data = this.reconciliationData();
    if (!data) return [];
    if (this.reconFilter() === 'DISCREPANCIES') {
      return data.rows.filter(
        (r) => r.delta !== undefined && Math.abs(r.delta) > 0.001,
      );
    }
    if (this.reconFilter() === 'UNRESOLVED') {
      return data.rows.filter((r) => r.resolution !== 'RESOLVED');
    }
    return data.rows;
  });

  ngOnInit(): void {
    const email = this.userEmail() || 'demo@wealthlens.com';
    this.reconEmail.set(email);

    this.runSimulation();
    this.loadLedger();
    this.loadDematAccounts();
    this.loadRateCards();
    this.loadCatalogue();
    this.loadReconciliation();
  }

  showToast(
    msg: string,
    type: 'success' | 'info' | 'warning' = 'success',
  ): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  // --- 1. SIMULATOR METHODS ---
  runSimulation(): void {
    const trimmedCode = this.simStockCode().trim();
    if (
      (this.simEvent() === 'BUY' || this.simEvent() === 'SELL') &&
      !trimmedCode
    ) {
      this.showToast(
        'Please enter a stock symbol for BUY/SELL simulation.',
        'warning',
      );
      return;
    }

    const txDate =
      this.simTransactionDate() || new Date().toISOString().split('T')[0];
    this.isSimulating.set(true);
    const req: ChargeSimulationRequest = {
      brokerName: this.simBroker(),
      assetType: this.simAssetType(),
      segment: this.simSegment(),
      exchange: this.simExchange(),
      event: this.simEvent(),
      stockCode: trimmedCode || undefined,
      quantity: Math.max(1, Number(this.simQuantity()) || 1),
      price: Math.max(0, Number(this.simPrice()) || 0),
      transactionDate: txDate,
      lots:
        this.simAssetType() === 'MUTUAL_FUND'
          ? [
              {
                quantity: Math.max(1, Number(this.simQuantity()) || 1),
                price: Math.max(0, Number(this.simPrice()) || 0),
                date: new Date(Date.now() - this.simHoldingDays() * 86400000)
                  .toISOString()
                  .split('T')[0],
              },
            ]
          : undefined,
    };

    this.chargesService.simulateCharges(req).subscribe({
      next: (res) => {
        this.simulationResult.set(res);
        this.isSimulating.set(false);
      },
      error: (err) => {
        this.isSimulating.set(false);
        this.showToast(
          extractErrorMessage(
            err,
            'Could not simulate charges. Please check inputs.',
          ),
          'warning',
        );
      },
    });
  }

  // --- 2. LEDGER METHODS ---
  loadLedger(): void {
    this.ledgerLoading.set(true);
    const email = this.userEmail() || 'demo@wealthlens.com';
    const asset =
      this.filterAssetType() === 'ALL' ? undefined : this.filterAssetType();

    this.chargesService
      .getUserChargeHistory(
        email,
        this.filterFromDate(),
        this.filterToDate(),
        asset,
      )
      .subscribe({
        next: (data) => {
          this.ledgerCharges.set(data);
          this.ledgerLoading.set(false);
        },
        error: (err) => {
          this.ledgerLoading.set(false);
          this.showToast(
            extractErrorMessage(err, 'Could not load charges ledger.'),
            'warning',
          );
        },
      });

    this.chargesService.getUserChargeGaps(email).subscribe({
      next: (gaps) => this.ledgerGaps.set(gaps),
      error: () => this.ledgerGaps.set([]),
    });
  }

  openContractNote(txnId: string): void {
    this.selectedTxnId.set(txnId);
    const email = this.userEmail() || 'demo@wealthlens.com';
    this.chargesService.getContractNote(email, txnId).subscribe({
      next: (note) => {
        this.selectedContractNote.set(note);
        this.isContractNoteModalOpen.set(true);
      },
      error: (err) =>
        this.showToast(
          extractErrorMessage(err, 'Could not load contract note.'),
          'warning',
        ),
    });
  }

  closeContractNote(): void {
    this.isContractNoteModalOpen.set(false);
    this.selectedContractNote.set(null);
  }

  // --- 3. DEMAT ACCOUNTS METHODS ---
  loadDematAccounts(): void {
    this.dematLoading.set(true);
    const email = this.userEmail() || 'demo@wealthlens.com';
    this.chargesService.getUserDematAccounts(email).subscribe({
      next: (accounts) => {
        this.dematAccounts.set(accounts);
        this.dematLoading.set(false);
      },
      error: (err) => {
        this.dematLoading.set(false);
        this.showToast(
          extractErrorMessage(err, 'Could not load linked demat accounts.'),
          'warning',
        );
      },
    });
  }

  openAddDematModal(): void {
    this.isAddDematModalOpen.set(true);
  }

  closeAddDematModal(): void {
    this.isAddDematModalOpen.set(false);
  }

  saveDematAccount(): void {
    if (!this.newDematId()) {
      this.showToast('Please enter a Demat Account ID / BOID', 'warning');
      return;
    }
    const email = this.userEmail() || 'demo@wealthlens.com';
    const acc: Partial<ChargeAccount> = {
      dematAccountId: this.newDematId(),
      brokerName: this.newDematBroker(),
      accountHolder: this.newDematHolder(),
      openedOn: this.newDematOpenedOn(),
      amcFrequency: this.newDematFrequency(),
      planCode: this.newDematPlanCode(),
    };

    this.chargesService.registerDematAccount(email, acc).subscribe({
      next: (saved) => {
        this.dematAccounts.update((list) => [saved, ...list]);
        this.closeAddDematModal();
        this.showToast(
          `Demat account ${saved.dematAccountId} linked successfully!`,
          'success',
        );
        this.newDematId.set('');
      },
      error: (err) =>
        this.showToast(
          extractErrorMessage(err, 'Could not save demat account.'),
          'warning',
        ),
    });
  }

  // --- 4. RATE CARDS METHODS ---
  loadRateCards(): void {
    this.chargesService
      .getChargeSchedulesByBroker(this.adminBrokerFilter())
      .subscribe({
        next: (cards) => this.rateCards.set(cards),
      });
    this.chargesService.getUnverifiedSchedules().subscribe({
      next: (unv) => this.unverifiedCards.set(unv),
    });
    this.chargesService.getScheduleDrift().subscribe({
      next: (drift) => this.driftItems.set(drift),
    });
  }

  loadCatalogue(): void {
    this.chargesService.getChargeCatalogue().subscribe({
      next: (cat) => this.catalogueEntries.set(cat),
    });
  }

  triggerSeed(): void {
    this.isSeeding.set(true);
    this.chargesService.seedCharges().subscribe({
      next: (report) => {
        this.isSeeding.set(false);
        this.showToast(
          `Pricing Seeded: ${report.schedulesWritten} rate cards, ${report.catalogueEntriesWritten} catalogue entries.`,
          'success',
        );
        this.loadRateCards();
      },
      error: (err) => {
        this.isSeeding.set(false);
        this.showToast(
          extractErrorMessage(err, 'Could not seed pricing schedules.'),
          'warning',
        );
      },
    });
  }

  viewScheduleRules(schedule: ChargeSchedule): void {
    this.selectedScheduleForView.set(schedule);
    this.isViewRulesModalOpen.set(true);
  }

  closeViewRulesModal(): void {
    this.isViewRulesModalOpen.set(false);
    this.selectedScheduleForView.set(null);
  }

  retireSchedule(code: string): void {
    const today = new Date().toISOString().split('T')[0];
    this.chargesService.closeSchedule(code, today).subscribe({
      next: () => {
        this.showToast(
          `Schedule ${code} retired with end date ${today}.`,
          'info',
        );
        this.loadRateCards();
      },
      error: (err) =>
        this.showToast(
          extractErrorMessage(err, `Could not retire schedule ${code}.`),
          'warning',
        ),
    });
  }

  // --- 5. AMC BILLING METHODS ---
  previewAmcDue(): void {
    this.amcPreviewLoading.set(true);
    this.chargesService
      .getAmcDue(this.amcFrequency(), this.amcBilledThrough())
      .subscribe({
        next: (accounts) => {
          this.amcDueAccounts.set(accounts);
          this.amcPreviewLoading.set(false);
          this.showToast(
            `Found ${accounts.length} demat accounts due for ${this.amcFrequency()} AMC.`,
            'info',
          );
        },
        error: (err) => {
          this.amcPreviewLoading.set(false);
          this.showToast(
            extractErrorMessage(err, 'Could not preview due AMC accounts.'),
            'warning',
          );
        },
      });
  }

  imposeAmcBilling(): void {
    this.isImposingAmc.set(true);
    this.chargesService
      .imposeAmc(this.amcFrequency(), this.amcBilledThrough())
      .subscribe({
        next: (billed) => {
          this.amcBilledResult.set(billed);
          this.isImposingAmc.set(false);
          this.showToast(
            `AMC Billing Cycle Executed! ${billed.length} accounts billed.`,
            'success',
          );
          this.amcDueAccounts.set([]);
        },
        error: (err) => {
          this.isImposingAmc.set(false);
          this.showToast(
            extractErrorMessage(err, 'Could not impose AMC billing.'),
            'warning',
          );
        },
      });
  }

  // --- 6. RECONCILIATION METHODS ---
  loadReconciliation(): void {
    this.reconLoading.set(true);
    const email = this.reconEmail() || 'demo@wealthlens.com';
    this.chargesService.getUserChargeReconciliation(email).subscribe({
      next: (res) => {
        this.reconciliationData.set(res);
        this.reconLoading.set(false);
      },
      error: (err) => {
        this.reconLoading.set(false);
        this.showToast(
          extractErrorMessage(err, 'Could not load reconciliation audit.'),
          'warning',
        );
      },
    });
  }
}
