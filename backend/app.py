import logging
from dataclasses import dataclass
from typing import Optional
import requests, json, os, random
from datetime import datetime, timedelta
from collections import defaultdict
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import logging
from dotenv import load_dotenv
from urllib.error import HTTPError
from flask import send_from_directory
from typing import Optional, Tuple
from dataclasses import dataclass
import googlemaps

load_dotenv()

logging.getLogger('werkzeug').setLevel(logging.WARNING)

if os.environ.get('DEBUG'):
    print("Debug mode is enabled")
    debug_pin = f"{random.randint(100, 999)}-{random.randint(100, 999)}-{random.randint(100, 999)}"
    os.environ['WERKZEUG_DEBUG_PIN'] = debug_pin
    logging.getLogger('werkzeug').setLevel(logging.DEBUG)
    print(f"Debugger PIN: {debug_pin}")


app = Flask(__name__)
CORS(app)
_gta_postal_codes = None
app.static_folder = "static"

BASE_URL = "https://ckan0.cf.opendata.inter.prod-toronto.ca"
PACKAGE_URL = BASE_URL + "/api/3/action/package_show"
DATASTORE_URL = BASE_URL + "/api/3/action/datastore_search"
ROOM_BASED_CAPACITY = 'Room Based Capacity'
BED_BASED_CAPACITY = 'Bed Based Capacity'
TOTAL_BEDS_KEY = 'CAPACITY_ACTUAL_BED'
TOTAL_ROOMS_KEY = 'CAPACITY_ACTUAL_ROOM'
UNOCCUPIED_ROOMS_KEY = 'UNOCCUPIED_ROOMS'
UNOCCUPIED_BEDS_KEY = 'UNOCCUPIED_BEDS'
CAPACITY_TYPE_KEY = 'CAPACITY_TYPE'
OCCUPANCY_DATE_KEY = 'OCCUPANCY_DATE'
ORGANIZATION_NAME_KEY = 'LOCATION_NAME'
ORGANIZATION_ADDRESS_KEY = 'LOCATION_ADDRESS'
ORGANIZATION_POSTAL_CODE_KEY = 'LOCATION_POSTAL_CODE'
SECTOR_KEY = 'SECTOR'
SERVICE_TYPE_KEY = 'OVERNIGHT_SERVICE_TYPE'
UNEXPECTED_SCHEMA_ERROR_MESSAGE = 'Unexpected API response schema'
RESOURCE_NAME = 'daily shelter overnight occupancy'

gmaps = googlemaps.Client(key=os.environ['GOOGLE_MAPS_API_KEY'])

POSTAL_CODES_PATH = os.path.join(app.static_folder, 'gta_postal_codes.json')

@dataclass
class Shelter:
    name: str
    address: str
    postalCode: str
    sector: str
    capacityType: str
    serviceType: str
    availableBeds: int
    totalBeds: int
    availableRooms: int
    totalRooms: int
    lat: Optional[float] = None
    lng: Optional[float] = None

    def __post_init__(self) -> None:
        try:
            self.postalCode = self.postalCode.lower() if self.postalCode else None
            self.availableBeds = max(0, int(self.availableBeds)) if self.availableBeds else 0
            self.totalBeds = max(0, int(self.totalBeds)) if self.totalBeds else 0
            self.availableRooms = max(0, int(self.availableRooms)) if self.availableRooms else 0
            self.totalRooms = max(0, int(self.totalRooms)) if self.totalRooms else 0

            if self.lat is not None and not (-90 <= self.lat <= 90):
                raise ValueError("Latitude must be between -90 and 90 degrees.")
            if self.lng is not None and not (-180 <= self.lng <= 180):
                raise ValueError("Longitude must be between -180 and 180 degrees.")
        except Exception as e:
            logging.error(f"Error initializing Shelter: {e}")

def load_postal_codes():
    if _gta_postal_codes is None:
        with open(POSTAL_CODES_PATH, 'r') as f:
            _data_cache = json.load(f)
    return _data_cache

def write_postal_codes(postal_codes):
    with open(POSTAL_CODES_PATH, 'w') as f:
        f.write(json.dumps(postal_codes))

def space_available(record, availability_key):
    if availability_key not in record or not record[availability_key]:
        print(UNEXPECTED_SCHEMA_ERROR_MESSAGE)
    try:
        return int(record[availability_key]) > 0 
    except:
        print(UNEXPECTED_SCHEMA_ERROR_MESSAGE)
        return False
    
def fetch_data_from_toronto_api() -> Tuple[str, list[Shelter]]:
    params =  { "id": "daily-shelter-overnight-service-occupancy-capacity"}
    try:    
        package = requests.get(PACKAGE_URL, params = params).json()
    except HTTPError as e:
        logging.error(e)

    try: 
        resource = [r for r in package['result']['resources'] if r['name'].lower() == RESOURCE_NAME][0]
    except:
        logging.error(UNEXPECTED_SCHEMA_ERROR_MESSAGE)

    datastore_sort = f"{OCCUPANCY_DATE_KEY} desc"
    datastore_params = { "id": resource["id"], "sort":  datastore_sort, "limit": 500}
    records = requests.get(DATASTORE_URL, params=datastore_params).json()["result"]['records']
    shelters_by_date = defaultdict(list)
    for record in records:
        shelters_by_date[record[OCCUPANCY_DATE_KEY]].append(Shelter(
            name=record[ORGANIZATION_NAME_KEY], 
            address=record[ORGANIZATION_ADDRESS_KEY],
            postalCode=record[ORGANIZATION_POSTAL_CODE_KEY],
            availableBeds=record[UNOCCUPIED_BEDS_KEY],
            totalBeds=record[TOTAL_BEDS_KEY],
            availableRooms=record[UNOCCUPIED_ROOMS_KEY],
            totalRooms=record[TOTAL_ROOMS_KEY],
            serviceType=record[SERVICE_TYPE_KEY],
            capacityType=record[CAPACITY_TYPE_KEY],
            sector=record[SECTOR_KEY]
            ))
    update_dates = sorted(shelters_by_date.keys(), key=lambda x: datetime.strptime(x, '%Y-%m-%d'))
    if update_dates:
        return update_dates[-1], shelters_by_date[update_dates[-1]]
    else:
        return None, []

def fetch_geocoordinates_from_postal_code(postal_code) -> Tuple[str, str]:
    try:
        geocode_result = gmaps.geocode(postal_code)
        location = geocode_result[0]["geometry"]["location"]
        return location['lat'], location['lng']
    except HTTPError as e:
        logging.error(e)


def add_geocordinates_to_shelters(shelters: list[Shelter]) -> list[Shelter]:
    known_postal_coordinates = load_postal_codes()
    new_postal_coordinates = {}
    for shelter in shelters:
        if not shelter.postalCode:
            continue
        elif shelter.postalCode in known_postal_coordinates:
            shelter.lat, shelter.lng = known_postal_coordinates[shelter.postalCode]["lat"], known_postal_coordinates[shelter.postalCode]["lng"]
        else: 
            lat, lng = fetch_geocoordinates_from_postal_code(shelter.postalCode)
            shelter.lat, shelter.lng = lat, lng
            new_postal_coordinates[shelter.postalCode] = {'lat': shelter.lat, 'lng': shelter.lng}
    if new_postal_coordinates:
        updated_coordinates = new_postal_coordinates | known_postal_coordinates
        write_postal_codes(updated_coordinates)
    
    return shelters

@app.route('/api/shelters')
def get_shelters():
    print('Received request')
    update_date, available_shelters = fetch_data_from_toronto_api()
    shelters_with_geo = add_geocordinates_to_shelters(available_shelters)
    return jsonify({"shelterAvailabilities": shelters_with_geo, "updateDate": update_date})

@app.route("/<path:path>")
def serve_react(path):
    return send_from_directory("frontend/build", path)

@app.route("/")
def serve_index():
    return send_from_directory("frontend/build", "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)