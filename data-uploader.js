const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');
const exec = require('child_process').exec;
const shell = require('shelljs');
const YAML = require('yamljs');

const jekyllAppPath = path.resolve(__dirname, '../doi-extractives-data');
const jekyllConfig = YAML.load(path.resolve(jekyllAppPath, '_config.yml'));

module.exports = class DataUploader {
  constructor(req) {
    const { productionFile, chartsFile } = req.files;
    this.productionFile = productionFile ? productionFile[0] : null;
    this.chartsFile = chartsFile ? chartsFile[0] : null;
    this.year = req.body.year;
  }

  writeFiles(callbacks) {
    if (this.productionFile) this.writeProductionFiles();
    if (this.chartsFile) this.writeChartFiles();
    this.updateConfig();
    callbacks.success();
  }

  updateConfig() {
    console.log('Updating configs...');
    const parseYearFromFName = (fileName) => {
      const fileNameSplit = fileName.split('/');
      return fileNameSplit[fileNameSplit.length - 1].split('.')[0];
    };

    // production config
    let prodYears = shell.ls(
      path.resolve(jekyllAppPath, `data/regional/production/*.tsv`)
    ).map(parseYearFromFName).sort();

    fs.writeFileSync(
      path.resolve(jekyllAppPath, '_data/production.yml'),
      YAML.stringify({ years: prodYears })
    );

    // charts config
    let chartYears = shell.ls(
      path.resolve(jekyllAppPath, `data/regional/charts/*.json`)
    ).map(parseYearFromFName).sort();

    fs.writeFileSync(
      path.resolve(jekyllAppPath, '_data/charts.yml'),
      YAML.stringify({ years: chartYears })
    );
  }

  writeChartFiles() {
    console.log('writting charts data...');
    const workbook = XLSX.readFile(this.chartsFile.path);
    const chartsJson = this.parseCharts(workbook.Sheets);

    // write yearly json
    fs.writeFileSync(
      path.resolve(jekyllAppPath, `data/regional/charts/${this.year}.json`),
      JSON.stringify(chartsJson)
    );

    // write individual yearly tsv
    this.parseChartsTsv(workbook.Sheets).forEach((chart, i) => {
      fs.writeFileSync(
        path.resolve(jekyllAppPath, `data/regional/charts/${this.year}-chart${i + 1}.tsv`),
        chart
      );
    });
  }

  writeProductionFiles() {
    console.log('writting prod data...');
    const workbook = XLSX.readFile(this.productionFile.path);

    if (!workbook.Sheets['production']) {
      console.log('wrong format...');
      return;
    }
    const productionTsv = XLSX.utils.sheet_to_csv(
      workbook.Sheets['production'], { FS: '\t' }
    );

    fs.writeFileSync(
      path.resolve(jekyllAppPath, `data/regional/production/${this.year}.tsv`),
      productionTsv
    );

    const years = shell.ls(path.resolve(jekyllAppPath, `data/regional/production/*.tsv`));
    const allYearsProd = years.map((e) => e).sort().map((fileName, i) => {
      const fileNameSplit = fileName.split('/');
      const year = fileNameSplit[fileNameSplit.length - 1].replace('.tsv', '');
      let data = shell.cat(fileName);
      if (i !== 0) {
        data = data.split('\n').slice(1).join('\n');
      }
      return this.addYearColumnToTsv(year, data, i === 0);
    }).join('');

    fs.writeFileSync(
      path.resolve(jekyllAppPath, `data/regional/production.tsv`),
      allYearsProd
    );
  }

  addYearColumnToTsv(year, tsvStr, withHeader) {
    return tsvStr.split('\n').map((line, i) => {
      return i === 0 && withHeader ? `Year\t${line}` : (
        line.length > 0 ? `${year}\t${line}` : ''
      );
    }).join('\n');
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
    const index = XLSX.utils.sheet_to_json(sheets['charts-index']);

    for (let i = 1; chart; i++, chart = sheets[`chart${i}`]) {
      const categs = sheets[`chart${i}-categs`];
      const chartInfo = index[i - 1];
      chartsArr.push({
        title: chartInfo.title,
        title_en: chartInfo.title_en,
        data: XLSX.utils.sheet_to_json(chart),
        categories: XLSX.utils.sheet_to_json(categs),
      });
    }
    return chartsArr;
  }

  parseChartsTsv(sheets) {
    let chartsArr = [];
    let chart = sheets['chart1'];
    for (let i = 1; chart; i++, chart = sheets[`chart${i}`]) {
      chartsArr.push(
        XLSX.utils.sheet_to_csv(chart, { FS: '\t' })
      );
    }
    return chartsArr;
  }
}
