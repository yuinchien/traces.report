var RECORDS = [];
var travelYears = {};

function TravelYear(year) {
	this.year = year;
	this.timeInCity = {};
	return this;
}

TravelYear.prototype.updateTimeInCity = function(city, days) {
	if(days<=0) { return; }
	if(this.timeInCity[city]) { this.timeInCity[city] += days; }
	else { this.timeInCity[city] = days; }
}

function daysBetweenInSameYear(from,to) {
  var millisecondsPerDay = 1000 * 60 * 60 * 24;
	var millisBetween = to.getTime() - from.getTime();
  var days = millisBetween / millisecondsPerDay;
  return Math.round(days);
}

function sortOnKeys(dict) {
	var sortable = [];
	for (var obj in dict) {
		sortable.push([obj, dict[obj]]);
	}
	sortable.sort(function(a, b) {return b[1] - a[1] });
	return sortable;
}

function create() {
	var content = document.getElementById('content');

	for(var key in travelYears) {
		var div = document.createElement("div");
		div.setAttribute("id", "year-"+key);
		div.classList.add("year");
		div.innerHTML = `<div class="title">'${key.substring(2)}</div><div class="row"><div id="summary-${key}" class="summary"></div><div id="entries-${key}" class="entries"></div></div>`;
		content.prepend(div);
		var summary = document.getElementById("summary-"+key);
		var sortedTimeInCity = sortOnKeys( travelYears[key].timeInCity );
		for(var i=0; i<sortedTimeInCity.length; i++) {
			var data = sortedTimeInCity[i];
			var div = document.createElement("div");
			div.classList.add("list");
			div.innerHTML = `${data[0].split(',')[0].trim()}<span class="days">${data[1]}d</span>`;
			summary.appendChild(div);
		}
	}
	for(var i=RECORDS.length-1; i>=0; i--) {
		var year = RECORDS[i].date.substring(RECORDS[i].date.length-4, RECORDS[i].date.length);
		var parent = document.getElementById("entries-"+year);
		var entry = document.createElement("div");
		entry.classList.add('entry');
		var date = RECORDS[i].date.substring(0, RECORDS[i].date.length-5);
		entry.innerHTML = `<span class="date">${date}</span>${RECORDS[i].city.split(',')[0].trim()}`;
		parent.appendChild(entry);
	}

	var totalTimeSpent = {};
	for(var key in travelYears) {
		for(var city in travelYears[key].timeInCity) {
			if(!totalTimeSpent[city]) {
				totalTimeSpent[city] = 0;
			}
			totalTimeSpent[city] += travelYears[key].timeInCity[city];
		}
	}

	var yearArray = Object.keys(travelYears).sort();
	var duration = `'${yearArray[0].substring(2)}–<br>'${yearArray[yearArray.length-1].substring(2)}`;

	var totalTimeSpent = sortOnKeys( totalTimeSpent );
	var overview = document.createElement("div");
	overview.setAttribute("id", "overview");
	overview.innerHTML = `<div class="caption">${duration}</div>`;
	content.prepend(overview);

	var list = document.createElement("div");
	list.setAttribute("id", "list");
	overview.append(list);

	for(var i=0; i<totalTimeSpent.length; i++) {
		var city = totalTimeSpent[i][0];
		var days = totalTimeSpent[i][1];
		var div = document.createElement("div");
		div.classList.add("list");
		div.innerHTML = `${totalTimeSpent[i][0].split(',')[0].trim()}<span class="days">${totalTimeSpent[i][1]}d</span>`;
		list.appendChild(div);
	}

	document.body.classList.remove('loading');
}

function loadData() {

	const urlParams = new URLSearchParams(window.location.search);
 	const sheetId = urlParams.get('id') || "1j4yfiowEPDtMrYZyBqAV5Esujp8KCHBd9NrMs8-QVZw";
	if(urlParams.get('id')==null) {
		window.location.search = `id=${sheetId}`;
	}
	const url = `https://spreadsheets.google.com/feeds/list/${sheetId}/od6/public/values?alt=json`;

	try {
		fetch(url)
			.then(function(response) {
				return response.json();
			})
			.then(function(myJson) {
				let entries = myJson.feed.entry || [];
				entries = entries.sort((a, b) => (new Date(a['gsx$arrival']['$t'].trim())).getTime() - (new Date(b['gsx$arrival']['$t'].trim())).getTime() );
				for(var i = 0; i < entries.length; ++i) {
					var entry = entries[i];
					var city = entry['gsx$city']['$t'].trim() + ', '+ entry['gsx$country']['$t'].trim();
					var date = entry['gsx$arrival']['$t'].trim();

					var d = new Date(date);
					var y = d.getFullYear();
					try {
						var nextEntryD = new Date();
						if(i!=entries.length-1) {
							nextEntryD = new Date( entries[i+1]['gsx$arrival']['$t'].trim() );
						}
						var totalDays = 0;

						if(d.getFullYear()!=nextEntryD.getFullYear()) {
							var gapDays = daysBetweenInSameYear( new Date(nextEntryD.getFullYear(), 0, 1), nextEntryD);
							if(!travelYears[nextEntryD.getFullYear()]) {
								travelYears[nextEntryD.getFullYear()] = new TravelYear(nextEntryD.getFullYear());
							}
							if((d.getFullYear() - nextEntryD.getFullYear()) != -1) {
								var diff = nextEntryD.getFullYear() - d.getFullYear();
								for(var j=1; j<diff; j++) {
									var middleYear = d.getFullYear() + j;
									if(!travelYears[middleYear]) {
										travelYears[middleYear] = new TravelYear(middleYear);
									}
									travelYears[middleYear].updateTimeInCity(city, 365);
								}
							}
							travelYears[nextEntryD.getFullYear()].updateTimeInCity(city, gapDays);
							nextEntryD = new Date(d.getFullYear(), 11, 31, 23, 59);
							totalDays = gapDays;
						}
						var days = daysBetweenInSameYear(d, nextEntryD);
						if(!travelYears[y]) {
							travelYears[y] = new TravelYear(y);
						}
						travelYears[y].updateTimeInCity(city, days);
						totalDays += days;
						RECORDS.push( {date: date, city: city, days: days} );
					} catch(e) {
						console.log('ERROR: ',RECORDS[i],e);
					}
				}
				create();
		});
	} catch(e) {
		console.log("Error: can't parse data with Sheet ID");
	}
}

// in case the document is already rendered
if (document.readyState!='loading') loadData();
// modern browsers
else if (document.addEventListener) document.addEventListener('DOMContentLoaded', loadData);
// IE <= 8
else document.attachEvent('onreadystatechange', function(){
  if (document.readyState=='complete') loadData();
});
