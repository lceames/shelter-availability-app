import requests, json
from datetime import datetime, timedelta
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os
import logging
import random
from dotenv import load_dotenv

load_dotenv()

logging.getLogger('werkzeug').setLevel(logging.WARNING)

app = Flask(__name__)
CORS(app)

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

today_date = datetime.now()
TODAY_DATE_STRING = today_date.strftime("%Y-%m-%d")
YESTERDAY_DATE_STRING = (today_date - timedelta(days=1)).strftime("%Y-%m-%d")

from dataclasses import dataclass
from typing import List, Optional

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

    def __post_init__(self):
        self.availableBeds = 0 if not self.availableBeds else int(self.availableBeds)
        self.totalBeds = 0 if not self.totalBeds else int(self.totalBeds)
        self.availableRooms = 0 if not self.availableRooms else int(self.availableRooms)
        self.totalRooms = 0 if not self.totalRooms else int(self.totalRooms)

def space_available(record, availability_key):
    if availability_key not in record or not record[availability_key]:
        print(UNEXPECTED_SCHEMA_ERROR_MESSAGE)
    try:
        return int(record[availability_key]) > 0 
    except:
        print(UNEXPECTED_SCHEMA_ERROR_MESSAGE)
        return False
    
def get_current_records():
    params =  { "id": "daily-shelter-overnight-service-occupancy-capacity"}
    package = requests.get(PACKAGE_URL, params = params).json()

    try: 
        resource = [r for r in package['result']['resources'] if r['name'].lower() == RESOURCE_NAME][0]
    except:
        print(UNEXPECTED_SCHEMA_ERROR_MESSAGE)

    datastore_sort = f"{OCCUPANCY_DATE_KEY} desc"
    datastore_params = { "id": resource["id"], "sort":  datastore_sort, "limit": 500}
    datastore_records = requests.get(DATASTORE_URL, params=datastore_params).json()["result"]['records']
    current_records = [r for r in datastore_records if r[OCCUPANCY_DATE_KEY] == TODAY_DATE_STRING]
    if not current_records:
        current_records = [r for r in datastore_records if r[OCCUPANCY_DATE_KEY] == YESTERDAY_DATE_STRING]
    return current_records

def fetch_available_rooms():
    """Fetches available rooms and beds from current records based on capacity type."""
    current_records = get_current_records()
    bed_based_availabilities = []
    room_based_availabilities = []

    for record in current_records:
        capacity_type = record.get(CAPACITY_TYPE_KEY)
        if capacity_type == ROOM_BASED_CAPACITY:
            unoccupied_key = UNOCCUPIED_ROOMS_KEY
            availabilities = room_based_availabilities
        elif capacity_type == BED_BASED_CAPACITY:
            unoccupied_key = UNOCCUPIED_BEDS_KEY
            availabilities = bed_based_availabilities
        else:
            continue

        if not record.get(unoccupied_key):
            print(UNEXPECTED_SCHEMA_ERROR_MESSAGE)
            continue
        
        if space_available(record=record, availability_key=unoccupied_key):
            availabilities.append(Shelter(name=record[ORGANIZATION_NAME_KEY], 
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

    return bed_based_availabilities + room_based_availabilities

@app.route('/api/shelters')
def get_shelters():
    print('Received request')
    available_rooms = fetch_available_rooms()
    return jsonify(available_rooms)

if __name__ == "__main__":
    app.run(debug=True)