# JumboCode Developer Selection Fall 2024

A web-based system to anonymously select developers for JumboCode teams.

## Restoring the database
I've included a database backup file for PostgreSQL database in the root directory of this project. I used Supabase as the database provider for 2024, but the backup should work for any Postgres instance.

## How to upload applications to the dev selection database
1. Clone the repository
2. Create a `.env` file in the root directory with the following entries:
  - SUPABASE_DB_URI (uri to directly access the supabase DB)
3. In the root directory run `run_scripts.ps1` (if on Windows) or `python ./scripts/parse_application_data.py ./data/test_applications.csv ./data/names_list.csv`. To dump script outputs in a directory other than the root, specify an absolute path using the `-o` flag.
For help on how to run the Python script, run `python ./scripts/parse_application_data.py -h`.
