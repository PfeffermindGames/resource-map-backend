const production = process.env.NODE_ENV === 'production';
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authMiddleware = require('./middlewares/auth-middleware');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;
const jekyllProdDataPath =
  path.resolve(__dirname, '../doi-extractives-data/data/regional/production_TEST.tsv');

app.use(authMiddleware);
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('pages/index', { req: req });
});

app.post('/upload_data', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.redirect(301, '/?error=nofile')
    return;
  }
  fs.createReadStream(req.file.path)
    .pipe(fs.createWriteStream(jekyllProdDataPath));
  res.redirect('/?success=true');
});

// run the server
app.listen(port, '0.0.0.0', () => { console.log('Server running on ' + port) });
