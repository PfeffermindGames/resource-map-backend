const production = process.env.NODE_ENV === 'production';
const express = require('express');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;
const multer = require('multer');
const authMiddleware = require('./middlewares/auth-middleware');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;
const jekyllAppPath = path.resolve(__dirname, '../doi-extractives-data');
const jekyllProdDataPath = path.resolve(jekyllAppPath, 'data/regional/production.tsv');

app.use(authMiddleware);
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('pages/index', { req: req });
});

app.post('/upload_data', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.redirect(301, '/?error=nofile');
    return;
  }
  fs.createReadStream(req.file.path)
    .pipe(fs.createWriteStream(jekyllProdDataPath));

  console.log('Rebuilding Jekyll app...');

  exec(`cd ${jekyllAppPath}; jekyll clean; jekyll build`, (error, stdout, stderr) => {
    console.log(`stout: ${stdout}\nstderr: ${stderr}`);

    if (error !== null) {
      res.redirect(301, '/?error=jekyll-rebuild');
    } else {
      res.redirect('/?success=true');
    }
  });
});

// run the server
app.listen(port, '0.0.0.0', () => console.log(`Server running on ${port}`));
