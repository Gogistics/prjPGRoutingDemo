'use strict';

/* default setting */
var express = require('express'),
    path = require('path'),
    body_parser = require('body-parser'),
    app = express();

/* port setting */
const DEFAULT_PORT = 5300,
      PORT = process.env.PORT || DEFAULT_PORT;

/* pg setting */
var pg = require('pg'),
    connectionString = 'postgres://postgres:pgRouting168@172.17.0.13:5432/geo_test',
    client = new pg.Client(connectionString);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view options', {pretty: true});
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.render('index.jade', {title: 'pRouting Demo'});
});

app.post('/query-routing', function(req, res){
  // query process
  var results = [];
  client.connect(function(err, client, done){
    if(err){
      console.log(err);
      return res.status(500).json({ success: false, data: err});
    }

    var query = client.query("SELECT e.old_id AS id, e.name, e.type, e.oneway, sum(e.time) AS time, sum(e.distance) AS distance FROM pgr_dijkstra('SELECT id::INT4, source::INT4, target::INT4, time AS cost, CASE oneway WHEN ''yes'' THEN -1 ELSE time END AS reverse_cost FROM edges_noded', 500, 300, true, true) AS r, edges_noded AS e WHERE r.id2 = e.id GROUP BY e.old_id, e.name, e.type, e.oneway ORDER BY time;");
    // Stream results back one row at a time
    query.on('row', function(row) {
      console.log(row);
      results.push(row);
    });

    // After all data is returned, close connection and return results
    query.on('end', function() {
      console.log('done...results will be return ASAP');
      res.json(results);
    });
  });
});

app.listen(PORT)
console.log('Running at port:' + PORT);
