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

client.connect(function(err, client, done){
  if(err) console.log(err);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view options', {pretty: true});
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.render('index.jade', {title: 'pgRouting Demo'});
});

app.post('/query-routing', function(req, res){
  // query process
  var results = [];

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

app.post('/query-nearest-neighbor', function(req, res){
  var lat = req.body.lat,
      lng = req.body.lng;

  if(lat && lng){
    searchNearestPoint(lat, lng, function(status_code, results){
      res.status(status_code).json(results);
    });
  }else{
    res.status(500).json({message: 'wrong lat and lng'});
  }
});

app.post('/query-shortest-path', function(req, res){
  var source_lat = req.body.source_lat,
      source_lng = req.body.source_lng,
      target_lat = req.body.target_lat,
      target_lng = req.body.target_lng;

  if(source_lat && source_lng && target_lat && target_lng){
    searchShortestPath( {lat: source_lat, lng: source_lng}, {lat: target_lat, lng: target_lng}, function(status_code, results){
      res.status(status_code).json(results);
    });
  }else{
    res.status(500).json({message: 'wrong lat and lng'});
  }
});

function searchNearestPoint(arg_lat, arg_lng, callback){
  var results = [];

  var query_str = "DROP TABLE IF EXISTS temp_source; SELECT v.id, ST_AsText (ST_Transform (v.the_geom, 4326)) AS lat_lng, e.source, e.target, string_agg(distinct(e.name),',') AS name INTO temp_source FROM edges_noded_vertices_pgr AS v, edges_noded AS e WHERE v.id = (SELECT id FROM edges_noded_vertices_pgr ORDER BY the_geom <-> ST_SetSRID( ST_Transform( ST_SetSRID(ST_MakePoint(" + arg_lng + ", " + arg_lat + "),4326) , 3857 ), 3857) LIMIT 1) AND (e.source = v.id OR e.target = v.id) GROUP BY v.id, v.the_geom, e.source, e.target LIMIT 1; SELECT source,target,name FROM temp_source";
  var query = client.query(query_str);

  // Stream results back one row at a time
  query.on('row', function(row) {
    console.log(row);
    results.push(row);
  });

  // After all data is returned, close connection and return results
  query.on('end', function() {
    console.log('done...results will be return ASAP');
    callback(200, results);
  });
}

function searchShortestPath(arg_source_lat_lng, arg_target_lat_lng, callback){
  var results = [];

  var query_str = "DROP TABLE IF EXISTS temp_source; SELECT v.id, v.the_geom, e.source, e.target, string_agg(distinct(e.name),',') AS name INTO temp_source FROM edges_noded_vertices_pgr AS v, edges_noded AS e WHERE v.id = (SELECT id FROM edges_noded_vertices_pgr ORDER BY the_geom <-> ST_SetSRID( ST_Transform( ST_SetSRID(ST_MakePoint(" + arg_source_lat_lng.lng + ", " + arg_source_lat_lng.lat + "),4326) , 3857 ), 3857) LIMIT 1) AND (e.source = v.id OR e.target = v.id) GROUP BY v.id, v.the_geom, e.source, e.target LIMIT 1;";
  query_str += "DROP TABLE IF EXISTS temp_target; SELECT v.id, v.the_geom, e.source, e.target, string_agg(distinct(e.name),',') AS name INTO temp_target FROM edges_noded_vertices_pgr AS v, edges_noded AS e WHERE v.id = (SELECT id FROM edges_noded_vertices_pgr ORDER BY the_geom <-> ST_SetSRID( ST_Transform( ST_SetSRID(ST_MakePoint(" + arg_target_lat_lng.lng + ", " + arg_target_lat_lng.lat + "),4326) , 3857 ), 3857) LIMIT 1) AND (e.source = v.id OR e.target = v.id) GROUP BY v.id, v.the_geom, e.source, e.target LIMIT 1;";
  query_str += "SELECT min(r.seq) AS seq, e.old_id::INT4 AS id, e.name, e.type, e.oneway, sum(e.time) AS time, sum(e.distance) AS distance, ST_AsGeoJSON ( ST_Transform ( ST_Collect(e.the_geom), 4326)) AS geom FROM pgr_dijkstra('SELECT id::INT4, source::INT4, target::INT4, time AS cost, CASE oneway WHEN ''yes'' THEN -1 ELSE time END AS reverse_cost FROM edges_noded', (SELECT source FROM temp_source), (SELECT target FROM temp_target), true, true) AS r, edges_noded AS e WHERE r.id2 = e.id GROUP BY r.seq, e.old_id, e.name, e.type, e.oneway ORDER BY r.seq;";

  var query = client.query(query_str);

  // Stream results back one row at a time
  query.on('row', function(row) {
    console.log(row);
    results.push(row);
  });

  // After all data is returned, close connection and return results
  query.on('end', function() {
    console.log('done...results will be return ASAP');
      callback(200, results);
  });
}

/* query of service zones */
app.post('/insert-new-service-zone', function(req, res){
  var geojson = req.body;
  insertNewZone(geojson, function(status_code, results){
    res.status(status_code).send(results);
  });
});

app.post('/query-service-zone', function(req, res){
  var geoinfo = req.body;
  isGivenPointwithinServiceZones(geoinfo, function(status_code, results){
    res.status(status_code).send(results);
  });
});

// init table service zones
function initQueryServiceZonesTable(){
  var query_str = "CREATE TABLE IF NOT EXISTS service_zones(name VARCHAR(128), zone GEOMETRY(POLYGON,4326));";
  var query = client.query(query_str);

  query.on('row', function(row){
    console.log(row);
  });

  query.on('end', function(){
    console.log('initQueryServiceZonesTable is done');
  });
}
initQueryServiceZonesTable();

function insertNewZone(arg_params, callback){
  var results = [];
  if( !(typeof arg_params.region_name === 'string' || arg_params.region_name instanceof String) ||
      !(arg_params.polygon && (arg_params.polygon.constructor == Array || arg_params.polygon instanceof Array)) ){
    callback(500, results);
  }else{
    var name = arg_params.region_name,
        region = JSON.stringify(arg_params.polygon);

    var command = 'INSERT INTO service_zones (name,zone) ' +
                  'SELECT \'' + name + '\',ST_GeomFromGeoJSON(\'{"type":"Polygon","coordinates":[' + region + '],"crs":{"type":"name","properties":{"name":"EPSG:4326"}}}\') ' +
                  'WHERE NOT EXISTS (SELECT name FROM service_zones WHERE name = \'' + name + '\');';
    var query = client.query(command);

    query.on('row', function(row){
      results.push(row);
    });

    query.on('end', function(){
      console.log('done...results will be return ASAP');
      callback(200, results);
    });
  }
}

function isGivenPointwithinServiceZones(arg_params, callback){
  var results = [];
  if(!arg_params.lat || !arg_params.lng){
    callback(500, results);
  }else{
    var lat = arg_params.lat, lng = arg_params.lng;
    var command = 'SELECT name,ST_AsGeoJSON(zone) as region FROM service_zones WHERE ST_Contains(zone, ST_GeomFromText(\'POINT(' + lat + ' ' + lng + ')\', 4326));';

    var query = client.query(command);
    query.on('row', function(row){
      results.push(row);
    })

    query.on('end', function(){
      console.log('done...results will be return ASAP');
      callback(200, results);
    })
  }
}

// have app listen to port
app.listen(PORT, function(){
  console.log('Running at port:' + PORT);
});
