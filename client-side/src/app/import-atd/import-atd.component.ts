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
import { KeyValuePair } from "@pepperi-addons/ngx-lib";
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

  conflictsList: Conflict[] = [];
  webhooks: Webhook[] = [];
  typeString = ``;
  typeUUID = ``;

  referenceMap: References;

  //   pepperiListOutputs: any = {
  //     notifyListChanged: (event) => {},
  //     notifySortingChanged: (event) => {},
  //     notifyFieldClicked: (event) => {},
  //     notifySelectedItemsChanged: (event) => {},
  //     notifyValueChanged: (event) => {
  //       //   let index = this.conflictsList.findIndex((x) => x.Name === event.ApiName);
  //       //   this.conflictsList[index].Resolution = ReferenceType[event.Value];
  //       // "{"Id":"7b5444dd-9b5c-4250-8420-6e9936b3eb7d","ApiName":"Resolution","Value":"1","ControlType":""}"
  //       //this.conflictsList.find(c => )
  //     },
  //     //this.selectedRowsChanged(event, translates),
  //   };

  constructor(
    //private translate: TranslateService,
    //private backendApiService: AddonApiService,
    //private userService: UserService,
    //public pluginService: PluginService,
    private importatdService: ImportAtdService
  ) {
    this.getActivityTypes();
  }

  elementClicked(event) {
    //debugger;
    this.selectedActivity = event.value;
    // alert("clicked");
  }
  getActivityTypes() {
    this.activityTypes = [];
    this.importatdService.getTypes((types) => {
      if (types) {
        types.sort((a, b) => a.Value.localeCompare(b.Value));
        this.activityTypes = [...types];
      }
    });
  }

  ngOnInit(): void {}

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
          conflict.Object === ReferenceType.toString(ReferenceType.FileStorage) // ReferenceType[ReferenceType.CustomizationFile]
        ) {
          debugger;
          let res = await this.upsertFileStorage(referenceIndex);
          let destinitionRef = {} as Reference;
          destinitionRef.ID = res.InternalID.toString();
          destinitionRef.Name = res.FileName;
          this.referenceMap.Mapping[
            referenceIndex
          ].Destination = destinitionRef;
        } else if (
          conflict.Object === ReferenceType.toString(ReferenceType.Filter)
        ) {
          let transactionItemScope = await this.getTransactionItemScope(
            this.selectedActivity
          );
          if (
            transactionItemScope === null ||
            transactionItemScope.length === 0
          ) {
            let res = await this.upsertTransactionItemScope(referenceIndex);
            let destinitionRef = {} as Reference;
            destinitionRef.ID = res.InternalID.toString();
            destinitionRef.Name = res.FileName;
            this.referenceMap.Mapping[
              referenceIndex
            ].Destination = destinitionRef;
          }
        } else if (
          conflict.Object ===
          ReferenceType.toString(ReferenceType.UserDefinedTable)
        ) {
          debugger;
          let res = await this.upsertUDT(referenceIndex);
          let destinitionRef = {} as Reference;
          destinitionRef.ID = res.InternalID.toString();
          destinitionRef.Name = res.TableID;
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
          let res = await this.importatdService.papiClient.fileStorage.upsert(
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
    const self = this;
    debugger;
    this.importatdService.papiClient.addons.api
      .uuid(this.importatdService.pluginUUID)
      .file("api")
      .func("upsert_to_dynamo")
      .post(
        { table: `importExportATD` },
        {
          Key: "resolution",
          Value: resulotion,
        }
      );

    debugger;
    if (this.webhooks.length > 0) {
      this.showConflictResolution = false;
      this.showWebhooksResolution = true;
    } else {
      this.callToImportATD();
    }
    console.log(this.referenceMap);
  }

  private async upsertUDT(referenceIndex: number) {
    let udt = JSON.parse(
      this.referenceMap.Mapping[referenceIndex].Origin.Content
    );
    delete udt.InternalID;
    let res = await this.importatdService.papiClient.metaData.userDefinedTables.upsert(
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
    let res = await this.importatdService.papiClient.post(
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
    debugger;
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
    let res = await this.importatdService.papiClient.fileStorage.upsert(file);
    console.log(
      `afetr posting file storage. body: ${JSON.stringify(
        file
      )}, res: ${JSON.stringify(res)}`
    );
    return res;
  }

  async getTransactionItemScope(subtype: string) {
    return await this.importatdService.papiClient.get(
      `/meta_data/lists/all_activities?where=Name='Transaction Item Scope'`
    );
  }

  async onOkWebhooksClicked() {
    let dynamoWebhooks = {};
    this.webhooks.forEach(async (webhook) => {
      debugger;
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
    debugger;
    this.importatdService.papiClient.addons.api
      .uuid(this.importatdService.pluginUUID)
      .file("api")
      .func("upsert_to_dynamo")
      .post(
        { table: `importExportATD` },
        {
          Key: "webhooks",
          Value: dynamoWebhooks,
        }
      );

    this.callToImportATD();
  }

  private async callToImportATD() {
    debugger;
    const presignedUrl = await this.importatdService.papiClient.post(
      `/file_storage/tmp`
    );
    await fetch(presignedUrl.UploadURL, {
      method: `PUT`,
      body: this.importatdService.exportedAtdstring,
    });

    let url = presignedUrl.DownloadURL;

    this.deleteContentFromMap();
    console.log(
      `calling to api\import_atd. body: url: ${url}, ReferencesMap: ${JSON.stringify(
        this.referenceMap
      )}`
    );
    const importAtdResult = this.importatdService.papiClient.addons.api
      .uuid(this.importatdService.pluginUUID)
      .file("api")
      .func("import_type_definition")
      .post(
        { type: this.typeString, subtype: this.selectedActivity },
        { URL: url, References: this.referenceMap }
      )
      .then(
        (res: any) => {
          if (res == "success") {
            const title = `success`;
            const content = `Import was finished succefully`;
            this.importatdService.openDialog(title, content);
          } else {
            const title = `Error`;
            const content = `An error occurred while importing`;
            this.importatdService.openDialog(title, content);
          }
          window.clearInterval();
          this.data = res;
        },
        (error) => {}
      );
  }

  private deleteContentFromMap() {
    this.referenceMap.Mapping.forEach((pair) => {
      // The content of the webhook reference should be sent in order to fix the workflow's actions
      if (pair.Destination.Type !== ReferenceType.Webhook) {
        delete pair.Destination.Content;
        delete pair.Origin.Content;
      }
    });
    this.referenceMap.Mapping.forEach((pair) => {
      if (pair.Destination.Type !== ReferenceType.Webhook) {
        delete pair.Destination.Path;
        delete pair.Origin.Path;
      }
    });
  }

  async onCancelClicked() {}

  async importAtd() {
    try {
      console.log(`selectedActivity: ${this.selectedActivity}`);

      await this.importatdService
        .getTypeOfSubType(this.selectedActivity)
        .subscribe((type) => {
          if (type.Type === 2) {
            this.typeString = `transactions`;
          } else {
            this.typeString = `activities`;
          }

          this.importatdService
            .callToServerAPI(
              "build_references_mapping",
              "POST",
              { subtype: this.selectedActivity },
              { references: this.importatdService.exportedAtd.References }
            )
            .subscribe((res) => {
              this.referenceMap = res;
              //   if (this.referenceMap && this.referenceMap.Mapping.length > 0) {
              //     let identifier: String = ``;
              //     this.conflictsList = await this.getConflictsResulotion(
              //       referenceMap
              //     );

              //     if (this.conflictsList && this.conflictsList.length > 0) {
              //       // get from dynamo
              //       let resolutionFromDynmo = await this.importatdService.papiClient.addons.api
              //         .uuid(this.importatdService.pluginUUID)
              //         .file("api")
              //         .func("get_from_dynamo")
              //         .get({ table: `importExportATD`, key: `resolution` });
              //       let webhooksFromDynmo = await this.importatdService.papiClient.addons.api
              //         .uuid(this.importatdService.pluginUUID)
              //         .file("api")
              //         .func("get_from_dynamo")
              //         .get({ table: `importExportATD`, key: `webhooks` });
              //       debugger;

              //       this.conflictsList.forEach((c) => {
              //         const val = resolutionFromDynmo[0].Value[c.ID];
              //         if (val != null && val != undefined) {
              //           c.Resolution = ResolutionOption.toString(val);
              //         }
              //       });

              //       this.webhooks.forEach((w) => {
              //         const val = webhooksFromDynmo[0].Value[w.UUID];
              //         if (val != null && val != undefined && val != {}) {
              //           w.Url = val.url;
              //           w.SecretKey = val.secretKey;
              //         }
              //       });

              //       this.showWebhooksResolution = false;
              //       this.showConflictResolution = true;
              //     } else if (this.webhooks.length > 0) {
              //       this.showConflictResolution = false;
              //       this.showWebhooksResolution = true;
              //     } else {
              //       this.callToImportATD();
              //     }
              //     //TODO
              //     //this.typesList ? this.typesList.reload() : null;
              //   }
            });
        });

      debugger;
    } catch {}
  }

  private async fillAtdNameAndUUID() {
    await this.importatdService.papiClient
      .get(`/types/${this.selectedActivity}`)
      .then((type) => {
        this.typeUUID = type.UUID;
        if (type.Type === 2) {
          this.typeString = `transactions`;
        } else {
          this.typeString = `activities`;
        }
      });
  }

  async getConflictsResulotion(referenceMap: References) {
    let conflicts: Conflict[] = [];

    const refMaps = this.importatdService.exportedAtd.References;

    for (let i = 0; i < refMaps.length; i++) {
      try {
        await this.handleReference(refMaps[i], conflicts, referenceMap);
      } catch (e) {
        throw e;
      }
    }

    // this.importatdService.exportedAtd.References.forEach(async (ref) => {
    //   await this.handleReference(ref, conflicts, referenceMap);
    // });

    return conflicts;
  }

  async handleReference(
    ref: Reference,
    conflicts: Conflict[],
    referenceMap: References
  ) {
    if (ref.Type !== ReferenceType.Webhook) {
      let referencedPair: Mapping = referenceMap.Mapping.find(
        (pair) => pair.Origin.ID === ref.ID || pair.Origin.Name === ref.Name
      );

      if (referencedPair.Destination === null) {
        // For objects with a path (such as custom form), if a matching object does not exist, then continue (create this object in the Execution step).
        if (
          ref.Type === ReferenceType.FileStorage ||
          ref.Type === ReferenceType.UserDefinedTable ||
          ref.Type === ReferenceType.Filter
        ) {
          const conflict: Conflict = {
            Name: ref.Name,
            Object: ReferenceType.toString(referencedPair.Origin.Type),
            Status: `Object not found`,
            Resolution: ResolutionOption.toString(ResolutionOption.CreateNew),
            UUID: Guid.newGuid(),
            ID: ref.ID,
            // this.resolutionOptions,
          };
          conflicts.push(conflict);
        } else {
          debugger;
          const title = `error`;
          const content = `No reference was found with the name: ${
            ref.Name
          } of type: ${ReferenceType.toString(ref.Type)}`;
          this.showWebhooksResolution = false;
          this.showConflictResolution = false;
          this.importatdService.openDialog(title, content);
          throw new Error(content);
        }
      } else if (referencedPair.Origin.ID === referencedPair.Destination.ID) {
        return;
      } else if (
        referencedPair.Origin.Name === referencedPair.Destination.Name
      ) {
        if (ref.Type === ReferenceType.FileStorage) {
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
        // } else {
        //   const conflict: Conflict = {
        //     Name: referencedPair.destinition.Name,
        //     Object: ReferenceType[referencedPair.destinition.Type],
        //     Status: `${
        //       ReferenceType[referencedPair.destinition.Type]
        //     } with the same name exists`,
        //     Resolution: null,
        //     UUID: Guid.newGuid(),
        //     ID: referencedPair.destinition.ID,
        //     // this.resolutionOptions,
        //   };
        //   conflicts.push(conflict);
        // }
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
        this.importatdService.exportedAtdstring = atob(
          file.fileStr.split(";")[1].split(",")[1]
        );
        this.importatdService.exportedAtd = JSON.parse(
          this.importatdService.exportedAtdstring
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
      this.importatdService.uploadFile(files[0]);
    }
  }
}
