const production = process.env.NODE_ENV === 'production';
const express = require('express');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('./middlewares/auth-middleware');
const DataUploader = require('./data-uploader');
const bodyParser = require('body-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;
const publicPath = path.resolve(__dirname, 'public');

app.use(authMiddleware);
app.use('/', express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  const years = [];
  const thisYear = new Date().getFullYear();
  for (let i = 2013; i <= thisYear; i++) years.push(i);
  res.render('pages/index', { req: req, years });
});

const fields = upload.fields([{name: 'productionFile'}, {name: 'chartsFile'}]);
app.post('/upload_data', fields, (req, res) => {
  if (!req.files.productionFile && !req.files.chartsFile) {
    res.redirect(301, '/?error=no file selected');
    return;
  }
  const uploader = new DataUploader(req);

  uploader.writeFiles({
    success: () => {
      uploader.jekyllRebuild({
        success: () => res.redirect('/?success=true'),
        error: () => res.redirect(301, '/?error=jekyll-rebuild'),
      });
    },
    error: () => res.redirect(301, '/?error=files-write')
  });
});

// run the server
app.listen(port, '0.0.0.0', () => console.log(`Server running on ${port}`));
