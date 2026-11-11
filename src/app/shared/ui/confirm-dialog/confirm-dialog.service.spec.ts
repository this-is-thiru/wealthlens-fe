import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
  });

  it('starts with no pending request', () => {
    expect(service.request()).toBeNull();
  });

  it('applies defaults for tone and labels', () => {
    service.confirm({ title: 'Delete?', message: 'Cannot be undone.' });

    expect(service.request()).toMatchObject({
      title: 'Delete?',
      message: 'Cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    });
  });

  it('keeps provided tone and labels', () => {
    service.confirm({
      title: 'Reset?',
      message: 'Sample data will be restored.',
      tone: 'accent',
      confirmLabel: 'Reset',
      cancelLabel: 'Keep',
    });

    expect(service.request()).toMatchObject({
      tone: 'accent',
      confirmLabel: 'Reset',
      cancelLabel: 'Keep',
    });
  });

  it('resolves true and clears the request on confirm', async () => {
    const result = service.confirm({ title: 't', message: 'm' });

    service.respond(true);

    await expect(result).resolves.toBe(true);
    expect(service.request()).toBeNull();
  });

  it('resolves false and clears the request on cancel', async () => {
    const result = service.confirm({ title: 't', message: 'm' });

    service.respond(false);

    await expect(result).resolves.toBe(false);
    expect(service.request()).toBeNull();
  });

  it('does nothing when responding without a pending request', () => {
    expect(() => service.respond(true)).not.toThrow();
    expect(service.request()).toBeNull();
  });
});
