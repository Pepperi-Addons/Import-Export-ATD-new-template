import { Injectable } from "@angular/core";
import { AddonService, HttpService } from "@pepperi-addons/ngx-lib";
import {
  DialogService,
  PepDialogActionButton,
} from "@pepperi-addons/ngx-lib/dialog";
import { PepDialogData } from "@pepperi-addons/ngx-lib/dialog";

@Injectable({
  providedIn: "root",
})
export class AppService {
  idpToken =
    "eyJhbGciOiJSUzI1NiIsImtpZCI6IjRiYTFjNzJmMTI3NThjYzEzMzg3ZWQ3YTBiZjNlODg3IiwidHlwIjoiSldUIn0.eyJuYmYiOjE2MDU2MzIwMTAsImV4cCI6MTYwNTYzNTYxMCwiaXNzIjoiaHR0cHM6Ly9pZHAuc2FuZGJveC5wZXBwZXJpLmNvbSIsImF1ZCI6WyJodHRwczovL2lkcC5zYW5kYm94LnBlcHBlcmkuY29tL3Jlc291cmNlcyIsInBlcHBlcmkuYXBpbnQiXSwiY2xpZW50X2lkIjoiaW9zLmNvbS53cm50eS5wZXBwZXJ5Iiwic3ViIjoiYmRmZTZhZjEtZTEzZC00NzdmLTkwNTMtZjA3MTBmNzZkNzFjIiwiYXV0aF90aW1lIjoxNjA1NjMyMDEwLCJpZHAiOiJsb2NhbCIsInBlcHBlcmkuYXBpbnRiYXNldXJsIjoiaHR0cHM6Ly9yZXN0YXBpLnNhbmRib3gucGVwcGVyaS5jb20iLCJlbWFpbCI6Im1hdHJpeHFhQHBlcHBlcml0ZXN0LmNvbSIsInBlcHBlcmkuaWQiOjIxMTQ4MiwicGVwcGVyaS51c2VydXVpZCI6ImJkZmU2YWYxLWUxM2QtNDc3Zi05MDUzLWYwNzEwZjc2ZDcxYyIsInBlcHBlcmkuZGlzdHJpYnV0b3J1dWlkIjoiNTBmOTQwMzYtMmE1My00MWE1LTg1MjctZmNkYTIxMjFhNTE2IiwicGVwcGVyaS5kaXN0cmlidXRvcmlkIjo3Nzg2MDE1LCJwZXBwZXJpLmRhdGFjZW50ZXIiOiJzYW5kYm94IiwicGVwcGVyaS5lbXBsb3llZXR5cGUiOjEsInBlcHBlcmkuYmFzZXVybCI6Imh0dHBzOi8vcGFwaS5zdGFnaW5nLnBlcHBlcmkuY29tL1YxLjAiLCJuYW1lIjoiTWF0cml4IFFBIiwic2NvcGUiOlsicGVwcGVyaS5hcGludCIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyJwd2QiXX0.fMUNPZ2UcZ26u9W7USlNcgIswmS4l5OrdS9UOEMRzbAn6nJJX3N3fz5fNJdSjDDkerdWq8Fb3Lh8nOmQdldNGefMcUP5B707KwwCdUzr0zdRBScDI-EQJirEAWKwcXRLP6OUhQh6McBUYzLBKLX7xKnkvP51GlQcWm8EVK89zlTvpbjrJaZSPK2WSYivV05QpTDC13v5CZ8l2pcf3AsEIkO470tMrFdJmKhGuLjNZbkC3H1eJ8DB6FId6_2iM2s9gGMZ4xGE9oMSWgrOxYuyXi9gXhJk53TLZo4ZsykjcHClAAF7_uz1aBIXc1uNw8PJ-GUG60MjMakygUhjySOcXg";
  constructor(
    private httpService: HttpService,
    private addonService: AddonService,
    private dialogService: DialogService
  ) {
    sessionStorage.setItem("idp_token", this.idpToken);
  }

  getAddonServerAPI(
    addonUUID: string,
    fileName: string,
    functionName: string,
    options: any
  ) {
    return this.addonService.getAddonApiCall(
      addonUUID,
      fileName,
      functionName,
      options
    );
  }

  postAddonServerAPI(
    addonUUID: string,
    fileName: string,
    functionName: string,
    body: any,
    options: any
  ) {
    return this.addonService.postAddonApiCall(
      addonUUID,
      fileName,
      functionName,
      body,
      options
    );
  }

  openDialog(title: string, content: string, callback?: any) {
    const actionButton: PepDialogActionButton = {
      title: "OK",
      className: "",
      callback: callback,
    };

    const dialogData = new PepDialogData({
      title: title,
      content: content,
      actionButtons: [actionButton],
      showHeader: false,
      type: "custom",
    });
    this.dialogService
      .openDefaultDialog(dialogData)
      .afterClosed()
      .subscribe((callback) => {
        if (callback) {
          callback();
        }
      });
  }

  getFromAPI(apiObject, successFunc, errorFunc) {
    //this.addonService.setShowLoading(true);
    const endpoint = apiObject.ListType === "all" ? "addons" : "updates";
    // // --- Work live in sandbox upload api.js file to plugin folder
    // const url = `/addons/api/${apiObject.UUID}/api/${endpoint}`;
    // this.addonService.httpGetApiCall(url, successFunc, errorFunc);

    //--- Work localhost
    const url = `http://localhost:4400/api/${endpoint}`;
    // this.httpService.getHttpCall(url, searchObject, { 'headers': {'Authorization': 'Bearer ' + this.addonService.getUserToken() }}).subscribe(
    //     res => successFunc(res), error => errorFunc(error), () => this.addonService.setShowLoading(false)
    // );
    this.httpService.getHttpCall("");
  }

  postToAPI(endpoint) {
    const url = `http://localhost:4400/api/${endpoint}`;
    this.post(url);
  }

  post(url: string) {
    this.httpService.postHttpCall(url, null).subscribe((result) => {});
  }

  getPapiCall(url: string) {
    return this.httpService.getPapiApiCall(url);
  }

  postPapiCall(url: string, body: any) {
    return this.httpService.postPapiApiCall(url, body);
  }
}
