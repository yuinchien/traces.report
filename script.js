var RECORDS = [];
var selectedYearIndex = 0;
var now = new Date();
var travelYears = {};

function TravelYear(year) {
	this.year = year;
	this.timeInCity = {};
	return this;
}

TravelYear.prototype.updateTimeInCity = function(city, days) {
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
	var copy = document.getElementById('copy');
	var currentCity = RECORDS[RECORDS.length-1].to;
	var time = now.toDateString();
	copy.innerHTML = `Current location <span class="city">${currentCity}</span> / <span class="nowrap">Local time <span class="time">${time}</span></span>`;
// ☀
	for(var key in travelYears) {
		var div = document.createElement("div");
		div.setAttribute("id", "year-"+key);
		div.classList.add("year");
		div.innerHTML = `<div class="sticky"><div class="title">${key.substring(2)}'</div><div id="summary-${key}" class="summary"></div></div><div id="entries-${key}" class="entries"></div>`;
		copy.after(div);
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
		entry.innerHTML = `<span class="date">${date}</span>${RECORDS[i].to.split(',')[0].trim()}`;
		parent.prepend(entry);
	}
	document.body.classList.remove('loading');
}

function loadData() {
	// console.log('loadData');

	if(now.getHours()>=18 || now.getHours()<6) {
		document.body.classList.add('dark');
	}

	const urlParams = new URLSearchParams(window.location.search);
 	const sheetId = urlParams.get('id');
	const url = `https://spreadsheets.google.com/feeds/list/${sheetId}/od6/public/values?alt=json`;

	try {
		fetch(url)
			.then(function(response) {
				return response.json();
			})
			.then(function(myJson) {
				let entries = myJson.feed.entry || [];
				entries = entries.sort((a, b) => (new Date(a.gsx$departuredate.$t.trim())).getTime() - (new Date(b.gsx$departuredate.$t.trim())).getTime() );

				for(var i = 0; i < entries.length; ++i) {
					var entry = entries[i];
					var from = entry['gsx$fromcity']['$t'].trim() + ', '+ entry['gsx$tocountry']['$t'].trim();
					var to = entry['gsx$tocity']['$t'].trim() + ', '+ entry['gsx$tocountry']['$t'].trim();
					var date = entry['gsx$departuredate']['$t'].trim();

					var d = new Date(date);
					var y = d.getFullYear();
					try {
						var nextEntryFrom = to;
						var nextEntryDate = new Date().toLocaleDateString("en-US");

						if(i!=entries.length-1) {
							nextEntryDate = entries[i+1]['gsx$departuredate']['$t'].trim();;
							nextEntryFrom = entries[i+1]['gsx$fromcity']['$t'].trim() + ', ' + entries[i+1]['gsx$fromcountry']['$t'].trim();
						}
						var nextEntryD = new Date(nextEntryDate);
						var totalDays = 0;
						if(d.getFullYear()!=nextEntryD.getFullYear()) {
							// add to next year
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
									travelYears[middleYear].updateTimeInCity(to, 365);
								}
							}

							travelYears[nextEntryD.getFullYear()].updateTimeInCity(to, gapDays);
							nextEntryD = new Date(d.getFullYear(), 11, 31);
							totalDays = gapDays;
						}
						var days = Math.max(1, daysBetweenInSameYear(d, nextEntryD));
						if(!travelYears[y]) {
							travelYears[y] = new TravelYear(y);
						}
						travelYears[y].updateTimeInCity(to, days);
						totalDays += days;
						RECORDS.push( {date: date, from: from, to: to, days: totalDays} );
					} catch(e) {
						console.log('ERROR: ',RECORDS[i],e);
					}
				}

				for(var i=0; i<travelYears.length; i++) {
					travelYears[i];
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
