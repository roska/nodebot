var irc = require("irc");
var http = require("http");

/*	save current weather data here; over 10 minutes old data 
	will be deleted and reloaded on request */
var weatherData = [];

/*	add your bot configurations here */
var config = {
	channels: ["#roskasTestGround"],
	server: "irc.quakenet.org",
	botName: "JakR-bot"
};

var bot = new irc.Client(config.server, config.botName, { 
	channels: config.channels
});

//send error message from irc network to console.log
//without this it would cause fatal stack trace
bot.addListener('error', function(message) {
    console.log('error: ', message);
});

//listen for joins on channels
bot.addListener("join", function(channel, who) {
	/*	welcome the user in!

	bot will also welcome him/herself in because he can see his own
	join event. Remember to add the next if statement if you don't
	want this to happen.
	
	if (who != config.botName) {}	*/
	bot.say(channel, who + "...welcome!!");
});

//listen for messages in channels
bot.addListener("message", function(nick, to, text, message) {
	commandResponse(nick, to, text, message);
});

bot.addListener("pm", function(nick, text, message) {
	commandResponse(nick, null, text, message);
});


/* forever loop to shout out random things 3000000 = 50min */
(function loop() {
	setTimeout(function() {
		//shout();
		rollDice("#roskasTestGround", 1, 100);
		loop();
	}, 3000000);
}());


function commandResponse(nick, to, text, message) {
	//used only for learning (:
	/*console.log(nick);
	console.log(to);
	console.log(text);
	console.log(message);	*/
	/*	nick 	= sender
		to 		= receiver (user/channel)
		text 	= what characters the user typed!
		message = the WHOLE thing!	*/

	/*	split the text to check if it matches
		the commands syntax	*/

	var param = text.split(" ");

	/* 	null came from "pm" above, so send back to user otherwise send reply
		to the same channel where the command was sent to */
	var destination = "";
	if (to == null) {
		destination = nick;
	} else {
		destination = to;
	}

	/*	Check for possible commands.
		Functions are defined in lower in this file.*/

	switch (param[0]) {
		case '.saa' : //get weather!
			getWeather(destination, param[1], param[2]);
			break;
		case '.roll' : //roll the dice!
			rollDice(destination, param[1], param[2]);
			break;
		case '.?' : // print help
			botCommands(destination);
			break;
		case '.quote' :
			var dest = "#roskasTestGround";
			http.get("http://www.iheartquotes.com/api/v1/random?format=json", function(res) {
			var body = '';

			res.on('error', function(e) {
				console.log("quote errror" + e.message);
			})

			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
			quote = JSON.parse(body);
			console.log(quote.quote);
			//don't flood....change the string length as you please...
			if (quote.quote.length < 600) {
				bot.say(dest, quote.quote);
			} else {
				bot.say(dest, "Sigh. These quotations are so long.. CBA to flood all of them.. ask for a new one!");
			}
				});
			}).on('error', function(e) {
				console.log("Quote error: " + e.message);
			});
			break;
	}

}

/*	Help

	Call with 	.?

	This is help. Prints the commands that the bot is listening for
	and their syntax.	*/
function botCommands(destination) {
	bot.say(destination, "These are some of the things I do:\n .?     - this help\n .saa   - get you weather info about Pori\n .roll  - roll d6 dice");
}
/*	Weather!

	Call with	.saa

	This will get you the weather (atm only in Pori)

	...	mod the function to take city (and country?) arguments
		and check is the search is valid	*/

function getWeather(destination, cityName, countryCode) {
	//default City value if not given
	if (cityName == null) {
		cityName = "Pori";
	}
	//default country value if not given
	if (countryCode == null) {		
		countryCode = "FI";
	}	

	//filter out old weather data; older than 10 minutes, so we don't bother the API too often (their request)..
	weatherData = weatherData.filter(function(item) {
							//600000 = 10 min
		return (item.timestamp + 600000) < Date.now();
	});

	var downloadNewData = true;
	
	/*	check if weather data exists already, print it and prevent new get... 
		why the fuck does this not work?	*/
	for (var i = 0; i <= weatherData.length -1; ++i) {
		console.log("loop checking existing data");
		if (weatherData[i].name == cityName) {

			//same bit as in get..... make function?!!
			bot.say(destination, weatherData[i].main.temp - 273.15 + " | "+weatherData[i].name + ", " + weatherData[i].sys.country);			
			// Kelvin - 273.15 = Celcius
			//bot.say(destination, weatherData[i].main.temp - 273.15);
			bot.say(destination, weatherData[i].weather[0].description);
			downloadNewData = false;
			console.log("didn't have to download new data!");
		}
	}

	if (downloadNewData) {
		var saa_url ="http://api.openweathermap.org/data/2.5/weather?q=" + cityName + "," + countryCode;
		http.get(saa_url, function(res) {
			var body = '';

			res.on('error', function(er) {
				console.log("Weather error: " + er.message);
				bot.say(destination, "Error: " + er.message);
			});

			res.on('data', function(chunk){
				body += chunk;
			});
			res.on('end', function() {
					var data = JSON.parse(body);
				
					console.log("loaded weather data");
					if (data.cod != 200) {
						bot.say(destination, "Error: Requested data was not found.");
						console.log("Error: Requested data was not found.")
					} else if (data != null) {
						//add timestamp to know if the weatherdata is dated.
						data.timestamp = Date.now();						
						bot.say(destination, (data.main.temp - 273.15).toPrecision(2) + " | "+ data.name + ", " + data.sys.country);	
						// Kelvin - 273.15 = Celcius
						//bot.say(destination, data.main.temp - 273.15);
						bot.say(destination, data.weather[0].description);
						//add the new data to up-to-date array...
						weatherData.push(data);
						console.log("WeatherData: " + weatherData);
					} else {
						bot.say(destination, "Couldn't find weather data.");
					}
				
			});
		}).on('error', function(e) {
			console.log("Weather error: " + e.message);
			bot.say(destination, "Error: " + e.message);
		});
	}
}
/*  function to print weather report!
function weatherPrint(destination, data) {
	bot.say(destination, data.name + ", " + data.sys.country);
	// Kelvin - 273.15 = Celcius
	bot.say(destination, data.main.temp - 273.15);
	bot.say(destination, data.weather[0].description);
}*/

function rollDice(destination, min, max) {
	//set default if both are not given...
	if (min == null || max == null) {
		min = 1;
		max = 100;
	}
	var rnd = Math.floor((Math.random() * max - min) + min);
	bot.say(destination, "You rolled: " + rnd);
}
/*
function quote(destination) {
	http.get("http://www.iheartquotes.com/api/v1/random?format=json", function(res) {
		var body = '';

		res.on('error', function(e) {
			console.log("quote errror" + e.message);
		})

		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			quote = JSON.parse(body);
			//don't flood....change the string length as you please...
			if (quote.quote.length < 300) {
				bot.say(destination, quote.quote);
			} else {
				bot.say(destination, "Sigh. These quotations are so long.. CBA to flood all of them.. ask for a new one!");
			}
		});
	}).on('error', function(e) {
		console.log("Quote error: " + e.message);
	});
}
*/


function quote() {
	
}

function shout() {
	var rnd = Math.round(Math.random() * (10 - 1) + 1);
	if (rnd > 5) {
		bot.say("#roskasTestGround", "Greater than 5!");
	} else {
		bot.say("#roskasTestGround", "Less than 5!");
	}
		
}
// tee nopan heitto funktio!! :D ja muut tärkeät!
// noppa roll
// random huutelu
// nimipäivä
// linkit täältä tietokantaan!
// sitten sivu mistä voi kattoa ne..

/* käytä looppia ja tee quoteja huuteleva ärsyttävä paskiainen :D */

