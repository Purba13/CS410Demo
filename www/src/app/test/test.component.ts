import { Component, OnInit, ViewChild } from '@angular/core';
import { Model } from '../model';
import { Classification } from '../classification';
import { ModelService } from '../model.service';
import { UploadEvent, FileSystemFileEntry } from 'ngx-file-drop';
import { GridOptions, RowNode } from 'ag-grid-community';
import { Classifier } from '../classifier';
import { HttpClient } from '@angular/common/http';
import { AgGridNg2 } from 'ag-grid-angular';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ClassifierResult } from '../classifier-result';
import { Papa } from 'ngx-papaparse';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

class Result {
  value : string;
}


@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.less']
})
export class TestComponent implements OnInit {
  @ViewChild('agGrid') agGrid: AgGridNg2;

  models: Model[];
  selectedModel: Model;
  modelFile: File;
  classifierResults: ClassifierResult;
  classificationResultsUrl: any;
  classLabelResultsUrl: any;
  predictions : Classification[] = [];
  error: string;
  info: string;
  gridOptions: GridOptions;

  rowData:any =  [];
  columnDefs = [
    {headerName: 'Prediction', field: 'prediction' },
    {headerName: 'Label', field: 'label'},
    {headerName: 'Result', field: 'result'},
    {headerName: 'Text', field: 'text' }
  ];
  resultToFilter: Result =  {value: "All"};
  results :Result[] = [
    {
      value: "All"
    },
    {
      value: "Positive"
    },
    {
      value: "Negative"
    }
  ];

  constructor(private modelService : ModelService, private http: HttpClient, private papa : Papa, private sanitizer : DomSanitizer) { 
  }

  ngOnInit() {
    this.gridOptions = {
      onGridReady: function (params) {
        params.api.sizeColumnsToFit();

        window.addEventListener('resize', function() {
          setTimeout(function() {
            params.api.sizeColumnsToFit();
          })
        })
      },
      animateRows: true,
      isExternalFilterPresent: this.isExternalFilterPresent.bind(this),
      doesExternalFilterPass: this.doesExternalFilterPass.bind(this)
    };

    this.getModels();
  }
  
  isExternalFilterPresent() : boolean {
    return this.resultToFilter.value != "All";
  }

  doesExternalFilterPass(node : RowNode) : boolean {
    return this.resultToFilter.value == "All"  ? true : node.data.result == this.resultToFilter.value;
  }

  updateFilter(filterValue : string) : void {
    this.gridOptions.api.onFilterChanged();
  }

  getModels(): void {
    this.modelService.getModels()
      .subscribe(models => { 
        this.models = models
      });
  }

  private handleResults(result : ClassifierResult) : void {
    this.info = null;
    this.predictions = result.classifications;
    this.gridOptions.api.setRowData(this.predictions);
    this.gridOptions.api.sizeColumnsToFit();
    this.classifierResults = result;
    this.classificationResultsUrl = this.generateCsvBlobUrl(this.classifierResults.classifications);
    this.classLabelResultsUrl = this.generateCsvBlobUrl(this.classifierResults.classificationMatrix);
    console.log(this.classifierResults);
  }

  private runTest(dataFile : File) : void {
    if (this.modelFile)
    {
      this.modelService.predictFromModelFile(dataFile, this.modelFile).subscribe(result => this.handleResults(result));
    }
    else if (this.selectedModel)
    {
      this.modelService.predict(dataFile, this.selectedModel).subscribe(result => this.handleResults(result));
    }
  }

  private generateCsvBlobUrl(object : any) : SafeUrl {
    var blob = new Blob([this.papa.unparse({
      fields: [ "prediction", "label", "result", "text"],
      data: object
    })], {
      type: "text/csv"
    });

    return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
  }

  public selectedModelChanged() : void {
    if (this.selectedModel)
    {
      this.modelFile = null;
    }
  }
  
  public dataFileDropped(event: UploadEvent) {
    for (const droppedFile of event.files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          this.info = "Running model against test data "  + file.name + "..."
          this.runTest(file)
        });
      }
    }
  }
  public modelFileDropped(event: UploadEvent) {
    for (const droppedFile of event.files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          console.log(droppedFile.relativePath, file);
          this.modelFile = file

          if (this.selectedModel)
          {
            this.selectedModel = null;
          }
        });
      }
    }
  }
}
