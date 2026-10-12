"""Generate area-level synthetic monthly pothole-report history for Pakistan.

Nationwide geography: Province, City, Area. Stdlib only. Does not train a model.

The 12-month window matches generate_maintenance_data.py:
  2025-09-01 through 2026-08-01 inclusive.

Run from backend/:
  python -m app.ml.generate_maintenance_data_v2
  python app/ml/generate_maintenance_data_v2.py
"""

from __future__ import annotations

import csv
import random
from collections import Counter
from datetime import date
from pathlib import Path

SEED = 42
N_MONTHS = 12
END_MONTH = date(2026, 8, 1)
MONSOON_MONTHS = frozenset({6, 7, 8, 9})

ROAD_BASELINE = {
    "Highway": 22.0,
    "Service Road": 12.0,
    "Simple Road": 8.0,
}
TIER_SCALE = {
    "mega": 1.48,
    "large": 1.10,
    "medium": 0.90,
    "small": 0.76,
}
SLOPE_TIER = {
    "mega": 1.30,
    "large": 1.12,
    "medium": 1.0,
    "small": 0.80,
}

# Cities whose area lists were supplied up front. They may exceed 10 areas.
# Every other city is kept in the 4–10 band.
LISTED_CITIES = frozenset(
    {
        "Lahore",
        "Karachi",
        "Islamabad",
        "Rawalpindi",
        "Faisalabad",
        "Peshawar",
        "Multan",
        "Hyderabad",
        "Quetta",
    }
)

PROVINCE_ORDER = ("Punjab", "Sindh", "KPK", "Balochistan", "ICT", "GB", "AJK")

# province, city, tier, climate, [(area, road_type), ...]
# climate: wet = northern/eastern monsoon belt, arid = south-west and rain shadow,
# moderate = everyone else.
CITIES: list[tuple[str, str, str, str, list[tuple[str, str]]]] = [
    (
        "Punjab",
        "Lahore",
        "mega",
        "wet",
        [
            ("Gulberg", "Service Road"),
            ("DHA", "Simple Road"),
            ("Johar Town", "Simple Road"),
            ("Model Town", "Simple Road"),
            ("Garden Town", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Manawan", "Simple Road"),
            ("Shalimar", "Simple Road"),
            ("Samanabad", "Simple Road"),
            ("Iqbal Town", "Simple Road"),
            ("Wapda Town", "Simple Road"),
            ("Bahria Town", "Simple Road"),
            ("Township", "Simple Road"),
            ("Faisal Town", "Simple Road"),
            ("Shadman", "Service Road"),
            ("Ravi Road", "Highway"),
            ("Thokar Niaz Baig", "Service Road"),
            ("Walton", "Service Road"),
            ("Mughalpura", "Service Road"),
            ("Baghbanpura", "Simple Road"),
            ("Harbanspura", "Simple Road"),
            ("Valencia", "Simple Road"),
            ("Sabzazar", "Simple Road"),
            ("Ichhra", "Service Road"),
            ("Mozang", "Service Road"),
            ("Kot Lakhpat", "Service Road"),
            ("Raiwind Road", "Highway"),
            ("Ferozepur Road", "Highway"),
            ("Multan Road", "Highway"),
            ("Canal Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Rawalpindi",
        "large",
        "wet",
        [
            ("Saddar", "Service Road"),
            ("Satellite Town", "Simple Road"),
            ("Westridge", "Simple Road"),
            ("Chaklala", "Service Road"),
            ("Committee Chowk", "Service Road"),
            ("Raja Bazaar", "Service Road"),
            ("Bahria Town", "Simple Road"),
            ("Adiala Road", "Highway"),
            ("Peshawar Road", "Highway"),
            ("Murree Road", "Highway"),
            ("Dhoke Hassu", "Simple Road"),
            ("Lalkurti", "Service Road"),
            ("Tench Bhatta", "Service Road"),
            ("Sadiqabad", "Service Road"),
        ],
    ),
    (
        "Punjab",
        "Faisalabad",
        "large",
        "moderate",
        [
            ("D Ground", "Service Road"),
            ("Peoples Colony", "Simple Road"),
            ("Jinnah Colony", "Simple Road"),
            ("Madina Town", "Simple Road"),
            ("Millat Town", "Simple Road"),
            ("Samanabad", "Simple Road"),
            ("Susan Road", "Service Road"),
            ("Jaranwala Road", "Highway"),
            ("Sargodha Road", "Highway"),
            ("Canal Road", "Highway"),
            ("Civil Lines", "Service Road"),
            ("Ghulam Muhammad Abad", "Simple Road"),
            ("Samundri Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Multan",
        "large",
        "moderate",
        [
            ("Cantt", "Service Road"),
            ("Gulgasht Colony", "Simple Road"),
            ("Shah Rukn-e-Alam Colony", "Simple Road"),
            ("Bosan Road", "Highway"),
            ("Nusrat Road", "Highway"),
            ("Vehari Road", "Highway"),
            ("Abdali Road", "Highway"),
            ("LMQ Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Gujranwala",
        "large",
        "wet",
        [
            ("Satellite Town", "Simple Road"),
            ("Model Town", "Simple Road"),
            ("Peoples Colony", "Simple Road"),
            ("DC Colony", "Simple Road"),
            ("Wapda Town", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Rahwali", "Service Road"),
            ("GT Road", "Highway"),
            ("Sialkot Road", "Highway"),
            ("Sheikhupura Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Sialkot",
        "medium",
        "wet",
        [
            ("Cantt", "Service Road"),
            ("Model Town", "Simple Road"),
            ("Hajipura", "Simple Road"),
            ("Shahabpura", "Simple Road"),
            ("Rangpura", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Paris Road", "Service Road"),
            ("Kashmir Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Gujrat",
        "medium",
        "wet",
        [
            ("Marghzar Colony", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Railway Road", "Service Road"),
            ("GT Road", "Highway"),
            ("Bhimber Road", "Highway"),
            ("Jalalpur Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Sargodha",
        "medium",
        "moderate",
        [
            ("Satellite Town", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Queens Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Club Road", "Service Road"),
            ("University Road", "Highway"),
            ("Fatima Jinnah Road", "Highway"),
            ("Lahore Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Bahawalpur",
        "medium",
        "arid",
        [
            ("Model Town", "Simple Road"),
            ("Satellite Town", "Simple Road"),
            ("Baghdad-ul-Jadeed", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Ahmadpur Road", "Highway"),
            ("Circular Road", "Highway"),
            ("Yazman Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Sahiwal",
        "medium",
        "moderate",
        [
            ("Farid Town", "Simple Road"),
            ("Fateh Sher Colony", "Simple Road"),
            ("High Street", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Railway Road", "Service Road"),
            ("GT Road", "Highway"),
            ("Pakpattan Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Sheikhupura",
        "medium",
        "wet",
        [
            ("Housing Colony", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Railway Road", "Service Road"),
            ("Lahore Road", "Highway"),
            ("Faisalabad Road", "Highway"),
            ("Jandiala Road", "Highway"),
            ("Farooqabad Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Rahim Yar Khan",
        "medium",
        "arid",
        [
            ("Satellite Town", "Simple Road"),
            ("Model Town", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Club Road", "Service Road"),
            ("Abu Dhabi Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Khanpur Road", "Highway"),
            ("Sadiqabad Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Kasur",
        "medium",
        "wet",
        [
            ("Kot Murad Khan", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Railway Road", "Service Road"),
            ("Ferozepur Road", "Highway"),
            ("Raiwind Road", "Highway"),
            ("Khudian Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Okara",
        "medium",
        "moderate",
        [
            ("Cantt", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("GT Road", "Highway"),
            ("Depalpur Road", "Highway"),
            ("Faisalabad Road", "Highway"),
            ("Renala Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Wah Cantonment",
        "medium",
        "wet",
        [
            ("Lala Rukh", "Simple Road"),
            ("Nawababad", "Simple Road"),
            ("Officers Colony", "Simple Road"),
            ("Aslam Market", "Service Road"),
            ("GT Road", "Highway"),
            ("Taxila Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Jhelum",
        "medium",
        "wet",
        [
            ("Machine Mohalla", "Simple Road"),
            ("Kala Gujran", "Simple Road"),
            ("Tahlianwala", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Cantt", "Service Road"),
            ("Railway Road", "Service Road"),
            ("GT Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Dera Ghazi Khan",
        "medium",
        "arid",
        [
            ("Model Town", "Simple Road"),
            ("Pull Dat", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("College Road", "Service Road"),
            ("Multan Road", "Highway"),
            ("Sakhi Sarwar Road", "Highway"),
            ("Taunsa Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Chakwal",
        "small",
        "wet",
        [
            ("Civil Lines", "Service Road"),
            ("Talagang Road", "Highway"),
            ("Bhoun Road", "Highway"),
            ("Rawalpindi Road", "Highway"),
            ("Jhelum Road", "Highway"),
            ("Choa Saidan Shah Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Mianwali",
        "small",
        "arid",
        [
            ("Eidgah", "Simple Road"),
            ("Civil Lines", "Service Road"),
            ("Chashma Road", "Highway"),
            ("Sargodha Road", "Highway"),
            ("Kalabagh Road", "Highway"),
            ("Isa Khel Road", "Highway"),
        ],
    ),
    (
        "Punjab",
        "Taxila",
        "small",
        "wet",
        [
            ("HIT Colony", "Simple Road"),
            ("Museum Road", "Service Road"),
            ("HMC Road", "Service Road"),
            ("Railway Road", "Service Road"),
            ("GT Road", "Highway"),
            ("Wah Road", "Highway"),
            ("Khanpur Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Karachi",
        "mega",
        "moderate",
        [
            ("Saddar", "Service Road"),
            ("Clifton", "Service Road"),
            ("DHA", "Simple Road"),
            ("Gulshan-e-Iqbal", "Simple Road"),
            ("Gulistan-e-Jauhar", "Simple Road"),
            ("North Nazimabad", "Simple Road"),
            ("Nazimabad", "Simple Road"),
            ("Korangi", "Service Road"),
            ("Landhi", "Service Road"),
            ("Malir", "Simple Road"),
            ("Orangi Town", "Simple Road"),
            ("Lyari", "Service Road"),
            ("Liaquatabad", "Service Road"),
            ("FB Area", "Simple Road"),
            ("PECHS", "Service Road"),
            ("Bahadurabad", "Service Road"),
            ("Tariq Road", "Service Road"),
            ("SITE", "Service Road"),
            ("Surjani Town", "Simple Road"),
            ("North Karachi", "Simple Road"),
            ("New Karachi", "Simple Road"),
            ("Shah Faisal Colony", "Simple Road"),
            ("Baldia", "Simple Road"),
            ("Scheme 33", "Simple Road"),
            ("Gulshan-e-Maymar", "Simple Road"),
            ("Malir Cantt", "Service Road"),
            ("Shahrah-e-Faisal", "Highway"),
            ("Super Highway", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Hyderabad",
        "large",
        "moderate",
        [
            ("Qasimabad", "Simple Road"),
            ("Latifabad", "Simple Road"),
            ("Hirabad", "Service Road"),
            ("Saddar", "Service Road"),
            ("Pakka Qila", "Service Road"),
            ("Autobhan Road", "Highway"),
            ("Thandi Sarak", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Sukkur",
        "medium",
        "arid",
        [
            ("Barrage Colony", "Simple Road"),
            ("Military Road", "Service Road"),
            ("Station Road", "Service Road"),
            ("Barrage Road", "Highway"),
            ("Shikarpur Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Rohri Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Larkana",
        "medium",
        "arid",
        [
            ("Lahori Mohalla", "Simple Road"),
            ("Station Road", "Service Road"),
            ("Jinnah Bagh Road", "Service Road"),
            ("Naudero Road", "Highway"),
            ("Moenjo Daro Road", "Highway"),
            ("Ratodero Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Nawabshah",
        "medium",
        "arid",
        [
            ("Station Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Sakrand Road", "Highway"),
            ("Sanghar Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Qazi Ahmed Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Mirpur Khas",
        "medium",
        "moderate",
        [
            ("Satellite Town", "Simple Road"),
            ("Station Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Hyderabad Road", "Highway"),
            ("Umerkot Road", "Highway"),
            ("Digri Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Khairpur",
        "medium",
        "arid",
        [
            ("Station Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Sukkur Road", "Highway"),
            ("Gambat Road", "Highway"),
            ("Kot Diji Road", "Highway"),
            ("Thari Mirwah Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Jacobabad",
        "medium",
        "arid",
        [
            ("Station Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Quetta Road", "Highway"),
            ("Sukkur Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Thul Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Thatta",
        "small",
        "arid",
        [
            ("Civil Lines", "Service Road"),
            ("Makli Road", "Highway"),
            ("Karachi Road", "Highway"),
            ("Hyderabad Road", "Highway"),
            ("Sujawal Road", "Highway"),
            ("Keenjhar Road", "Highway"),
        ],
    ),
    (
        "Sindh",
        "Dadu",
        "small",
        "arid",
        [
            ("Station Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Indus Highway", "Highway"),
            ("Sehwan Road", "Highway"),
            ("Mehar Road", "Highway"),
            ("Johi Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Peshawar",
        "large",
        "wet",
        [
            ("University Town", "Simple Road"),
            ("Hayatabad", "Simple Road"),
            ("Tehkal", "Simple Road"),
            ("Saddar", "Service Road"),
            ("Gulbahar", "Service Road"),
            ("Ring Road", "Highway"),
            ("Charsadda Road", "Highway"),
            ("Dalazak Road", "Highway"),
            ("Kohat Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Mardan",
        "medium",
        "wet",
        [
            ("Sheikh Maltoon Town", "Simple Road"),
            ("Baghdada", "Simple Road"),
            ("Par Hoti", "Simple Road"),
            ("Shamsi Road", "Service Road"),
            ("Cantt", "Service Road"),
            ("Nowshera Road", "Highway"),
            ("Katlang Road", "Highway"),
            ("Swat Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Abbottabad",
        "medium",
        "wet",
        [
            ("Jinnahabad", "Simple Road"),
            ("Mandian", "Simple Road"),
            ("Nawansher", "Simple Road"),
            ("Supply Bazaar", "Service Road"),
            ("Cantt", "Service Road"),
            ("Mansehra Road", "Highway"),
            ("Murree Road", "Highway"),
            ("Kakul Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Mingora",
        "medium",
        "wet",
        [
            ("Fizagat", "Simple Road"),
            ("Qambar", "Simple Road"),
            ("Amankot", "Simple Road"),
            ("Saidu Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Mingora Bypass", "Highway"),
        ],
    ),
    (
        "KPK",
        "Kohat",
        "medium",
        "moderate",
        [
            ("Jungle Khel", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Bannu Road", "Highway"),
            ("Hangu Road", "Highway"),
            ("Peshawar Road", "Highway"),
            ("Lachi Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Dera Ismail Khan",
        "medium",
        "moderate",
        [
            ("Kachi Paind Khan", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Topanwala", "Service Road"),
            ("Bannu Road", "Highway"),
            ("Tank Road", "Highway"),
            ("Circular Road", "Highway"),
            ("University Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Bannu",
        "medium",
        "moderate",
        [
            ("Township", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Railway Road", "Service Road"),
            ("Lakki Road", "Highway"),
            ("Kohat Road", "Highway"),
            ("Miranshah Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Nowshera",
        "medium",
        "wet",
        [
            ("Nowshera Kalan", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Amangarh", "Service Road"),
            ("GT Road", "Highway"),
            ("Risalpur Road", "Highway"),
            ("Jehangira Road", "Highway"),
            ("Akora Khattak Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Mansehra",
        "medium",
        "wet",
        [
            ("Main Bazaar", "Service Road"),
            ("Karakoram Highway", "Highway"),
            ("Abbottabad Road", "Highway"),
            ("Balakot Road", "Highway"),
            ("Shinkiari Road", "Highway"),
            ("Baffa Road", "Highway"),
            ("Oghi Road", "Highway"),
        ],
    ),
    (
        "KPK",
        "Swabi",
        "small",
        "wet",
        [
            ("Main Bazaar", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Mardan Road", "Highway"),
            ("Jehangira Road", "Highway"),
            ("Topi Road", "Highway"),
            ("Yar Hussain Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Quetta",
        "large",
        "arid",
        [
            ("Satellite Town", "Simple Road"),
            ("Cantt", "Service Road"),
            ("Jinnah Road", "Highway"),
            ("Sariab Road", "Highway"),
            ("Brewery Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Zarghoon Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Gwadar",
        "small",
        "arid",
        [
            ("New Town", "Simple Road"),
            ("Shahi Bazaar", "Service Road"),
            ("Marine Drive", "Highway"),
            ("Airport Road", "Highway"),
            ("Port Road", "Highway"),
            ("Pishukan Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Turbat",
        "small",
        "arid",
        [
            ("Absor", "Simple Road"),
            ("Main Bazaar", "Service Road"),
            ("Airport Road", "Highway"),
            ("Mirani Road", "Highway"),
            ("Mand Road", "Highway"),
            ("Pasni Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Khuzdar",
        "small",
        "arid",
        [
            ("University Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Quetta Road", "Highway"),
            ("Karachi Road", "Highway"),
            ("Wadh Road", "Highway"),
            ("Naal Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Hub",
        "medium",
        "arid",
        [
            ("Hub Industrial Area", "Service Road"),
            ("Zeal Pak", "Service Road"),
            ("RCD Highway", "Highway"),
            ("Gadani Road", "Highway"),
            ("Winder Road", "Highway"),
            ("Sakran Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Chaman",
        "small",
        "arid",
        [
            ("Station Road", "Service Road"),
            ("Bazaar Road", "Service Road"),
            ("Quetta Road", "Highway"),
            ("Border Road", "Highway"),
            ("Bypass Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Sibi",
        "small",
        "arid",
        [
            ("Station Road", "Service Road"),
            ("Civil Lines", "Service Road"),
            ("Quetta Road", "Highway"),
            ("Jacobabad Road", "Highway"),
            ("Harnai Road", "Highway"),
            ("Dhadar Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Zhob",
        "small",
        "arid",
        [
            ("Cantt", "Service Road"),
            ("Bazaar Road", "Service Road"),
            ("Quetta Road", "Highway"),
            ("Killa Saifullah Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Sherani Road", "Highway"),
        ],
    ),
    (
        "Balochistan",
        "Loralai",
        "small",
        "arid",
        [
            ("Civil Lines", "Service Road"),
            ("Main Bazaar", "Service Road"),
            ("Quetta Road", "Highway"),
            ("Duki Road", "Highway"),
            ("Mekhtar Road", "Highway"),
            ("Sanjavi Road", "Highway"),
        ],
    ),
    (
        "ICT",
        "Islamabad",
        "large",
        "wet",
        [
            ("F-6", "Service Road"),
            ("F-7", "Simple Road"),
            ("F-8", "Simple Road"),
            ("F-9", "Simple Road"),
            ("F-10", "Simple Road"),
            ("F-11", "Simple Road"),
            ("G-6", "Service Road"),
            ("G-7", "Service Road"),
            ("G-8", "Simple Road"),
            ("G-9", "Simple Road"),
            ("G-10", "Simple Road"),
            ("G-11", "Simple Road"),
            ("I-8", "Service Road"),
            ("I-9", "Simple Road"),
            ("I-10", "Service Road"),
            ("I-11", "Simple Road"),
            ("E-11", "Simple Road"),
            ("H-8", "Service Road"),
            ("Blue Area", "Service Road"),
            ("Bahria Town", "Simple Road"),
            ("Bani Gala", "Simple Road"),
            ("Tarnol", "Highway"),
            ("Golra", "Simple Road"),
        ],
    ),
    (
        "GB",
        "Gilgit",
        "small",
        "arid",
        [
            ("Jutial", "Simple Road"),
            ("Konodas", "Simple Road"),
            ("Basin", "Simple Road"),
            ("Danyore", "Simple Road"),
            ("Sonikot", "Simple Road"),
            ("Kashrote", "Simple Road"),
            ("Main Bazaar", "Service Road"),
            ("Karakoram Highway", "Highway"),
            ("Airport Road", "Highway"),
        ],
    ),
    (
        "GB",
        "Skardu",
        "small",
        "arid",
        [
            ("Hussainabad", "Simple Road"),
            ("Satellite Town", "Simple Road"),
            ("Hoto", "Simple Road"),
            ("New Bazaar", "Service Road"),
            ("College Road", "Service Road"),
            ("Airport Road", "Highway"),
            ("Manthal Road", "Highway"),
            ("Kachura Road", "Highway"),
        ],
    ),
    (
        "GB",
        "Karimabad",
        "small",
        "arid",
        [
            ("Baltit", "Simple Road"),
            ("Altit", "Simple Road"),
            ("Ganish", "Simple Road"),
            ("Haiderabad", "Simple Road"),
            ("Fort Road", "Service Road"),
            ("Karakoram Highway", "Highway"),
        ],
    ),
    (
        "GB",
        "Chilas",
        "small",
        "arid",
        [
            ("Thalpan", "Simple Road"),
            ("Main Bazaar", "Service Road"),
            ("Karakoram Highway", "Highway"),
            ("Airport Road", "Highway"),
            ("Darel Road", "Highway"),
            ("Tangir Road", "Highway"),
        ],
    ),
    (
        "GB",
        "Khaplu",
        "small",
        "arid",
        [
            ("Palace Road", "Service Road"),
            ("Chaqchan Road", "Service Road"),
            ("Main Bazaar", "Service Road"),
            ("Skardu Road", "Highway"),
            ("Keris Road", "Highway"),
            ("Machulu Road", "Highway"),
        ],
    ),
    (
        "GB",
        "Astore",
        "small",
        "moderate",
        [
            ("Eidgah", "Simple Road"),
            ("Main Bazaar", "Service Road"),
            ("Rama Road", "Highway"),
            ("Gorikot Road", "Highway"),
            ("Gudai Road", "Highway"),
        ],
    ),
    (
        "AJK",
        "Muzaffarabad",
        "medium",
        "wet",
        [
            ("Naluchi", "Simple Road"),
            ("Plate", "Simple Road"),
            ("Gojra", "Simple Road"),
            ("Tariqabad", "Simple Road"),
            ("Chehla Bandi", "Simple Road"),
            ("Domel", "Service Road"),
            ("CMH Road", "Service Road"),
            ("Neelum Road", "Highway"),
        ],
    ),
    (
        "AJK",
        "Mirpur",
        "medium",
        "wet",
        [
            ("Sector C", "Simple Road"),
            ("Sector D", "Simple Road"),
            ("Sector F", "Simple Road"),
            ("Khaliqabad", "Simple Road"),
            ("New Mirpur", "Simple Road"),
            ("Allama Iqbal Road", "Service Road"),
            ("Mangla Road", "Highway"),
            ("Islamgarh Road", "Highway"),
        ],
    ),
    (
        "AJK",
        "Kotli",
        "small",
        "wet",
        [
            ("Main Bazaar", "Service Road"),
            ("Mirpur Road", "Highway"),
            ("Pindi Road", "Highway"),
            ("Nakyal Road", "Highway"),
            ("Khuiratta Road", "Highway"),
            ("Sehnsa Road", "Highway"),
        ],
    ),
    (
        "AJK",
        "Rawalakot",
        "small",
        "wet",
        [
            ("Main Bazaar", "Service Road"),
            ("Hajira Road", "Highway"),
            ("Airport Road", "Highway"),
            ("Banjosa Road", "Highway"),
            ("Thorar Road", "Highway"),
            ("Abbaspur Road", "Highway"),
        ],
    ),
    (
        "AJK",
        "Bagh",
        "small",
        "wet",
        [
            ("Neela Butt", "Simple Road"),
            ("Main Bazaar", "Service Road"),
            ("Dhirkot Road", "Highway"),
            ("Sudhan Gali Road", "Highway"),
            ("Birpani Road", "Highway"),
            ("Mallot Road", "Highway"),
        ],
    ),
    (
        "AJK",
        "Bhimber",
        "small",
        "wet",
        [
            ("Main Bazaar", "Service Road"),
            ("Mirpur Road", "Highway"),
            ("Gujrat Road", "Highway"),
            ("Samahni Road", "Highway"),
            ("Barnala Road", "Highway"),
        ],
    ),
]

COLUMNS = [
    "segment_id",
    "province",
    "city",
    "area",
    "road_type",
    "month",
    "report_count",
]

OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "synthetic_maintenance_data_v2.csv"


def _month_window(end: date = END_MONTH, n: int = N_MONTHS) -> list[date]:
    months: list[date] = []
    year, month = end.year, end.month
    for _ in range(n):
        months.append(date(year, month, 1))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    months.reverse()
    return months


def validate_geography() -> None:
    seen_cities: set[str] = set()
    provinces: set[str] = set()
    for province, city, tier, climate, areas in CITIES:
        if province not in PROVINCE_ORDER:
            raise ValueError(f"unknown province {province!r} on {city}")
        if city in seen_cities:
            raise ValueError(f"duplicate city {city}")
        seen_cities.add(city)
        provinces.add(province)
        if tier not in TIER_SCALE:
            raise ValueError(f"unknown tier {tier!r} on {city}")
        if climate not in {"wet", "arid", "moderate"}:
            raise ValueError(f"unknown climate {climate!r} on {city}")
        names = [name for name, _road in areas]
        if len(names) != len(set(names)):
            raise ValueError(f"duplicate area in {city}")
        if any(not name.strip() for name in names):
            raise ValueError(f"blank area in {city}")
        if city not in LISTED_CITIES and not 4 <= len(areas) <= 10:
            raise ValueError(f"{city} has {len(areas)} areas; expected 4-10")
        road_types = {road for _name, road in areas}
        if not road_types <= set(ROAD_BASELINE):
            raise ValueError(f"bad road type in {city}: {road_types}")
        if len(road_types) < 2:
            raise ValueError(f"{city} uses only one road type")
    missing = set(PROVINCE_ORDER) - provinces
    if missing:
        raise ValueError(f"missing provinces: {sorted(missing)}")
    if len(seen_cities) < 40:
        raise ValueError(f"only {len(seen_cities)} cities")


def _baseline(road_type: str, tier: str, pattern: str) -> float:
    base = ROAD_BASELINE[road_type] * TIER_SCALE[tier]
    base *= random.uniform(0.92, 1.08)
    base += random.uniform(-1.0, 1.6)
    if pattern == "stable":
        base *= random.uniform(0.82, 0.96)
    return max(base, 2.0)


def _slope(road_type: str, tier: str, pattern: str) -> float:
    if pattern != "worsening":
        return 0.0
    slope = random.uniform(0.30, 0.58) * SLOPE_TIER[tier]
    if road_type == "Highway":
        slope *= 1.30
    return slope


def _monsoon_multiplier(tier: str, climate: str) -> float:
    if climate == "wet":
        lo, hi = (2.05, 2.50) if tier in {"mega", "large"} else (1.70, 2.10)
    elif climate == "arid":
        lo, hi = 1.12, 1.36
    elif tier == "small":
        lo, hi = 1.22, 1.50
    else:
        lo, hi = 1.38, 1.75
    return random.uniform(lo, hi)


def _noise_sigma(pattern: str, tier: str) -> float:
    if pattern == "stable":
        return 0.55
    if tier == "mega":
        return 1.45
    return 1.05


def generate_rows() -> tuple[list[dict], list[str]]:
    months = _month_window()
    rows: list[dict] = []
    patterns: list[str] = []
    index = 0
    for province, city, tier, climate, areas in CITIES:
        for area, road_type in areas:
            index += 1
            segment_id = f"SEG-{index:04d}"
            pattern = random.choices(
                ("seasonal", "worsening", "stable"),
                weights=(0.40, 0.30, 0.30),
            )[0]
            patterns.append(pattern)
            baseline = _baseline(road_type, tier, pattern)
            slope = _slope(road_type, tier, pattern)
            monsoon_mult = _monsoon_multiplier(tier, climate)
            noise_sigma = _noise_sigma(pattern, tier)
            for t, month in enumerate(months):
                value = baseline
                if pattern == "seasonal" and month.month in MONSOON_MONTHS:
                    value *= monsoon_mult
                elif pattern == "worsening":
                    value = baseline + t * slope
                value += random.gauss(0.0, noise_sigma)
                rows.append(
                    {
                        "segment_id": segment_id,
                        "province": province,
                        "city": city,
                        "area": area,
                        "road_type": road_type,
                        "month": month.isoformat(),
                        "report_count": max(0, round(value)),
                    }
                )
    return rows, patterns


def validate_rows(rows: list[dict], patterns: list[str]) -> None:
    months = [month.isoformat() for month in _month_window()]
    n_areas = len(patterns)
    if len(rows) != n_areas * N_MONTHS:
        raise ValueError(f"row count {len(rows)} != {n_areas} * {N_MONTHS}")
    by_segment: dict[str, list[dict]] = {}
    seen_pairs: set[tuple[str, str]] = set()
    for row in rows:
        if any(row[col] is None or row[col] == "" for col in COLUMNS):
            raise ValueError(f"null field in {row}")
        count = row["report_count"]
        if not isinstance(count, int) or count < 0:
            raise ValueError(f"bad report_count {count!r}")
        pair = (row["segment_id"], row["month"])
        if pair in seen_pairs:
            raise ValueError(f"duplicate segment/month {pair}")
        seen_pairs.add(pair)
        by_segment.setdefault(row["segment_id"], []).append(row)
    if len(by_segment) != n_areas:
        raise ValueError("segment_id count does not match areas")
    for segment_id, segment_rows in by_segment.items():
        if len(segment_rows) != N_MONTHS:
            raise ValueError(f"{segment_id} has {len(segment_rows)} months")
        got_months = [row["month"] for row in segment_rows]
        if got_months != months:
            raise ValueError(f"{segment_id} months are not the expected window")
        keys = ("province", "city", "area", "road_type")
        first = tuple(segment_rows[0][key] for key in keys)
        if any(tuple(row[key] for key in keys) != first for row in segment_rows):
            raise ValueError(f"{segment_id} metadata changes across months")


def write_csv(rows: list[dict], path: Path = OUTPUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(rows: list[dict], patterns: list[str], path: Path) -> None:
    print(f"Wrote {len(rows)} rows to {path}")
    print(f"Total areas: {len(patterns)}")
    print(f"Cities: {len(CITIES)}")
    print(f"Provinces: {len(PROVINCE_ORDER)} ({', '.join(PROVINCE_ORDER)})")
    print("Areas per city:")
    for province in PROVINCE_ORDER:
        group = [city for city in CITIES if city[0] == province]
        area_total = sum(len(city[4]) for city in group)
        city_noun = "city" if len(group) == 1 else "cities"
        print(f"  {province} ({len(group)} {city_noun}, {area_total} areas):")
        for _province, name, _tier, _climate, areas in group:
            print(f"    {name}: {len(areas)}")
    months = sorted({row["month"] for row in rows})
    print(f"Date range: {months[0]} .. {months[-1]}")
    print("Total rows:", len(rows))
    mix = Counter(patterns)
    parts = [f"{name}={mix[name]}" for name in ("seasonal", "worsening", "stable")]
    print("Pattern counts:", ", ".join(parts))
    values = [int(row["report_count"]) for row in rows]
    mean = sum(values) / len(values)
    print(f"report_count: min={min(values)}  max={max(values)}  mean={mean:.2f}")


def main() -> None:
    validate_geography()
    random.seed(SEED)
    rows, patterns = generate_rows()
    validate_rows(rows, patterns)
    write_csv(rows, OUTPUT_PATH)
    print_summary(rows, patterns, OUTPUT_PATH)


if __name__ == "__main__":
    main()
