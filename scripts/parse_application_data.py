import pandas as pd
import argparse, logging, sys

FAKENAMES_FEMALE_COL = "Female Names"
FAKENAMES_MALE_COL = "Male Names"
FAKENAMES_NONBINARY_COL = "Non-Binary Names"

PRONOUNS_COL = "Pronouns"
FAKENAME_COL = "Fake Name"


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
    args = parser.parse_args()

    applications_csv = pd.read_csv(args.applications_csv)
    fake_names = pd.read_csv(args.fake_names)

    return applications_csv, fake_names

def add_fake_names(applications, fake_names):
    # Initialize the fake name column
    applications[FAKENAME_COL] = ""
    
    # Apply a function to determine the fake name based on pronouns
    def get_fake_name(row):
        if not isinstance(row[PRONOUNS_COL], str):
            return fake_names.loc[row.name, FAKENAMES_NONBINARY_COL]
        elif "she" in row[PRONOUNS_COL].lower():
            return fake_names.loc[row.name, FAKENAMES_FEMALE_COL]
        elif "he" in row[PRONOUNS_COL].lower():
            return fake_names.loc[row.name, FAKENAMES_MALE_COL]
        else:
            return fake_names.loc[row.name, FAKENAMES_NONBINARY_COL]
    
    # Use apply to assign fake names
    applications[FAKENAME_COL] = applications.apply(get_fake_name, axis=1)

    return applications

def main():
    applications, fake_names = open_files()
    add_fake_names(applications, fake_names)    
    applications.to_csv("test.csv")

if __name__ == "__main__":
    main()
