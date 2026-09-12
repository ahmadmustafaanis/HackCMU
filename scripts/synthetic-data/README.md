# Synthetic Data Generator

Generates a synthetic `users` + `activities` dataset for seeding/demoing the
app locally. Stdlib-only Python, no dependencies.

## Run

```bash
python3 generate_data.py --users 1000 --activities 400 --seed 42
```

`--seed` is optional (omit for non-deterministic output). `--out-dir` overrides
the default `./output/`.

Output:
- `output/users.json`, `output/activities.json` — JSONL (one document per
  line), directly loadable with `mongoimport`.
- `output/users.pretty.json`, `output/activities.pretty.json` — indented JSON
  arrays, for humans.

## Load into MongoDB

```bash
mongoimport --db scotty --collection users --file output/users.json
mongoimport --db scotty --collection activities --file output/activities.json
```

## Recommended indexes (run in `mongosh`)

```js
use scotty
db.users.createIndex({ location: "2dsphere" })
db.activities.createIndex({ location: "2dsphere" })
db.activities.createIndex({ status: 1, created_at: -1 })
```

## Notes

- Locations are GeoJSON Points: `{ type: "Point", coordinates: [lng, lat] }`
  — longitude first. Clustered around 5 weighted Pittsburgh hotspots (CMU
  Campus, Downtown, Shadyside, South Side, North Oakland) with Gaussian
  jitter, so a heatmap over this data shows real hot/cold zones instead of a
  flat blob.
- `interests` (users) and `keywords` (activities) are drawn from the same
  fixed 32-tag vocabulary defined at the top of `generate_data.py`, so
  overlap between the two is meaningful for testing matching/recommendation
  logic.
- `activities.raw_text` is generated from varied sentence templates filled
  with that activity's own `keywords`, so it reads like a real post while
  still containing ground-truth tags — useful for validating an LLM-based
  keyword extractor against known-good labels.
- This dataset is for seeding/demo realism and is intentionally decoupled
  from the app's own `config/taxonomy.json` (the controlled vocabulary used
  by the matching algorithm's scoring) — the two vocabularies don't need to
  be identical.
