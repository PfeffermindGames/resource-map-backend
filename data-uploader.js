const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');
const exec = require('child_process').exec;

const jekyllAppPath = path.resolve(__dirname, '../doi-extractives-data');

module.exports = class DataUploader {
  constructor(fileName) {
    const workbook = XLSX.readFile(fileName);
    this.productionTsv = XLSX.utils.sheet_to_csv(workbook.Sheets['production'], { FS: '\t' });
    this.charts = this.parseCharts(workbook.Sheets);
  }

  writeFiles(callbacks) {
    let filesToWrite = 2;
    const jekyllProdDataPath = path.resolve(jekyllAppPath, 'data/regional/production.tsv');
    fs.writeFile(jekyllProdDataPath, this.productionTsv, (error) => {
      if (error) {
        console.log(`Error: ${error}`);
        callbacks.error();
      } else {
        filesToWrite--;
        if (filesToWrite === 0) callbacks.success();
      }
    });

    const jekyllChartDataPath = path.resolve(jekyllAppPath, 'data/regional/charts.json');
    fs.writeFile(jekyllChartDataPath, JSON.stringify(this.charts), (error) => {
      if (error) {
        console.log(`Error: ${error}`);
        callbacks.error();
      } else {
        filesToWrite--;
        if (filesToWrite === 0) callbacks.success();
      }
    });
  }

  jekyllRebuild(callbacks) {
    console.log('Rebuilding Jekyll app...');

    exec(`cd ${jekyllAppPath}; jekyll clean; jekyll build`, (error, stdout, stderr) => {
      console.log(`stout: ${stdout}\nstderr: ${stderr}`);

      if (error) {
        console.log(`Error: ${error}`);
        callbacks.error();
      } else {
        callbacks.success();
      }
    });
  }

  parseCharts(sheets) {
    let chartsArr = [];
    let chart = sheets['chart1'];
    for (let i = 1; chart; i++, chart = sheets[`chart${i}`]) {
      const categs = sheets[`chart${i}-categs`];
      chartsArr.push({
        data: XLSX.utils.sheet_to_json(chart),
        categories: XLSX.utils.sheet_to_json(categs),
      });
    }
    return chartsArr;
  }
}
