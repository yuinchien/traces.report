// Client ID and API key from the Developer Console
var CLIENT_ID = '1046024617356-ioavjhaqk5ddlgr0i8ciqkbcc2al47jd.apps.googleusercontent.com';
var SHEET_API_KEY = 'AIzaSyBn9J_Ahagc-3qnFdN6rE73O6QTujz1P8o';

const urlParams = new URLSearchParams(window.location.search);
const SHEET_ID = urlParams.get('id') || "1j4yfiowEPDtMrYZyBqAV5Esujp8KCHBd9NrMs8-QVZw";
if(urlParams.get('id')==null) {
	window.location.search = `id=${SHEET_ID}`;
}

const sheetURL = (sheetId) => {
	return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${SHEET_API_KEY}`
}

const sheetRowsURL = (sheetId, sheetName) => {
	let encodedSheetName = encodeURIComponent(sheetName)
	return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedSheetName}?key=${SHEET_API_KEY}`
}

const fetchTabs = () => {
	return fetch(sheetURL(SHEET_ID))
		.then(response => response.json())
		.then(json => {
			let tabs = {}
			for (let sheet of json.sheets) {
				if (sheet.properties) {
					let name = sheet.properties.title
					tabs[name] = sheet.properties
				}
			}
			return tabs
		})
}

const fetchRows = (sheetName) => {
	return fetch(sheetRowsURL(SHEET_ID, sheetName))
		.then(response => response.json())
		.then(json => {
			let rows = json.values.slice(1).sort((a, b) => (new Date(a[0])).getTime() - (new Date(b[0])).getTime() );
			let travelYears = {};
			for(let i=0; i<rows.length; i++) {
				let city = `${rows[i][1].trim()}, ${rows[i][2].trim()}`;
				let date = new Date(rows[i][0]);
				let year = date.getFullYear();
				try {
					let nextDate = (i!=rows.length-1)? new Date( rows[i+1][0] ): new Date();
					let nextYear = nextDate.getFullYear();
					let yearDiff = nextYear - year;
					if(yearDiff!=0) {
						let gapDays = daysBetweenInSameYear( new Date(nextYear, 0, 1), nextDate);
						if(!travelYears[nextYear]) {
							travelYears[nextYear] = new TravelYear(nextYear);
						}
						if(yearDiff != 1) {
							for(let j=1; j<yearDiff; j++) {
								let middleYear = year + j;
								if(!travelYears[middleYear]) {
									travelYears[middleYear] = new TravelYear(middleYear);
								}
								travelYears[middleYear].updateTimeInCity(city, 365);
							}
						}
						travelYears[nextYear].updateTimeInCity(city, gapDays);
						nextDate = new Date(year, 11, 31, 23, 59);
					}
					let days = daysBetweenInSameYear(date, nextDate);
					if(!travelYears[year]) {
						travelYears[year] = new TravelYear(year);
					}
					travelYears[year].updateTimeInCity(city, days);
				} catch(e) {
					console.error(e)
				}
			}
			return {
				rows: rows,
				travelYears: travelYears
			};
		})
		.catch(err => {
			console.error(err)
			return []
		})
}

const handleClientLoad = () => {
	fetchTabs()
		.then(data => {
			var sheetName = "";
			for(title in data) {
				if(data[title].index==0) {
					sheetName = data[title].title;
					break;
				}
			}
			fetchRows(sheetName)
				.then(data => {
					create(data);
				})
		})
}


class TravelYear {
	constructor(year) {
		this.year = year;
		this.timeInCity = {};
	}
	updateTimeInCity(city, days) {
		if(days<=0) { return; }
		if(this.timeInCity[city]) { this.timeInCity[city] += days; }
		else { this.timeInCity[city] = days; }
	}
}

const daysBetweenInSameYear = (from,to) => {
  let millisecondsPerDay = 1000 * 60 * 60 * 24;
	let millisBetween = to.getTime() - from.getTime();
  let days = millisBetween / millisecondsPerDay;
  return Math.round(days);
}

const sortOnKeys = (dict) => {
	let sortable = [];
	for (let obj in dict) {
		sortable.push([obj, dict[obj]]);
	}
	sortable.sort(function(a, b) {return b[1] - a[1] });
	return sortable;
}

const create = (data) => {
	let rows = data.rows;
	let travelYears = data.travelYears;

	let content = document.getElementById('content');

	for(let year in travelYears) {
		let div = document.createElement("div");
		content.prepend(div);
		const markup = `
			<div id="year-${year}" class="year">
				<div class="title">'${year.substring(2)}</div>
				<div class="row">
					<div id="summary-${year}" class="summary"></div>
					<div id="entries-${year}" class="entries"></div>
				</div>
			</div>
		`;
		div.outerHTML = markup;

		let summary = document.getElementById("summary-"+year);
		let sortedTimeInCity = sortOnKeys( travelYears[year].timeInCity );
		for(let i=0; i<sortedTimeInCity.length; i++) {
			let timeInCity = sortedTimeInCity[i];
			let divList = document.createElement("div");
			summary.appendChild(divList);
			divList.outerHTML = `<div class="list">${timeInCity[0].split(',')[0].trim()}<span class="days">${timeInCity[1]}d</span></div>`;
		}
	}
	for(let i=rows.length-1; i>=0; i--) {
		let year = rows[i][0].substring(rows[i][0].length-4);
		let parent = document.getElementById("entries-"+year);
		let entry = document.createElement("div");
		parent.appendChild(entry);
		let date = rows[i][0].substring(0, rows[i][0].length-5);
		entry.outerHTML = `<div class="entry"><span class="date">${date}</span>${rows[i][1]}</div>`;
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
