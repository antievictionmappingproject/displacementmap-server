displacementmap-server
======================
api format: 
evictor:
```
{
	label: string
	groups/owners: ids
	evictions: ids
	links : [{label: string, url: string}]
	evictions: [{id}]
}
```

eviction:
```
{
	#of units: number
	date: date
	evictors: ids[]
	seniors: num
	disabled: num
	links : [{label: string, url: string}]
	property: id
}
```

property: 
```
{
	block-lot number: string
	label: address
	lat: num
	lon: num
	evictions: ids[]
}
```

has there been an eviction at this address? address string -> property 
what evictions is someone connected to? name string -> evictor

databyid for all
