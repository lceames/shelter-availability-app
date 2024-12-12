import csv
import json

# List of Canadian cities
cities = [
    "toronto",
    "mississauga",
    "brampton",
    "markham",
    "vaughan",
    "richmond hill",
    "oakville",
    "burlington",
    "oshawa",
    "pickering",
]


def get_postal_codes():
    address_data_path = "./postal_codes.csv"
    postal_codes = {}

    with open(address_data_path, mode="r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
    
        # Access rows as dictionaries
        for row in reader:
            if row["CITY"].lower() in cities:
                postal_codes[row["POSTAL_CODE"].lower()] = {
                                     "lng": row["LONGITUDE"],
                                     "lat": row["LATITUDE"]}
                    
    # File path to save the JSON file
    file_path = "static/gta_postal_codes.json"

    # Write dictionary to JSON file
    with open(file_path, "w") as json_file:
        json.dump(postal_codes, json_file, indent=4)

get_postal_codes()
    