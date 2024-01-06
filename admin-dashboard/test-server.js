const path = require('path');
const express = require('express');
const compression = require('compression');
const app = express();
app.use(compression());
app.use('/assets', express.static('assets'));
app.use('/notices', express.static('notices'));
app.use('/manifest.json', express.static(path.join(__dirname, 'src/manifest.json')));
app.use(express.static('dist'));
app.all('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});
app.listen(2576, () => console.log('listening on :2576'));
