const production = process.env.NODE_ENV === 'production';
const express = require('express');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('./middlewares/auth-middleware');
const DataUploader = require('./data-uploader');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;
const publicPath = path.resolve(__dirname, 'public');

app.use(authMiddleware);
app.use('/', express.static(publicPath));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  const years = [];
  const thisYear = new Date().getFullYear();
  for (let i = 2013; i <= thisYear; i++) years.push(i);
  res.render('pages/index', { req: req, years });
});

app.post('/upload_data', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.redirect(301, '/?error=no file selected');
    return;
  }
  const uploader = new DataUploader(req.file.path);

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
