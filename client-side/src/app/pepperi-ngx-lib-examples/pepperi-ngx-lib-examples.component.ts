import { Component, OnInit } from "@angular/core";
import { AppService } from "../app.service";

@Component({
  // tslint:disable-next-line: component-selector
  selector: "addon-ngx-lib-examples",
  templateUrl: "./pepperi-ngx-lib-examples.component.html",
  styleUrls: ["./pepperi-ngx-lib-examples.component.scss"],
})
export class PepperiNgxLibExamplesComponent implements OnInit {
  title = "client-side";

  constructor(public appService: AppService) {}

  ngOnInit(): void {}
}
