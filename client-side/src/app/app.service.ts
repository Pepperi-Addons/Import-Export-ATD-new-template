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
    "eyJhbGciOiJSUzI1NiIsImtpZCI6IjRiYTFjNzJmMTI3NThjYzEzMzg3ZWQ3YTBiZjNlODg3IiwidHlwIjoiSldUIn0.eyJuYmYiOjE2MDUxMTczMjUsImV4cCI6MTYwNTEyMDkyNSwiaXNzIjoiaHR0cHM6Ly9pZHAuc2FuZGJveC5wZXBwZXJpLmNvbSIsImF1ZCI6WyJodHRwczovL2lkcC5zYW5kYm94LnBlcHBlcmkuY29tL3Jlc291cmNlcyIsInBlcHBlcmkuYXBpbnQiXSwiY2xpZW50X2lkIjoiaW9zLmNvbS53cm50eS5wZXBwZXJ5Iiwic3ViIjoiYmRmZTZhZjEtZTEzZC00NzdmLTkwNTMtZjA3MTBmNzZkNzFjIiwiYXV0aF90aW1lIjoxNjA1MTE3MzI1LCJpZHAiOiJsb2NhbCIsInBlcHBlcmkuYXBpbnRiYXNldXJsIjoiaHR0cHM6Ly9yZXN0YXBpLnNhbmRib3gucGVwcGVyaS5jb20iLCJlbWFpbCI6Im1hdHJpeHFhQHBlcHBlcml0ZXN0LmNvbSIsInBlcHBlcmkuaWQiOjIxMTQ4MiwicGVwcGVyaS51c2VydXVpZCI6ImJkZmU2YWYxLWUxM2QtNDc3Zi05MDUzLWYwNzEwZjc2ZDcxYyIsInBlcHBlcmkuZGlzdHJpYnV0b3J1dWlkIjoiNTBmOTQwMzYtMmE1My00MWE1LTg1MjctZmNkYTIxMjFhNTE2IiwicGVwcGVyaS5kaXN0cmlidXRvcmlkIjo3Nzg2MDE1LCJwZXBwZXJpLmRhdGFjZW50ZXIiOiJzYW5kYm94IiwicGVwcGVyaS5lbXBsb3llZXR5cGUiOjEsInBlcHBlcmkuYmFzZXVybCI6Imh0dHBzOi8vcGFwaS5zdGFnaW5nLnBlcHBlcmkuY29tL1YxLjAiLCJuYW1lIjoiTWF0cml4IFFBIiwic2NvcGUiOlsicGVwcGVyaS5hcGludCIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyJwd2QiXX0.I5nXlEY2ssSSgTomv82d0kaXqnz77kzAjRF9Iwa4BecF8iYcFxhZdOi0RQBPvOe1tibVrB2QyujSEgZ1_jm0mdTLsWYFQocF1GBkDdzr5jgnV_ar0q75PwtKGzf1WgLKPkHd6SZEXQejaa1NI6P8cCaP7WbZzodK0OJnp2mt33ol9tWhsD_bghpftsLCSiFh7Phn_BXJtORdRznDlpo1K6DGGABo3EJE0MJtZRZzoqq2gLohQn6Z06-NYNkXMAfH_F--hNGlcXwPegJ5J70ZrFKzDLvfttzkdCYDtZvgNOR2t2B6AfRnRFFi2qAG4CBsuPYGkZVtGCs8eCqZole7Ew";
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

  openDialog(title: string, content: string) {
    const actionButton: PepDialogActionButton = {
      title: "OK",
      className: "",
      callback: () => {},
    };

    const dialogData: PepDialogData = {
      title: title,
      content: content,
      actionButtons: [actionButton],
      showFooter: true,
      showHeader: false,
      type: "cancel-ok",
    };
    this.dialogService.openDefaultDialog(dialogData);
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
}
