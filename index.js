var app = require('express')();
//var redis = require('redis');
var http = require('http').Server(app);
var sio = require('socket.io');
var io = sio(http);


// there MUST be a 'Lobby', it is where all incoming users are directed
var rooms = {'Lobby':{'users':[],'log':[]}, 'joj':{'users':[],'log':[]}, 'Yolander':{'users':[],'log':[]}, 'Snans':{'users':[],'log':[]}};

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});


function push_to_room(room, msg){
  rooms[room].log.push(msg);
  for(var i=0; i < rooms[room].users.length; i++){
    rooms[room].users[i].emit(msg.type, msg);
  }
}

function serve_rooms(usr){
  var room_names = [];
  for(var room in rooms){
    room_names.push(room);
  }
  usr.emit('update rooms', room_names);
}

io.on("connection", function(socket){   // arrival/departure announced in terminal
	console.log("connection");
	socket.on('disconnect', function(){
    	console.log('disconnection rip');
  	});
});



io.on('connection', function(socket){
  var username = 'user1';
  var current_room = 'Lobby';
  var socc = socket;

  serve_rooms(socc);

  socket.on('chat message', function(msg){
  	console.log(msg.name + " sent a message to " + msg.to);
    push_to_room(msg.to, msg);
  });

  socket.on('join room', function(name){  // for initial room join, should be first function called by new user
  	current_room = 'Lobby';
    username = name;

    // serve old messages
    for(var i=0; i < rooms[current_room].log.length; i++){
      //console.log(rooms[current_room].log[i].type);
      socc.emit(rooms[current_room].log[i].type, rooms[current_room].log[i]);
    }

    rooms['Lobby'].users.push(socc);
    console.log(username+" joined Lobby");

  	push_to_room(current_room, {to:current_room, type:'user event', val:username+" logged on"});

  	socket.on('disconnect', function(){
      rooms[current_room].users.splice(rooms[current_room].users.indexOf(socc), 1);
      push_to_room(current_room, {type:'user event', to:current_room, val:username+' left room'});
  	});
  });

  
  socket.on('switch room', function(new_room){
    old_room = current_room;
    
    // leave old room
    rooms[current_room].users.splice(rooms[current_room].users.indexOf(socc), 1);
    push_to_room(old_room, {to:old_room, type:'user event', val:username+" left room"});

    // join new room
    rooms[new_room].users.push(socc);
    current_room = new_room;

    // serve old messages
    for(var i=0; i<rooms[current_room].log.length; i++){
      socc.emit(rooms[current_room].log[i].type, rooms[current_room].log[i]);
    }

    push_to_room(new_room, {to:new_room, type:'user event', val:username+" joined room"});
  });

});

http.listen(3000, "0.0.0.0");
