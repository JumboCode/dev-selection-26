import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine,
    Table,
    Column,
    Integer,
    Float,
    String,
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

# Shorter names for the columns
short_column_names = [
    "timestamp",
    "name",
    "board_rec",
    "pronouns",
    "email",
    "class_year",
    "underrep_group",
    "reason_join",
    "experience",
    "on_campus_this_sem",
    "on_campus_next_sem",
    "classes_taken",
    "technologies",
    "intro_cs",
    "proud_project",
    "links",
    "pref_lantern_club",
    "pref_speakout",
    "pref_homestart",
    "pref_casa_myrna",
    "pref_dress_for_success",
    "pref_sibling_conn",
    "pref_somerville_homeless",
    "pref_bi_women_qrtly",
    "pref_keep_mass",
    "pref_emerald_necklace",
    "pref_theatre_first",
    "pref_legacy_project",
    "elaborate_prefs",
    "uncomfortable_with",
    "additional_info",
]

full_to_short = dict(zip(full_column_names, short_column_names))
short_to_full = dict(zip(short_column_names, full_column_names))

SENSITIVE_COLS = ["timestamp", "name", "email", "uncomfortable_with"]

SENSITIVE_TABLE = "sensitive_application_data"
PMTL_TABLE = "pmtl_application_data"


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
    applications[FAKENAME_COL] = ""

    def get_fake_name(row):
        if not isinstance(row[PRONOUNS_COL], str):
            return fake_names.loc[row.name, FAKENAMES_NONBINARY_COL]
        elif "she" in row[PRONOUNS_COL].lower():
            return fake_names.loc[row.name, FAKENAMES_FEMALE_COL]
        elif "he" in row[PRONOUNS_COL].lower():
            return fake_names.loc[row.name, FAKENAMES_MALE_COL]
        else:
            return fake_names.loc[row.name, FAKENAMES_NONBINARY_COL]

    applications[FAKENAME_COL] = applications.apply(get_fake_name, axis=1)

    return applications


def infer_sqlalchemy_type(dtype):
    """Infer SQLAlchemy column type from a pandas dtype."""
    if pd.api.types.is_integer_dtype(dtype):
        return Integer
    elif pd.api.types.is_float_dtype(dtype):
        return Float
    elif pd.api.types.is_string_dtype(dtype):
        return String
    else:
        raise ValueError(f"Unsupported dtype: {dtype}")


def upload_table(db_engine, table_name, table_df):
    """Upload a DataFrame to a database table, replacing the table if it exists."""
    inspector = inspect(db_engine)
    metadata = MetaData(bind=db_engine)

    # Drop table if it exists
    if inspector.has_table(table_name):
        table = Table(table_name, metadata, autoload_with=db_engine)
        table.drop(db_engine)
        logging.info(f"Existing table '{table_name}' dropped.")
        metadata.clear()  # Clear metadata to avoid reusing the same table name
    
    # Create new table
    columns = [
        Column(name, infer_sqlalchemy_type(dtype))
        for name, dtype in table_df.dtypes.items()
    ]
    new_table = Table(table_name, metadata, *columns)
    new_table.create(db_engine)
    logging.info(f"New table '{table_name}' created.")

    # Upload DataFrame to the table
    table_df.to_sql(table_name, con=db_engine, if_exists="replace", index=False)
    logging.info(f"Data uploaded to '{table_name}' table.")


def database_upload(applications):
    """Upload application data to the database."""
    primary_key = FAKENAME_COL
    sensitive_data = applications[[primary_key] + SENSITIVE_COLS]
    pmtl_data = applications.drop(columns=SENSITIVE_COLS)

    load_dotenv()

    DB_URI = os.getenv("SUPABASE_DB_URI")
    if not DB_URI:
        logging.error(
            "No environment variable named SUPABASE_DB_URI; cannot connect to database"
        )
        return  # Exit function if DB_URI is not found

    # Establish database connection
    try:
        db_engine = create_engine(DB_URI)
    except Exception as e:
        logging.error(f"Failed to create database engine: {e}")
        return

    # Upload the sensitive and pmtl data tables
    try:
        upload_table(db_engine, SENSITIVE_TABLE, sensitive_data)
        upload_table(db_engine, PMTL_TABLE, pmtl_data)
        logging.info("Successfully uploaded application data to Supabase.")
    except Exception as e:
        logging.error(f"Failed to upload data: {e}")
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
    database_upload(applications)
    save_files(applications, short_to_full, output_dir)


if __name__ == "__main__":
    main()
