var EventEmitter = require('events').EventEmitter;
var util = require('util');
var dgram = require('dgram');
var fs = require('fs');
var engine = require('engine.io');
//var static = require('node-static');
var express = require('express')
var serveStatic = require('serve-static')
var open = require('open');

var app = express();
var http = require('http').createServer(app);


var settings = require('./settings.json');
var mw = settings.middleware;

var Stomp = require('stomp-client');
var mw_client = new Stomp(mw.host, mw.port, mw.user, mw.pass);
mw_client.connect(function(sessionId) {
    mw_client.subscribe(mw.rTopic, function(body, headers) {
      console.log('Wizard UI Feedback:', body);
    });
    console.log("Connected to middleware: "+mw.host+":"+mw.port);
});

var webPort = 5601;
 
var generateFile = "utterances.csv"
var dialogsFolder = "dialogs";
var defaultDialogFile = "default.json";
 
var arg = process.argv[2] || "editor";
app.use(serveStatic(__dirname + '/app'));
http.listen(webPort);
console.log("Web interface running on port: "+webPort);


var server = engine.attach(http);
var sockets = [];
function removeSocket(s) { sockets.splice(sockets.indexOf(s), 1); }
function broadcast(msg) {
    var data = JSON.stringify(msg);
    sockets.forEach(function(s) {
        s.send(data);
    });
}


// Here we handle when a button is pressed on the web interface.
// bmlMsg is an object like:
//  { 
//     id: "<unique identifier of the utterance>",
//     content: "<text for the utterance (could contain markup?)>",
//     characterId: "<optional: target character ID>"
//  }
//
//  This function should return the string to be sent to the middleware topic
//  
//  Alternatively, we could make another implementation that creates a
//  behavior intent request and sends it to a flipper environment for intent realization.
//  
var bmlCounter = 100;
function createBMLMessage(bmlMsg) {
  console.log("BML Say: "+util.inspect(bmlMsg));
  if (!bmlMsg.hasOwnProperty('characterId')) {
    bmlMsg.characterId = settings.defaultCharacterId;
  }
  var bmlId = bmlMsg.id + "_" + bmlCounter;
  bmlCounter++;
  var prefix = "<bml xmlns=\"http://www.bml-initiative.org/bml/bml-1.0\" characterId=\""+bmlMsg.characterId+"\" id=\"speechbml_"+bmlId+"\" xmlns:bmlt=\"http://hmi.ewi.utwente.nl/bmlt\"><speech id=\"speech0\" start=\"0\"><text>";
  var suffix = "</text></speech></bml>";

  var bml = prefix+bmlMsg.content+suffix;
  var res = {
    "bml": { "content": encodeURIComponent(bml) }
  };
  console.log("bml:\n"+bml+"\n\nmw: "+util.inspect(res));
  return JSON.stringify(res);
}
 
server.on('connection', function(socket) {
    sockets.push(socket);
    socket.on('message', function(msg) {
        var parsed = JSON.parse(msg);
        if (parsed.type == "bmlsay") {
          mw_client.publish(mw.wTopic, createBMLMessage(parsed), { 'suppress-content-length':true, 'content-type': 'text/plain'});
        } else if (parsed.type == "refresh") {
          var res = {
            type:"refresh",
			data: {}
			// Facial expressions
			// Postures
			// SelfToch
          }
          socket.send(JSON.stringify(res));
        } else if (parsed.type == "save_dialog") {
			fs.renameSync("./"+dialogsFolder+"/"+defaultDialogFile, "./"+dialogsFolder+"/"+defaultDialogFile+".backup_"+(new Date().getTime()));
			fs.writeFile("./"+dialogsFolder+"/"+defaultDialogFile, JSON.stringify(parsed.data), function(err) {
				if(err) {
				  broadcast({
					type:"res",
					data: 'e Dialog could not be saved ('+err+')'
				  });
				} else {
				  broadcast({
					type:"res",
					data: 'l Dialog saved.'
				  });
				}
			}); 
			
			var csvOut = "name|text";
			var blocks = parsed.data.blocks;
			for (var b = 0; b < blocks.length; b++) {
				for (var c = 0; c < blocks[b].columns.length; c++) {
					for (var u = 0; u < blocks[b].columns[c].utterances.length; u++) {
						var utterance = blocks[b].columns[c].utterances[u];
						csvOut = csvOut+"\n"+utterance.id+"|"+utterance.text;
					}
				}
			}
			fs.writeFile(generateFile, csvOut, function(err) {
				if(err) {
				  console.log("couldn't write generate.csv")
				}
			});
		} else if (parsed.type == "load_dialog") {
		  var res = {
            type:"dialog",
            dialog: JSON.parse(fs.readFileSync("./"+dialogsFolder+"/"+defaultDialogFile, 'utf8'))
          }
          socket.send(JSON.stringify(res));
		}
    });
	
    socket.on('close', function() {
        removeSocket(socket);
    });
});
