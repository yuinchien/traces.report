let RECORDS = [];
let travelYears = {};

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
  let millisecondsPerDay = 1000 * 60 * 60 * 24;
	let millisBetween = to.getTime() - from.getTime();
  let days = millisBetween / millisecondsPerDay;
  return Math.round(days);
}

function sortOnKeys(dict) {
	let sortable = [];
	for (let obj in dict) {
		sortable.push([obj, dict[obj]]);
	}
	sortable.sort(function(a, b) {return b[1] - a[1] });
	return sortable;
}

function create() {
	let content = document.getElementById('content');

	for(let key in travelYears) {
		let div = document.createElement("div");
		div.setAttribute("id", "year-"+key);
		div.classList.add("year");
		div.innerHTML = `<div class="title">'${key.substring(2)}</div><div class="row"><div id="summary-${key}" class="summary"></div><div id="entries-${key}" class="entries"></div></div>`;
		content.prepend(div);
		let summary = document.getElementById("summary-"+key);
		let sortedTimeInCity = sortOnKeys( travelYears[key].timeInCity );
		for(let i=0; i<sortedTimeInCity.length; i++) {
			let data = sortedTimeInCity[i];
			let div = document.createElement("div");
			div.classList.add("list");
			div.innerHTML = `${data[0].split(',')[0].trim()}<span class="days">${data[1]}d</span>`;
			summary.appendChild(div);
		}
	}
	for(let i=RECORDS.length-1; i>=0; i--) {
		let year = RECORDS[i].date.substring(RECORDS[i].date.length-4, RECORDS[i].date.length);
		let parent = document.getElementById("entries-"+year);
		let entry = document.createElement("div");
		entry.classList.add('entry');
		let date = RECORDS[i].date.substring(0, RECORDS[i].date.length-5);
		entry.innerHTML = `<span class="date">${date}</span>${RECORDS[i].city.split(',')[0].trim()}`;
		parent.appendChild(entry);
	}

	let totalTimeSpent = {};
	for(let key in travelYears) {
		for(let city in travelYears[key].timeInCity) {
			if(!totalTimeSpent[city]) {
				totalTimeSpent[city] = 0;
			}
			totalTimeSpent[city] += travelYears[key].timeInCity[city];
		}
	}

	let yearArray = Object.keys(travelYears).sort();
	let duration = `'${yearArray[0].substring(2)}–<br>'${yearArray[yearArray.length-1].substring(2)}`;

	totalTimeSpent = sortOnKeys( totalTimeSpent );
	let overview = document.createElement("div");
	overview.setAttribute("id", "overview");
	overview.innerHTML = `<div class="caption">${duration}</div>`;
	content.prepend(overview);

	let list = document.createElement("div");
	list.setAttribute("id", "list");
	overview.append(list);

	for(let i=0; i<totalTimeSpent.length; i++) {
		let city = totalTimeSpent[i][0];
		let days = totalTimeSpent[i][1];
		let div = document.createElement("div");
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
				for(let i = 0; i < entries.length; ++i) {
					let entry = entries[i];
					let city = entry['gsx$city']['$t'].trim() + ', '+ entry['gsx$country']['$t'].trim();
					let date = entry['gsx$arrival']['$t'].trim();

					let d = new Date(date);
					let y = d.getFullYear();
					try {
						let nextEntryD = new Date();
						if(i!=entries.length-1) {
							nextEntryD = new Date( entries[i+1]['gsx$arrival']['$t'].trim() );
						}
						let totalDays = 0;

						if(d.getFullYear()!=nextEntryD.getFullYear()) {
							let gapDays = daysBetweenInSameYear( new Date(nextEntryD.getFullYear(), 0, 1), nextEntryD);
							if(!travelYears[nextEntryD.getFullYear()]) {
								travelYears[nextEntryD.getFullYear()] = new TravelYear(nextEntryD.getFullYear());
							}
							if((d.getFullYear() - nextEntryD.getFullYear()) != -1) {
								let diff = nextEntryD.getFullYear() - d.getFullYear();
								for(let j=1; j<diff; j++) {
									let middleYear = d.getFullYear() + j;
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
						let days = daysBetweenInSameYear(d, nextEntryD);
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
