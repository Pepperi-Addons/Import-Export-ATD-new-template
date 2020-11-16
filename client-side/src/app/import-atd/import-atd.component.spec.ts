import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ImportAtdComponent } from "./import-atd.component";

describe("ImportAtdComponent", () => {
  let component: ImportAtdComponent;
  let fixture: ComponentFixture<ImportAtdComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ImportAtdComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportAtdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
