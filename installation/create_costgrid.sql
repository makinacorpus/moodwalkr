CREATE TABLE IF NOT EXISTS cost_grid
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
  c_heritage double precision DEFAULT 0,
  test_tot double precision DEFAULT 0,
  test_nature double precision DEFAULT 0,
  test_activite double precision DEFAULT 0,
  test_culture double precision DEFAULT 0
);


DO LANGUAGE plpgsql $$
BEGIN
    IF NOT EXISTS (SELECT 0 FROM pg_class where relname='cost_grid_geom_idx')
    THEN
        CREATE INDEX cost_grid_geom_idx ON cost_grid USING gist(geom);
    END IF;
END
$$;


