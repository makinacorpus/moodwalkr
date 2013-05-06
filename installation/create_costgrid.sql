CREATE TABLE cost_grid
(
  geom geometry(Geometry,900913),
  x integer,
  y integer,
  e_water integer DEFAULT 0,
  e_park integer DEFAULT 0,
  e_natural double precision DEFAULT 0,
  t_bus double precision DEFAULT 0,
  t_bicycle_rental double precision DEFAULT 0,
  t_heavy_transport double precision DEFAULT 0,
  t_highway double precision DEFAULT 1,
  a_shops double precision DEFAULT 0,
  a_leisure double precision DEFAULT 0,
  a_public_building double precision DEFAULT 0,
  a_food double precision DEFAULT 0,
  c_tourism double precision DEFAULT 0,
  c_pow double precision DEFAULT 0,
  test_tot double precision DEFAULT 0,
  test_nature double precision DEFAULT 0,
  test_activite double precision DEFAULT 0
);

INSERT INTO cost_grid (geom)
SELECT ST_Transform(ST_geomfromtext('POLYGON(('||X||' '||Y||', '||(X+50)||' '||Y||', '||(X+50)||' '||(Y+50)||', '||X||' '||(Y+50)||', '||X||' '||Y||'))',3035),900913)
	FROM generate_series(3621600,3637600,50) as X,
	generate_series(2307400,2325000,50) as Y;

CREATE INDEX cost_grid_geom_idx ON cost_grid USING gist(geom);
