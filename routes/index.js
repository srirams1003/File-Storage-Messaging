var express = require('express');
var router = express.Router();
const path = require("path");

router.use(
  express.static(path.join(__dirname, "../client/dist"))
);


/* GET home page. */
router.get('/', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  res.sendFile(
    path.join(__dirname, "../client/dist/index.html")
  );
});

module.exports = router;
