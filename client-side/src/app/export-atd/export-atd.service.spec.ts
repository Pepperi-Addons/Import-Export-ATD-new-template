import { TestBed } from '@angular/core/testing';

import { ExportAtdService } from './export-atd.service';

describe('ExportAtdService', () => {
  let service: ExportAtdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportAtdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
