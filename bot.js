var irc = require("irc");
var http = require("http");

/*	save current weather data here; over 10 minutes old data 
	will be deleted and reloaded on request */
var weatherData = [];

/*	add your bot configurations here */
var config = {
	channels: ["#roskasTestGround"],
	server: "irc.quakenet.org",
	botName: "roskasNodeBot"
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
	cmdRespond(nick, to, text, message);
});

bot.addListener("pm", function(nick, text, message) {
	cmdRespond(nick, null, text, message);
});



function cmdRespond(nick, to, text, message) {
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
		/*case '.quote' :
			quote(destination);
			break; 
		case '.q' :
			quote(destination);
			break; */
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
			bot.say(destination, weatherData[i].name + ", " + weatherData[i].sys.country);			
			// Kelvin - 273.15 = Celcius
			bot.say(destination, weatherData[i].main.temp - 273.15);
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
				console.log("Error: " + er.message);
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
				} else {
					//add timestamp to know if the weatherdata is dated.
					data.timestamp = Date.now();
					bot.say(destination, data.name + ", " + data.sys.country);
					// Kelvin - 273.15 = Celcius
					bot.say(destination, data.main.temp - 273.15);
					bot.say(destination, data.weather[0].description);
					//add the new data to up-to-date array...
					weatherData.push(data);
					console.log("asldfjasfa: " + weatherData[0].name);
				}
			});
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
		bot.say(destination, ".roll <min> <max> is the correct syntax you twat!");
	}
	var rnd = Math.floor((Math.random() * max) + min);
	bot.say(destination, "You rolled: " + rnd);
}

function quote(destination) {
	http.get("http://www.iheartquotes.com/api/v1/random?format=json", function(res) {
		var body = '';

		res.on('error', function() {
			console.log("quote errror");
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
	});
}

// tee nopan heitto funktio!! :D ja muut tärkeät!
// noppa roll
// random huutelu
// nimipäivä

/* käytä looppia ja tee quoteja huuteleva ärsyttävä paskiainen :D */

