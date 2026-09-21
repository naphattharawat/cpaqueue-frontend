var express = require('express')
var path = require('path');
var app = express()
require('dotenv').config();
var browserDist = path.join(__dirname, 'dist', 'cpaqueue', 'browser');
app.use('/queue', express.static(browserDist));
app.use(express.static(browserDist));

app.get('/{*splat}', function (req, res) {
  res.sendFile(path.join(browserDist, 'index.html'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err);
  res.send({ ok: false, error: err.message })
});

let port = process.env.PORT || 3001;

app.listen(port, function () {
  console.log(`web listening on port ${port}!`)
});
