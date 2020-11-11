import { Injectable } from "@angular/core";
//@ts-ignore
import { AddonService } from "pepperi-addon-service";
import { PapiClient } from "@pepperi-addons/papi-sdk";
import jwt from "jwt-decode";
import { HttpService, SessionService } from "@pepperi-addons/ngx-lib";

import { KeyValuePair } from "../../../../models/KeyValuePair";
import { AppService } from "../app.service";
@Injectable({
  providedIn: "root",
})
export class ExportAtdService {
  accessToken = "";
  parsedToken: any;
  papiBaseURL = "";
  pluginUUID = `e9029d7f-af32-4b0e-a513-8d9ced6f8186`;
  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private appService: AppService
  ) {
    //private addonService: AddonService) {
    // const accessToken = this.sessionService.getIdpToken();
    // this.parsedToken = jwt(accessToken);
    // this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
    this.papiBaseURL = this.sessionService.getPapiBaseUrl();
    //layout servuce

    //this.papiClient = PapiClient;
  }
  ngOnInit(): void {}

  getTypes(successFunc = null, errorFunc = null) {
    let types: KeyValuePair<string>[] = [];

    this.appService.getPapiCall("/meta_data/transactions/types").subscribe(
      (activityTypes) => {
        if (activityTypes) {
          activityTypes.forEach((type) =>
            types.push({ Key: type.TypeID, Value: type.ExternalID })
          );
        }
        this.appService.getPapiCall("/meta_data/activities/types").subscribe(
          (transactionTypes) => {
            if (transactionTypes) {
              transactionTypes.forEach((type) =>
                types.push({ Key: type.TypeID, Value: type.ExternalID })
              );
            }
            successFunc(types);
          }
          //errorFunc
        );
      }
      //errorFunc
    );
  }

  getPapiClient() {
    return this.papiClient;
  }

  get papiClient(): PapiClient {
    return new PapiClient({
      baseURL: this.papiBaseURL,
      token: this.sessionService.getIdpToken(),
      addonUUID: this.pluginUUID,
      suppressLogging: true,
    });
  }

  getTypeOfSubType(subtypeid: string) {
    return this.appService.getPapiCall(`/types/${subtypeid}`);
  }

  callToExportATDAPI(type: string, subtypeid: string): any {
    const params = { type: type, subtype: subtypeid };
    const exportAtdResult = this.appService.getAddonServerAPI(
      this.pluginUUID,
      "api",
      "export_type_definition",
      { params: params }
    );
    return exportAtdResult;
  }

  openDialog(title: string, content: string) {
    this.appService.openDialog(title, content);
  }
}
