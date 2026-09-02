import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine,
    Table,
    MetaData,
    inspect,
)
import argparse, os, json, logging

FAKENAMES_FEMALE_COL = "Female Names"
FAKENAMES_MALE_COL = "Male Names"
FAKENAMES_NONBINARY_COL = "Non-Binary Names"

FAKENAME_COL = "fake_name"
PRONOUNS_COL = "Pronouns"

full_column_names = [
    "Timestamp",
    "Full Name",
    "Board Recommended?",
    "Pronouns",
    "Email Address",
    "Class Year",
    "Do you identify as a member of an underrepresented group in STEM?",
    "Why do you want to join JumboCode? What do you hope to gain by joining the club?",
    "What's your experience with volunteering, working with non-profits, community engagement, and/or social good activism?",
    "Will you be in person on campus this semester?",
    "Do you expect to be in person on campus next semester?",
    "Which of the following classes have you taken?",
    "List any technologies you're comfortable with:",
    "What was your first introduction to computer science?",
    "Tell us about a project you're proud of",
    "If you have any links to share with us (e.g. GitHub), please share them here:",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [The Lantern Club (Sristi Panchu, Thomas Lai)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [SpeakOUT Boston (Aidan Banerjee, Jimmy Maslen)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [HomeStart (Rebecca Dinsmore, Rusny Rahman)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Casa Myrna (Elizabeth Foster, Nishika Pabba)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Dress for Success (Jyoti Bhardwaj, TBA)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Sibling Connections (Ella Lesperance, Nate Nameth)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Somerville Homeless Coalition (Cameron Yuen, Henry Gray)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Bi-women Quarterly (Austen Money, Shreyas Ravi)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Keep Mass Beautiful (Anneka Le, Matt Torres)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Emerald Necklace Conservancy (Ben Skinner, Roger Burtonpatel)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [Theatre@First (Liam Strand, Amitav Nott)]",
    "Please rank your project preferences (1 being your first choice, and 12 being your last choice) [The Legacy Project (Kim Nguyen, Nick Doan)]",
    "Please elaborate on your preferences here:",
    "Is there anyone (in JumboCode or another applicant) you would feel uncomfortable working with for any reason? Feel free to elaborate on the situation as much or as little as you wish.",
    "Is there anything else you want to add/want us to know?",
]

short_column_names = [
    "timestamp",
    "full_name",
    "board_recommended",
    "pronouns",
    "email",
    "class_year",
    "underrepresented_group_in_stem",
    "why_join_jumbocode",
    "volunteering_experience",
    "in_person_this_semester",
    "in_person_next_semester",
    "classes_taken",
    "technologies",
    "intro_to_cs",
    "project_proud_of",
    "links",
    "rank_lantern_club",
    "rank_speakout_boston",
    "rank_homestart",
    "rank_casa_myrna",
    "rank_dress_for_success",
    "rank_sibling_connections",
    "rank_somerville_homeless",
    "rank_biwomen_quarterly",
    "rank_keep_mass_beautiful",
    "rank_emerald_necklace",
    "rank_theatre_first",
    "rank_legacy_project",
    "preferences_elaboration",
    "uncomfortable_with",
    "additional_info",
]

full_to_short = dict(zip(full_column_names, short_column_names))
short_to_full = dict(zip(short_column_names, full_column_names))

SENSITIVE_COLS = ["timestamp", "full_name", "email", "uncomfortable_with"]

SENSITIVE_TABLE = "sensitive_application_data"
PMTL_TABLE = "pmtl_application_data"
SELECTION_TABLES = ("developer_selections", "dev_selections")

def open_files():
    parser = argparse.ArgumentParser(
        description="Processes raw form data from JumboCode Applications for use in a developer selection database system."
    )
    parser.add_argument(
        "applications_csv",
        metavar="applications_csv_file",
        type=str,
        help="CSV file with all of the raw form data (save csv from Google sheets)",
    )
    parser.add_argument(
        "fake_names",
        metavar="fake_names_csv",
        type=str,
        help="CSV file with three columns of fake names: female, male, and non-binary",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        type=str,
        default=os.getcwd(),
        help="Optional directory to save processed files. Defaults to the current directory.",
    )
    args = parser.parse_args()

    applications_csv = pd.read_csv(args.applications_csv)

    fake_names = pd.read_csv(args.fake_names)

    output_dir = args.output_dir

    return applications_csv, fake_names, output_dir


def add_fake_names(applications, fake_names):
    applications[FAKENAME_COL] = fake_names["characters"]

    return applications


TEAM_COL = "confirmed_team"


def add_app_status_fields(applications):
    applications[TEAM_COL] = ""


def upload_table(db_engine, table_name, table_df):
    """Replace table rows while preserving constraints, RLS, and relationships."""
    inspector = inspect(db_engine)
    if inspector.has_table(table_name):
        metadata = MetaData()
        table = Table(table_name, metadata, autoload_with=db_engine)
        unknown_columns = set(table_df.columns) - set(table.columns.keys())
        if unknown_columns:
            raise ValueError(
                f"Table '{table_name}' is missing columns: "
                + ", ".join(sorted(unknown_columns))
            )

        with db_engine.begin() as connection:
            connection.execute(table.delete())
            table_df.to_sql(
                table_name,
                con=connection,
                if_exists="append",
                index=False,
            )
    else:
        table_df.to_sql(table_name, con=db_engine, if_exists="fail", index=False)

    logging.info(f"Data uploaded to '{table_name}' table.")


def clear_existing_selections():
    """Clear selections before importing a new application cohort."""
    load_dotenv()
    db_uri = os.getenv("SUPABASE_DB_URI")
    if not db_uri:
        raise RuntimeError("SUPABASE_DB_URI is required")

    db_engine = create_engine(db_uri)
    try:
        inspector = inspect(db_engine)
        with db_engine.begin() as connection:
            for table_name in SELECTION_TABLES:
                if inspector.has_table(table_name):
                    table = Table(table_name, MetaData(), autoload_with=db_engine)
                    connection.execute(table.delete())
                    logging.info(f"Existing rows in '{table_name}' cleared.")
    finally:
        db_engine.dispose()


def table_upload(table_name, table_data):
    """Upload application data to the database."""

    load_dotenv()

    DB_URI = os.getenv("SUPABASE_DB_URI")
    if not DB_URI:
        logging.error(
            "No environment variable named SUPABASE_DB_URI; cannot connect to database"
        )
        return  # Exit function if DB_URI is not found

    print(f"Connecting to database at {DB_URI}")

    # Establish database connection
    try:
        db_engine = create_engine(DB_URI)
    except Exception as e:
        print(f"Failed to create database engine: {e}")
        return
    print("Database engine created successfully.")

    # Upload the sensitive and pmtl data tables
    try:
        upload_table(db_engine, table_name, table_data)
        print("Successfully uploaded application data to Supabase.")
    except Exception as e:
        print(f"Failed to upload data: {e}")
    finally:
        db_engine.dispose()


def save_files(applications, short_to_full, output_dir):
    applications.to_csv(os.path.join(output_dir, "parsed_jc_applications.csv"))

    with open(os.path.join(output_dir, "short_cols_to_full.json"), "w") as outfile:
        json.dump(short_to_full, outfile)


def main():
    applications, fake_names, output_dir = open_files()
    add_fake_names(applications, fake_names)
    applications = applications.rename(columns=full_to_short)
    add_app_status_fields(applications)

    primary_key = FAKENAME_COL
    sensitive_data = applications[[primary_key] + SENSITIVE_COLS]
    pmtl_data = applications.drop(columns=SENSITIVE_COLS)

    clear_existing_selections()
    table_upload(SENSITIVE_TABLE, sensitive_data)
    table_upload(PMTL_TABLE, pmtl_data)
    save_files(applications, short_to_full, output_dir)


if __name__ == "__main__":
    main()
