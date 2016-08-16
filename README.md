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
4. Go into container and repeatly convert and import .shp files into PostgresDB

   ```
   app@my_vm:# docker exec -it <YOUR_CONTAINER_NAME> bash

   root@my_container:# createdb <MY_DB>

   root@my_container:# psql <MY_DB> -c "CREATE EXTENSION postgis"

   root@my_container:# psql <MY_DB> -c "CREATE EXTENSION pgrouting"

   root@my_container:# shp2pgsql -s 4326 neighborhoods public.neighborhoods | psql -d <MY_DB> -U <MY_USER>
   ```

   Or (for pgRouting example)

   ```
   root@my_container:# apt-get install gdal-bin

   root@my_container:# ogr2ogr -where "highway <> ''" -select 'name,highway,oneway,surface' -lco GEOMETRY=the_geom -lco FID=id -t_srs EPSG:3857 -f PostgreSQL PG:"dbname=routing user=postgres password=pgRouting168" -nln edges portland_maine.osm-line.shp

   edges=# ALTER TABLE public.edges RENAME COLUMN wkb_geometry TO the_geom; 
   ```

Ref.

[pgRouting](https://github.com/pgRouting/pgrouting)

[Docker pgRouting Image](https://github.com/Starefossen/docker-pgrouting)

[Docker PostGIS Image](https://hub.docker.com/r/mdillon/postgis/)

[PostGIS Workshop-1](http://workshops.boundlessgeo.com/postgis-intro/)

[PostGIS Workshop-2](http://workshops.boundlessgeo.com/)

[docker cp](https://docs.docker.com/engine/reference/commandline/cp/)
