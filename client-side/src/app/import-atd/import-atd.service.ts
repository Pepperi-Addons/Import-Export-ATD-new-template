import { Injectable } from "@angular/core";
//@ts-ignore
import { AddonService } from "pepperi-addon-service";
// @ts-ignore
import { ActivityTypeDefinition } from "./../../../../models/activityTypeDefinition";
import { PapiClient } from "@pepperi-addons/papi-sdk";
import jwt from "jwt-decode";
import { KeyValuePair } from "@pepperi-addons/ngx-lib";
import { AppService } from "../app.service";

@Injectable({
  providedIn: "root",
})
export class ImportAtdService {
  [x: string]: any;

  file: File;
  accessToken = "";
  parsedToken: any;
  papiBaseURL = "";
  pluginUUID = `e9029d7f-af32-4b0e-a513-8d9ced6f8186`;
  exportedAtdstring: string;
  exportedAtd: ActivityTypeDefinition;

  constructor(private appService: AppService) {
    //private addonService: AddonService) {
    // const accessToken = this.addonService.getUserToken();
    // this.parsedToken = jwt(accessToken);
    //this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
    //this.papiClient = PapiClient;
  }

  //   openDialog(
  //     title = "Modal Test",
  //     content,
  //     buttons,
  //     input,
  //     callbackFunc,
  //     panelClass = "pepperi-modalbox"
  //   ): void {
  //     const self = this;
  //     const dialogConfig = new MatDialogConfig();
  //     // const data = new DialogModel(
  //     //   title,
  //     //   content,
  //     //   DialogDataType.Component,
  //     //   [],
  //     //   input
  //     // );
  //     // dialogConfig.disableClose = true;
  //     // dialogConfig.autoFocus = false;
  //     // dialogConfig.data = data;
  //     // dialogConfig.panelClass = "pepperi-standalone";
  //     // const dialogRef = this.dialog.open(content, dialogConfig);
  //     // dialogRef.afterClosed().subscribe((res) => {
  //     //   callbackFunc(res);
  //     // });
  //   }

  //   openTextDialog(title, content, buttons) {
  //     const data = new DialogData(title, content, DialogDataType.Text, buttons);
  //     this.userService.openDialog(data);
  //   }
  uploadFile(file) {
    let formData: FormData = new FormData();
    formData.append("file", file, file.name);
    console.log(`formData:${formData}`);
    this.file = file;

    //this.http.post(url, formData, request_options)
  }

  getTypeOfSubType(subtypeid: string) {
    return this.appService.getPapiCall(`/types/${subtypeid}`);
  }

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

  callToServerAPI(
    methodName: string,
    method: string,
    params: any,
    body: any
  ): any {
    if (method === "GET") {
      return this.appService.getAddonServerAPI(
        this.pluginUUID,
        "api",
        methodName,
        { params: params }
      );
    } else if (method === "POST") {
      return this.appService.postAddonServerAPI(
        this.pluginUUID,
        "api",
        methodName,
        body,
        { params: params }
      );
    }
  }

  getPapiClient() {
    return this.papiClient;
  }
  openDialog(title: string, content: string) {
    this.appService.openDialog(title, content);
  }
  get papiClient(): PapiClient {
    return new PapiClient({
      baseURL: this.papiBaseURL,
      token: this.addonService.getUserToken(),
      addonUUID: this.pluginUUID,
      suppressLogging: true,
    });
  }
}
