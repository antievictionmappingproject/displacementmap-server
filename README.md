displacementmap-server
======================
CSV files should be uploaded in the following order:
1) addresses
2) evictions
3) owners

Import file name should start with one of the following names: addresses, evictions or owners.

Appropriate schemas for the files are the following:
addesses:
```
    EAS BaseID: number, can be empty,
    EAS SubID: number, can be empty,
    CNN: string, can be empty,
    Address: optional string, can't be empty
    Address Number: optional number, can't be empty,
    Address Number Suffix: string, can be empty,
    Street Name: optional string, can't be empty,
    Street Type: string, can be empty,
    Unit Number: string, can be empty,
    Zipcode: string, can be empty,
    Block Lot: string, can be empty,
    Longitude: number, can be empty,
    Latitude: number, can be empty,
    Location: number, can be empty
```

evictions:
```
{
    the_geom: required string, can be empty,
    petition: required string, can be empty
    date: required date, can be empty,
    month: required number between 1 & 12,
    day: required number between 1 & 31,
    year: required number between 1990 & 2100,
    type: required string,
    address: required string,
    apt: required string, can be empty,
    Zip: required string, can be empty,
    units: required string, can be empty,
    blk_lot: required string, can be empty,
    owner: required string, can be empty,
    people involved: required string, can be empty,
    yearbuilt: required positive intege, can be empty,
    latitude: required number, can be empty,
    longitude: required number, can be empty,
}
```

owners:
```
{
    owner_name: required string,
    address: required string
    owner_mailing_address: required string
}
```

Owners file can have additonal columns which will not affect on importing process, but for evictions and address having extra columns are not allowed.