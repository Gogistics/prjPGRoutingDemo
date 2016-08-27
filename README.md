# PostGIS Tutorial based on BoundlessGeo Documents

1. Create Postgres and Postgis containers
   ```
   app@my_vm:# docker run --name <YOUR_CONTAINER_NAME> -e POSTGRES_PASSWORD=<YOUR_PASSWORD> -d mdillon/postgis
   ```
   
   Or (for pgRouting example)

   ```
   app@my_vm:# docker run --name postgres_pgrouting_pwd -e POSTGRES_PASSWORD=pgRouting168 -d starefossen/pgrouting
   ```

2. Download [data bundle](http://files.boundlessgeo.com/workshopmaterials/postgis-workshop-201401.zip) and read the [data introduction](http://workshops.boundlessgeo.com/postgis-intro/about_data.html)

3. Copy data into the container

   ```
   app@my_vm:# docker cp <SRC_PATH> <CONTAINER>:<DEST_PATH>
   ```
4. Get into the container and repeatly convert and import .shp files into PostgresDB

   ```
   app@my_vm:# docker exec -it <YOUR_CONTAINER_NAME> bash

   root@my_container:# createdb <MY_DB> -U <MY_USER>

   root@my_container:# psql <MY_DB> -U <MY_USER> -c "CREATE EXTENSION postgis"

   root@my_container:# psql <MY_DB> -U <MY_USER> -c "CREATE EXTENSION pgrouting"

   root@my_container:# shp2pgsql -s 4326 neighborhoods.shp public.neighborhoods | psql -d <MY_DB> -U <MY_USER>
   ```

   Or (for pgRouting example)

   ```
   root@my_container:# apt-get install gdal-bin

   root@my_container:# ogr2ogr -where "highway <> ''" -select 'name,highway,oneway,surface' -lco GEOMETRY=the_geom -lco FID=id -t_srs EPSG:3857 -f PostgreSQL PG:"dbname=routing user=postgres password=pgRouting168" -nln edges portland_maine.osm-line.shp
   ```

   If the name of the column which stores geometry data is not **the_geom**, alter the name by the following command

   ```
   root@my_container:# psql -U postgres -d geo_test

   geo_test=# ALTER TABLE public.edges RENAME COLUMN wkb_geometry TO the_geom; 
   ```

   Update table for further use

   ```
   geo_test=# ALTER TABLE edges ADD source INT4;

   geo_test=# ALTER TABLE edges ADD target INT4;

   geo_test=# SELECT pgr_createTopology('edges', 1);

   geo_test=# SELECT pgr_nodeNetwork('edges', 1);

   geo_test=# SELECT pgr_createTopology('edges_noded', 1);

   geo_test=# ALTER TABLE edges_noded ADD COLUMN name VARCHAR, ADD COLUMN type VARCHAR, ADD COLUMN oneway VARCHAR, ADD COLUMN surface VARCHAR;
   ```

   Create table for determining cost of travelling over any of the edges.

   ```
   geo_test=# ALTER TABLE edges_noded ADD distance FLOAT8;

   geo_test=# ALTER TABLE edges_noded ADD time FLOAT8;

   geo_test=# UPDATE edges_noded SET distance = ST_Length(ST_Transform(the_geom, 4326)::geography) / 1000;
   ```

   Find out all distinct road types

   ```
   geo_test=# SELECT distinct(type) FROM edges_noded;
   ```

   Results:
      ```
      primary

      secondary

      unclassified

      footway

      track

      motorway

      proposed

      abandoned

      tertiary

      trunk

      tertiary_link

      raceway

      motorway_link

      steps

      pedestrian

      bridleway

      secondary_link

      primary_link

      platform

      service

      cycleway

      trunk_link

      living_street

      path   

      residential

      corridor

      road   

      construction
      ```

   Set cost for distinct edges

   ```
   geo_test=# UPDATE edges_noded SET time = CASE type WHEN 'primary' THEN distance / 60 WHEN 'secondary' THEN distance / 45 WHEN 'unclassified' THEN -1 WHEN 'footway' THEN -1 WHEN 'track' THEN distance  / 20 WHEN 'motorway' THEN distance / 70 WHEN 'proposed' THEN -1 WHEN 'abandoned' THEN -1 WHEN 'tertiary' THEN distance / 45 WHEN 'trunk' THEN distance / 60 WHEN 'tertiary_link' THEN distance / 40 WHEN 'raceway' THEN distance / 100 WHEN 'motorway_link' THEN distance / 70 WHEN 'steps' THEN -1 WHEN 'pedestrian' THEN -1 WHEN 'bridleway' THEN distance / 10 WHEN 'secondary_link' THEN distance / 45 WHEN 'primary_link' THEN distance / 60 WHEN 'platform' THEN -1 WHEN 'service' THEN distance / 30 WHEN 'cycleway' THEN distance / 20 WHEN 'trunk_link' THEN distance / 60 WHEN 'living_street' THEN distance / 5 WHEN 'path' THEN distance / 5 WHEN 'residential' THEN distance / 25 WHEN 'corridor' THEN -1 WHEN 'road' THEN distance / 35 WHEN 'construction' THEN -1 ELSE distance / 10 END;
   ```
   
   Test whether the routing works by **pgr_dijkstra** function

   ```
   geo_test=# SELECT id1 AS vertex, id2 AS edge, cost FROM pgr_dijkstra('SELECT id::INT4, source::INT4, target::INT4, time AS cost FROM edges_noded', 500, 300, false, false) ORDER BY time;

   geo_test=# SELECT id1 AS vertex, id2 AS edge, cost FROM pgr_dijkstra('SELECT id::INT4, source::INT4, target::INT4, time AS cost, CASE oneway WHEN ''yes'' THEN -1 ELSE time END AS reverse_cost FROM edges_noded', 500, 300, true, true) ORDER BY time;

   geo_test=# SELECT e.old_id AS id, e.name, e.type, e.oneway, sum(e.time) AS time, sum(e.distance) AS distance FROM pgr_dijkstra('SELECT id::INT4, source::INT4, target::INT4, time AS cost, CASE oneway WHEN ''yes'' THEN -1 ELSE time END AS reverse_cost FROM edges_noded', 500, 300, true, true) AS r, edges_noded AS e WHERE r.id2 = e.id GROUP BY e.old_id, e.name, e.type, e.oneway ORDER BY time;
   ```

6. Nearest-Neighbour Searching and Shortest Path Search

   Nearest Point Search-

   Result will be used as **source** in Shortest Path Search

   ```
   DROP TABLE IF EXISTS temp_source;

   SELECT

     v.id,

     v.the_geom,

     e.source,

     e.target,

     string_agg(distinct(e.name),',') AS name
   
   INTO temp_source

   FROM

     edges_noded_vertices_pgr AS v,

     edges_noded AS e

   WHERE

     v.id = (SELECT

               id

             FROM edges_noded_vertices_pgr

             ORDER BY the_geom <-> ST_SetSRID( ST_Transform( ST_SetSRID(ST_MakePoint(-122.386985, 37.591391),4326) , 3857 ), 3857) LIMIT 1)

   AND (e.source = v.id OR e.target = v.id)

   GROUP BY v.id, v.the_geom, e.source, e.target LIMIT 1;
   ```

   Result will be used as **target** in Shortest Path Search

   ```
   DROP TABLE IF EXISTS temp_target;

   SELECT

     v.id,

     v.the_geom,

     e.source,

     e.target,

     string_agg(distinct(e.name),',') AS name

   INTO temp_target

   FROM

     edges_noded_vertices_pgr AS v,

     edges_noded AS e

   WHERE

     v.id = (SELECT

               id

             FROM edges_noded_vertices_pgr

             ORDER BY the_geom <-> ST_SetSRID( ST_Transform( ST_SetSRID(ST_MakePoint(-122.406040, 37.629400),4326) , 3857 ), 3857) LIMIT 1)

   AND (e.source = v.id OR e.target = v.id)

   GROUP BY v.id, v.the_geom, e.source, e.target LIMIT 1;
   ```

   Shorest Path Search-

   ```
   SELECT

     min(r.seq) AS seq,

     e.old_id::INT4 AS id,

     e.name,

     e.type,

     e.oneway,

     sum(e.time) AS time,

     sum(e.distance) AS distance,

   ST_AsGeoJSON (ST_Transform ( ST_Collect(e.the_geom), 4326)) AS geom

   FROM pgr_dijkstra('SELECT id::INT4, source::INT4, target::INT4, time AS cost, CASE oneway WHEN ''yes'' THEN -1 ELSE time END AS reverse_cost FROM edges_noded', (SELECT source FROM temp_source), (SELECT target FROM temp_target), true, true) AS r, edges_noded AS e
   
   WHERE r.id2 = e.id

   GROUP BY e.old_id, e.name, e.type, e.oneway;
   ```


Ref.

[pgRouting](https://github.com/pgRouting/pgrouting)

[pgRouting Manual- pgr_createTopology](http://docs.pgrouting.org/2.2/en/src/topology/doc/pgr_createTopology.html)

[pgrouting Manual- pgr_dijkstra](http://docs.pgrouting.org/2.0/en/src/dijkstra/doc/index.html)

[Nearest-Neighbour Searching](http://workshops.boundlessgeo.com/postgis-intro/knn.html#index-based-knn)

[Docker pgRouting Image](https://github.com/Starefossen/docker-pgrouting)

[Docker PostGIS Image](https://hub.docker.com/r/mdillon/postgis/)

[PostGIS Workshop-1](http://workshops.boundlessgeo.com/postgis-intro/)

[PostGIS Workshop-2](http://workshops.boundlessgeo.com/)

[PostGIS Workshop-3](http://workshops.boundlessgeo.com/tutorial-routing/)

[docker cp](https://docs.docker.com/engine/reference/commandline/cp/)
