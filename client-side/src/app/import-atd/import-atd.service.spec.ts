import { TestBed } from "@angular/core/testing";

import { ImportAtdService } from "./import-atd.service";

describe("ImportAtdService", () => {
  let service: ImportAtdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportAtdService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
