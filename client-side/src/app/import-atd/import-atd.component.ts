import { Component, OnInit, ViewChild } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
// @ts-ignore
import { UserService } from "pepperi-user-service";
import { ImportAtdService } from "./import-atd.service";
import { Reference } from "./../../../../models/reference";
import { Conflict } from "./../../../../models/conflict";
import { Guid } from "./../../../../models/guid";
import { References, Mapping } from "./../../../../models/referencesMap";
import { __param } from "tslib";
import { FileStorage } from "@pepperi-addons/papi-sdk";
import { ReferenceType } from "./../../../../models/referenceType";
import { Webhook } from "./../../../../models/Webhook";
import { ResolutionOption } from "./../../../../models/resolutionOption.enum";
import { pairs } from "rxjs";
import {
  AddonService,
  CustomizationService,
  DataConvertorService,
  FIELD_TYPE,
  HttpService,
  KeyValuePair,
  ObjectSingleData,
  PepFieldData,
  PepRowData,
  UtilitiesService,
  X_ALIGNMENT_TYPE,
} from "@pepperi-addons/ngx-lib";
import {
  PepListComponent,
  PepListViewType,
} from "@pepperi-addons/ngx-lib/list";
import {
  PepGroupButton,
  PepGroupButtonsViewType,
} from "@pepperi-addons/ngx-lib/group-buttons";
import { PepColorType } from "@pepperi-addons/ngx-lib/color";

@Component({
  selector: "app-import-atd",
  templateUrl: "./import-atd.component.html",
  styleUrls: ["./import-atd.component.scss"],
})
export class ImportAtdComponent implements OnInit {
  file: File | null = null;
  data: any;
  apiEndpoint: string;
  installing: boolean = false;
  addonData: any = {};
  activityTypes: KeyValuePair<string>[];
  selectedActivity: any;
  selectedFile: File;
  showConflictResolution: boolean = false;
  showWebhooksResolution: boolean = false;
  title = "pepperi web app test";
  value = "";

  groupButtons: Array<PepGroupButton>;
  GROUP_BUTTONS_VIEW_TYPE: PepGroupButtonsViewType = "regular";
  viewType: PepListViewType = "table";
  colorType: PepColorType = "any";
  conflictsList: Conflict[] = [];
  webhooks: Webhook[] = [];
  typeString = ``;
  typeUUID = ``;
  separatorTitle = "Import type definition";
  referenceMap: References;

  @ViewChild("conflictslist") customConflictList: PepListComponent;
  @ViewChild("webhookslist") customWebhookList: PepListComponent;

  constructor(
    private dataConvertorService: DataConvertorService,
    private utilitiesService: UtilitiesService,
    private translate: TranslateService,
    private customizationService: CustomizationService,
    private httpService: HttpService,
    private addonService: AddonService,
    private importedService: ImportAtdService
  ) {
    this.getActivityTypes();
    const browserCultureLang = translate.getBrowserCultureLang();
  }

  getActivityTypes() {
    this.activityTypes = [];
    this.importedService.getTypes((types) => {
      if (types) {
        types.sort((a, b) => a.Value.localeCompare(b.Value));
        this.activityTypes = [...types];
      }
    });
  }

  ngOnInit() {}

  async onOkConflictsClicked() {
    let resulotion = {};
    this.conflictsList.forEach(async (conflict) => {
      let referenceIndex = this.referenceMap.Mapping.findIndex(
        (pair) => pair.Origin.Name === conflict.Name
      );
      if (
        conflict.Resolution ===
        ResolutionOption.toString(ResolutionOption.CreateNew)
      ) {
        if (
          conflict.Object === ReferenceType.toString(ReferenceType.FileStorage)
        ) {
          let res = await this.upsertFileStorage(referenceIndex);
          let destinitionRef = {} as Reference;
          destinitionRef.ID = res.InternalID.toString();
          destinitionRef.Name = res.FileName;
          destinitionRef.Type = ReferenceType.toString(
            ReferenceType.FileStorage
          );
          this.referenceMap.Mapping[
            referenceIndex
          ].Destination = destinitionRef;
        } else if (
          conflict.Object === ReferenceType.toString(ReferenceType.Filter)
        ) {
          let transactionItemScope = await this.getTransactionItemScope(
            this.selectedActivity
          );
          if (!transactionItemScope) {
            let res = await this.upsertTransactionItemScope(referenceIndex);
            let destinitionRef = {} as Reference;
            destinitionRef.ID = res.InternalID.toString();
            destinitionRef.Name = res.FileName;
            destinitionRef.Type = ReferenceType.toString(ReferenceType.Filter);
            this.referenceMap.Mapping[
              referenceIndex
            ].Destination = destinitionRef;
          }
        } else if (
          conflict.Object ===
          ReferenceType.toString(ReferenceType.UserDefinedTable)
        ) {
          let res = await this.upsertUDT(referenceIndex);
          let destinitionRef = {} as Reference;
          destinitionRef.ID = res.InternalID.toString();
          destinitionRef.Name = res.TableID;
          destinitionRef.Type = ReferenceType.toString(
            ReferenceType.UserDefinedTable
          );

          this.referenceMap.Mapping[
            referenceIndex
          ].Destination = destinitionRef;
        }
      } else if (
        conflict.Resolution ===
        ResolutionOption.toString(ResolutionOption.OverwriteExisting)
      ) {
        if (
          conflict.Object === ReferenceType.toString(ReferenceType.FileStorage)
        ) {
          let key = `${this.referenceMap.Mapping[referenceIndex].Destination.ID}`;
          resulotion[key] = ResolutionOption.OverwriteExisting;
          let file: FileStorage = {
            InternalID: Number(
              this.referenceMap.Mapping[referenceIndex].Destination.ID
            ),
            FileName: this.referenceMap.Mapping[referenceIndex].Destination
              .Name,
            URL: this.referenceMap.Mapping[referenceIndex].Origin.Path,
            Title: this.referenceMap.Mapping[referenceIndex].Destination.Name,
          };
          let res = await this.importedService.callToPapi(
            "POST",
            "/file_storage",
            file
          );
          this.referenceMap.Mapping[
            referenceIndex
          ].Destination.ID = res.InternalID.toString();
        }
      } else if (
        conflict.Resolution ===
        ResolutionOption.toString(ResolutionOption.UseExisting)
      ) {
        let key = `${this.referenceMap.Mapping[referenceIndex].Destination.ID}`;
        resulotion[key] = ResolutionOption.UseExisting;
      }
    });

    this.importedService.callToServerAPI(
      "upsert_to_dynamo",
      "POST",
      { table: `importExportATD` },
      {
        Key: "resolution",
        Value: resulotion,
      }
    );

    if (this.webhooks.length > 0) {
      this.showWebhooks();
    } else {
      this.callToImportATD();
    }
    console.log(this.referenceMap);
  }

  private showWebhooks() {
    this.fillWebhooksFromDynamo().then(() => {
      this.showConflictResolution = false;
      this.showWebhooksResolution = true;
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 5);

      this.loadWebhookslist();
    });
  }

  private async upsertUDT(referenceIndex: number) {
    let udt = JSON.parse(
      this.referenceMap.Mapping[referenceIndex].Origin.Content
    );
    delete udt.InternalID;
    let res = await this.importedService.callToPapi(
      "POST",
      "meta_data\\user_defined_tables",
      udt
    );
    return res;
  }

  private async upsertTransactionItemScope(referenceIndex: number) {
    let filter = {
      name: `Transaction Item Scope`,
      Data: JSON.parse(
        this.referenceMap.Mapping[referenceIndex].Origin.Content
      ),
      DataType: {
        ID: 10,
      },
      ContextObject: {
        UUID: this.typeUUID,
        Type: {
          ID: 98,
          Name: "ActivityTypeDefinition",
        },
      },
    };
    let res = await this.importedService.callToPapi(
      "POST",
      "/meta_data/filters",
      filter
    );
    console.log(
      `afetr posting filter. body: ${JSON.stringify(
        this.referenceMap.Mapping[referenceIndex].Origin.Content
      )}, res: ${JSON.stringify(res)}`
    );
    return res;
  }

  private async upsertFileStorage(referenceIndex: number) {
    let file: FileStorage = {
      FileName: this.referenceMap.Mapping[referenceIndex].Origin.Name,
      URL: this.referenceMap.Mapping[referenceIndex].Origin.Path,
      Title: this.referenceMap.Mapping[referenceIndex].Origin.Name,
      Configuration: {
        ObjectType: "Order",
        Type: "CustomClientForm",
        RequiredOperation: "NoOperation",
      },
    };
    let res = await this.importedService.callToPapi(
      "POST",
      "/file_storage",
      file
    );

    return res;
  }

  async getTransactionItemScope(subtype: string) {
    return await this.importedService.callToPapi(
      "GET",
      "/meta_data/lists/all_activities?where=Name='Transaction Item Scope'"
    );
  }

  async onOkWebhooksClicked() {
    debugger;
    let dynamoWebhooks = {};
    this.webhooks.forEach((webhook) => {
      let referenceIndex = this.referenceMap.Mapping.findIndex(
        (pair) => pair.Origin.UUID === webhook.UUID
      );
      const key = this.referenceMap.Mapping[referenceIndex].Origin.UUID;
      dynamoWebhooks[key] = {};
      if (
        webhook.Url !==
        this.referenceMap.Mapping[referenceIndex].Origin.Content.WEBHOOK_URL
      ) {
        dynamoWebhooks[key].url = webhook.Url;
        this.referenceMap.Mapping[
          referenceIndex
        ].Destination.Content.WEBHOOK_URL = webhook.Url;
      }
      if (
        webhook.SecretKey !==
        this.referenceMap.Mapping[referenceIndex].Origin.Content.SECRET_KEY
      ) {
        this.referenceMap.Mapping[
          referenceIndex
        ].Destination.Content.SECRET_KEY = webhook.SecretKey;
        dynamoWebhooks[key].secretKey = webhook.SecretKey;
      }
    });

    this.importedService.callToServerAPI(
      "upsert_to_dynamo",
      "POST",
      { table: `importExportATD` },
      {
        Key: "webhooks",
        Value: dynamoWebhooks,
      }
    );
    this.callToImportATD();
  }

  private async callToImportATD() {
    const presignedUrl = await this.importedService.callToPapi(
      "POST",
      `/file_storage/tmp`
    );
    await fetch(presignedUrl.UploadURL, {
      method: `PUT`,
      body: this.importedService.exportedAtdstring,
    });

    let url = presignedUrl.DownloadURL;

    this.deleteContentFromMap();
    console.log(
      `calling to api\import_atd. body: url: ${url}, ReferencesMap: ${JSON.stringify(
        this.referenceMap
      )}`
    );
    const importAtdResult = this.importedService
      .callToServerAPI(
        "import_type_definition",
        "POST",
        { type: this.typeString, subtype: this.selectedActivity },
        { URL: url, References: this.referenceMap }
      )
      .then(
        (res: any) => {
          if (res == "success") {
            const title = `success`;
            const content = `Import was finished succefully`;
            debugger;
            this.importedService.openDialog(title, content, () => {
              window.location.reload();
            });
          } else {
            const title = `Error`;
            const content = `An error occurred while importing`;
            this.importedService.openDialog(title, content);
          }
          //window.clearInterval();
          this.data = res;
        },
        (error) => {}
      );
  }

  private deleteContentFromMap() {
    this.referenceMap.Mapping.forEach((pair) => {
      // The content of the webhook reference should be sent in order to fix the workflow's actions
      if (
        pair.Destination &&
        pair.Destination.Type !== ReferenceType.toString(ReferenceType.Webhook)
      ) {
        delete pair.Destination.Content;
        delete pair.Origin.Content;
      }
    });
    this.referenceMap.Mapping.forEach((pair) => {
      if (
        pair.Destination &&
        pair.Destination.Type !== ReferenceType.toString(ReferenceType.Webhook)
      ) {
        delete pair.Destination.Path;
        delete pair.Origin.Path;
      }
    });
  }

  async onCancelClicked() {}

  selectedRowsChanged(selectedRowsCount) {
    const selectData = selectedRowsCount.componentRef.instance.getSelectedItemsData(
      true
    );
    let rowData = "";
    if (
      selectData &&
      selectData.rows &&
      selectData.rows[0] !== "" &&
      selectData.rows.length == 1
    ) {
      const uid = selectData.rows[0];
      rowData = selectedRowsCount.componentRef.instance.getItemDataByID(uid);
    }
    // this.listActions =
    //   this.topBarComp && selectedRowsCount > 0
    //     ? this.getListActions(rowData, translates)
    //     : null;
    // this.topBarComp.componentRef.instance.listActionsData = this.listActions;
    // this.topBarComp.componentRef.instance.showListActions =
    //   this.listActions && this.listActions.length ? true : false;

    //this.cd.detectChanges();
  }

  async importAtd() {
    try {
      await this.importedService
        .getTypeOfSubType(this.selectedActivity)
        .subscribe((typeDefinition) => {
          this.getTypeString(typeDefinition);
          this.typeUUID = typeDefinition.UUID;
          this.importedService
            .callToServerAPI(
              "build_references_mapping",
              "POST",
              { subtype: this.selectedActivity },
              { references: this.importedService.exportedAtd.References }
            )
            .then(async (res) => {
              this.referenceMap = res;
              if (this.referenceMap && this.referenceMap.Mapping.length > 0) {
                this.getConflictsResulotion(this.referenceMap).then(
                  async (res) => {
                    this.conflictsList = res;

                    if (this.conflictsList && this.conflictsList.length > 0) {
                      await this.fillResolutionFromDynamo();

                      this.showWebhooksResolution = false;
                      this.showConflictResolution = true;

                      setTimeout(() => {
                        window.dispatchEvent(new Event("resize"));
                      }, 5);
                      this.loadConflictlist();
                    } else if (this.webhooks.length > 0) {
                      this.showWebhooks();
                    } else {
                      this.callToImportATD();
                    }
                  }
                );
              }
            });
        });
    } catch {}
  }

  private async fillWebhooksFromDynamo() {
    let webhooksFromDynmo = await this.importedService.callToServerAPI(
      "get_from_dynamo",
      "GET",
      { table: `importExportATD`, key: `webhooks` }
    );

    this.webhooks.forEach((w) => {
      const val = webhooksFromDynmo[0].Value[w.UUID];
      if (val != null && val != undefined && val != {}) {
        w.Url = val.url ? val.url : w.Url;
        w.SecretKey = val.secretKey ? val.secretKey : w.SecretKey;
      }
    });
  }

  private async fillResolutionFromDynamo() {
    let resolutionFromDynmo = await this.importedService.callToServerAPI(
      "get_from_dynamo",
      "GET",
      { table: `importExportATD`, key: `resolution` }
    );

    this.conflictsList.forEach((c) => {
      const val = resolutionFromDynmo[0].Value[c.ID];
      if (val != null && val != undefined) {
        c.Resolution = ResolutionOption.toString(val);
      }
    });
  }

  private getTypeString(type: any) {
    if (type.Type === 2) {
      this.typeString = `transactions`;
    } else {
      this.typeString = `activities`;
    }
  }

  async getConflictsResulotion(referenceMap: References) {
    let conflicts: Conflict[] = [];

    const refMaps = this.importedService.exportedAtd.References;

    for (let i = 0; i < refMaps.length; i++) {
      try {
        await this.handleReference(refMaps[i], conflicts, referenceMap);
      } catch (e) {
        throw e;
      }
    }
    return conflicts;
  }

  async handleReference(
    ref: Reference,
    conflicts: Conflict[],
    referenceMap: References
  ) {
    if (ref.Type !== ReferenceType.toString(ReferenceType.Webhook)) {
      let referencedPair: Mapping = referenceMap.Mapping.find(
        (pair) => pair.Origin.ID === ref.ID || pair.Origin.Name === ref.Name
      );

      if (!referencedPair.Destination) {
        // For objects with a path (such as custom form),
        // if a matching object does not exist, then continue (create this object in the Execution step).
        if (
          ref.Type === ReferenceType.toString(ReferenceType.FileStorage) ||
          ref.Type === ReferenceType.toString(ReferenceType.UserDefinedTable) ||
          ref.Type === ReferenceType.toString(ReferenceType.Filter)
        ) {
          const conflict: Conflict = {
            Name: ref.Name,
            Object: referencedPair.Origin.Type,
            Status: `Object not found`,
            Resolution: ResolutionOption.toString(ResolutionOption.CreateNew),
            UUID: Guid.newGuid(),
            ID: ref.ID,
            // this.resolutionOptions,
          };
          conflicts.push(conflict);
        } else {
          const title = `error`;
          const content = `No reference was found with the name: ${ref.Name} of type: ${ref.Type}`;
          this.showWebhooksResolution = false;
          this.showConflictResolution = false;
          this.importedService.openDialog(title, content);
          //throw new Error(content);
        }
      } else if (referencedPair.Origin.ID === referencedPair.Destination.ID) {
        return;
      } else if (
        referencedPair.Origin.Name === referencedPair.Destination.Name
      ) {
        if (ref.Type === ReferenceType.toString(ReferenceType.FileStorage)) {
          const filesAreSame = await this.compareFileContentOfOriginAndDest(
            referencedPair.Origin,
            referencedPair.Destination
          );
          if (!filesAreSame) {
            const conflict: Conflict = {
              Name: referencedPair.Destination.Name,
              Object: ReferenceType.toString(referencedPair.Destination.Type),
              Status: `A file named ${referencedPair.Destination.Name} exists with a different content`,
              Resolution: null,
              UUID: Guid.newGuid(),
              ID: referencedPair.Destination.ID,
              // this.resolutionOptions,
            };
            conflicts.push(conflict);
          }
        }
      }
    } else {
      const webhook: Webhook = {
        Url: ref.Content.WEBHOOK_URL,
        SecretKey: ref.Content.SECRET_KEY,
        UUID: ref.UUID,
      };

      this.webhooks.push(webhook);
    }
  }

  async compareFileContentOfOriginAndDest(
    origin: Reference,
    destinition: Reference
  ): Promise<boolean> {
    console.log("in compareFileContentOfOriginAndDest");
    let contentOrigin = await this.fileToBase64(origin.Name, origin.Path);
    let contentDestinition = await this.fileToBase64(
      destinition.Name,
      destinition.Path
    );

    console.log(
      `contentOrigin === contentDestinition: ${
        contentOrigin === contentDestinition
      }`
    );

    return contentOrigin === contentDestinition;
  }

  onFileSelect(event) {
    let fileObj = event.value;
    if (fileObj.length > 0) {
      const file = JSON.parse(fileObj);
      const blob = new Blob([file.fileStr], { type: file.fileExt });
      var fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onload = (e) => {
        this.importedService.exportedAtdstring = atob(
          file.fileStr.split(";")[1].split(",")[1]
        );
        this.importedService.exportedAtd = JSON.parse(
          this.importedService.exportedAtdstring
        );
      };
    }
  }

  async fileToBase64(filename, filepath) {
    const responseText = await fetch(filepath).then((r) => r.text());

    return btoa(responseText);
  }

  uploadFile(event) {
    let files = event.target.files;
    if (files.length > 0) {
      console.log(files[0]); // You will see the file
      this.importedService.uploadFile(files[0]);
    }
  }

  //#region conflicts list
  ngAfterViewInit() {
    if (this.conflictsList.length > 0) {
      this.loadConflictlist();
    }
    if (this.webhooks.length > 0) {
      this.loadWebhookslist();
    }
  }

  elementClicked(event) {
    this.selectedActivity = event.value;
  }

  notifyValueChanged(event) {
    if (this.showConflictResolution) {
      let objectOndex = this.conflictsList.findIndex(
        (x) => x.UUID === event.Id
      );
      this.conflictsList[objectOndex].Resolution = event.Value;
    } else if (this.showWebhooksResolution) {
      let objectOndex = this.webhooks.findIndex((x) => x.UUID === event.Id);
      if (event.ApiName === "Secret Key") {
        this.webhooks[objectOndex].SecretKey = event.Value;
      } else if (event.ApiName === "Web service URL") {
        this.webhooks[objectOndex].Url = event.Value;
      }
    }
  }

  loadConflictlist() {
    this.separatorTitle = "Conflict Resoltion";
    this.loadConflictList(this.conflictsList);
  }

  loadConflictList(conflicts) {
    if (this.customConflictList && conflicts) {
      const tableData = new Array<PepRowData>();
      conflicts.forEach((addon: any) => {
        const userKeys = ["Object", "Name", "Status"];
        const supportUserKeys = ["Resolution"];
        const allKeys = [...userKeys, ...supportUserKeys];
        tableData.push(this.convertConflictToPepRowData(addon, allKeys));
      });

      const pepperiListObj = this.dataConvertorService.convertListData(
        tableData
      );
      const buffer = [];
      if (pepperiListObj.Rows) {
        pepperiListObj.Rows.map((row, i) => {
          row.UID = conflicts[i].UUID || row.UID;
          const osd = new ObjectSingleData(pepperiListObj.UIControl, row);
          osd.IsEditable = true;
          buffer.push(osd);
        });
      }

      this.customConflictList.initListData(
        pepperiListObj.UIControl,
        buffer.length,
        buffer,
        this.viewType,
        "",
        true
      );
    }
  }

  convertConflictToPepRowData(conflict: any, customKeys = null) {
    const row = new PepRowData();
    row.Fields = [];
    const keys = customKeys ? customKeys : Object.keys(conflict);
    keys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfConflicts(conflict, key))
    );
    return row;
  }

  initDataRowFieldOfConflicts(addon: any, key: any): PepFieldData {
    const dataRowField: PepFieldData = {
      ApiName: key,
      Title: this.translate.instant(key),
      XAlignment: X_ALIGNMENT_TYPE.Left,
      FormattedValue: addon[key] ? addon[key].toString() : "",
      Value: addon[key] ? addon[key].toString() : "",
      ColumnWidth: 10,
      AdditionalValue: "",
      OptionalValues: [],
      FieldType: FIELD_TYPE.TextBox,
      Enabled:
        key === `Resolution` &&
        addon[key] != ResolutionOption.toString(ResolutionOption.CreateNew)
          ? true
          : false,
    };
    switch (key) {
      case "Object":
        const addonType = addon.Object && addon[key] ? addon[key] : "";
        dataRowField.FormattedValue = addonType;
        dataRowField.AdditionalValue = dataRowField.Value = addonType;
        break;
      case "Name":
        dataRowField.ColumnWidth = 15;
        dataRowField.AdditionalValue = addon.Name;
        dataRowField.FormattedValue = addon[key] ? addon[key] : "";
        dataRowField.Value = addon[key] ? addon[key] : "";
        break;
      case "Status":
        dataRowField.ColumnWidth = 25;
        dataRowField.AdditionalValue = addon.Status;
        dataRowField.FormattedValue = addon[key] ? addon[key] : "";
        dataRowField.Value = addon[key] ? addon[key] : "";
        break;

      case "Resolution":
        dataRowField.ColumnWidth = 15;
        dataRowField.FieldType = FIELD_TYPE.ComboBox;
        dataRowField.FormattedValue = addon[key];
        dataRowField.Value = addon[key];
        dataRowField.OptionalValues = [
          {
            Key: ResolutionOption.toString(ResolutionOption.UseExisting),
            Value: "Use existing", //this.translate["Conflict_Resolution_Type_UseExist"],
          },
          {
            Key: ResolutionOption.toString(ResolutionOption.OverwriteExisting),
            Value: "Owerwrite existing", //this.translate["Conflict_Resolution_Type_Owerwrite"],
          },
        ];
        break;

      default:
        dataRowField.FormattedValue = addon[key] ? addon[key].toString() : "";
        break;
    }
    return dataRowField;
  }

  //#endregion

  //#region webhooks list

  loadWebhookslist() {
    this.separatorTitle = "Webhook Validator";
    this.loadWebhooksList(this.webhooks);
  }

  loadWebhooksList(webhooks) {
    if (this.customWebhookList && webhooks) {
      const tableData = new Array<PepRowData>();
      webhooks.forEach((webhook: any) => {
        const allKeys = ["Web service URL", "Secret key"];
        tableData.push(this.convertWebhookToPepRowData(webhook, allKeys));
      });
      const pepperiListObj = this.dataConvertorService.convertListData(
        tableData
      );
      const buffer = [];
      if (pepperiListObj.Rows) {
        pepperiListObj.Rows.map((row, i) => {
          row.UID = webhooks[i].UUID || row.UID;
          const osd = new ObjectSingleData(pepperiListObj.UIControl, row);
          osd.IsEditable = true;
          buffer.push(osd);
        });
      }

      this.customWebhookList.initListData(
        pepperiListObj.UIControl,
        buffer.length,
        buffer,
        this.viewType,
        "",
        true
      );
    }
  }

  convertWebhookToPepRowData(webhook: any, customKeys = null) {
    const row = new PepRowData();
    row.Fields = [];
    const keys = customKeys ? customKeys : Object.keys(webhook);
    keys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfWebhooks(webhook, key))
    );
    return row;
  }

  initDataRowFieldOfWebhooks(webhook: any, key: any): PepFieldData {
    const dataRowField: PepFieldData = {
      ApiName: key,
      Title: this.translate.instant(key),
      XAlignment: X_ALIGNMENT_TYPE.Left,
      FormattedValue: webhook[key] ? webhook[key].toString() : "",
      Value: webhook[key] ? webhook[key].toString() : "",
      ColumnWidth: 10,
      AdditionalValue: "",
      OptionalValues: [],
      FieldType: FIELD_TYPE.TextBox,
      Enabled: true,
    };
    switch (key) {
      case "Web service URL":
        dataRowField.ColumnWidth = 30;
        dataRowField.FormattedValue = webhook.Url ? webhook.Url : "";
        dataRowField.Value = webhook.Url ? webhook.Url : "";

        break;
      case "Secret key":
        dataRowField.ColumnWidth = 20;
        dataRowField.FormattedValue = webhook.SecretKey
          ? webhook.SecretKey
          : "";
        dataRowField.Value = webhook.SecretKey ? webhook.SecretKey : "";
        break;

      default:
        dataRowField.FormattedValue = webhook[key]
          ? webhook[key].toString()
          : "";
        break;
    }
    return dataRowField;
  }

  //#endregion
}
